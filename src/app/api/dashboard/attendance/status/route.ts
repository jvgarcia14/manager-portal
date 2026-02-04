import { NextResponse } from "next/server";
import { attendanceDb } from "@/lib/db";
import { EXPECTED_PAGES, normalizeTag } from "@/lib/expectedPages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Attendance day starts 6:00 AM PH
function phAttendanceDayStartUtc() {
  const now = new Date();
  const phNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));

  // Determine attendance day (if before 6am PH, use yesterday)
  const resetHour = 6;
  const phDay = new Date(phNow);
  if (phNow.getHours() < resetHour) phDay.setDate(phDay.getDate() - 1);

  phDay.setHours(resetHour, 0, 0, 0);

  // Convert PH wall-time to UTC instant
  return new Date(phDay.getTime() - (phNow.getTime() - now.getTime()));
}

type Shift = "prime" | "midshift" | "closing" | "all";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shiftParam = (searchParams.get("shift") || "all").toLowerCase() as Shift;

  const allowed: Shift[] = ["prime", "midshift", "closing", "all"];
  if (!allowed.includes(shiftParam)) {
    return NextResponse.json({ error: "shift must be prime, midshift, closing, or all" }, { status: 400 });
  }

  const dayStartUtc = phAttendanceDayStartUtc();

  const pool = attendanceDb();
  const client = await pool.connect();

  try {
    // ✅ IMPORTANT:
    // This query assumes your table is attendance_clockins (from your bot)
    // Columns: attendance_day, shift, page_key, user_name, is_cover, ph_ts
    //
    // If your website DB uses a different table, tell me the table name and I’ll adjust.
    const res = await client.query(
      `
      SELECT
        LOWER(page_key) as page_key,
        shift,
        SUM(CASE WHEN is_cover = false THEN 1 ELSE 0 END) as clocked,
        SUM(CASE WHEN is_cover = true THEN 1 ELSE 0 END) as covers
      FROM attendance_clockins
      WHERE ph_ts >= $1
      GROUP BY LOWER(page_key), shift
      `,
      [dayStartUtc]
    );

    // Build clocked map by shift
    const clockedByShift = {
      prime: new Map<string, { clocked: number; covers: number }>(),
      midshift: new Map<string, { clocked: number; covers: number }>(),
      closing: new Map<string, { clocked: number; covers: number }>(),
    } as const;

    for (const r of res.rows) {
      const key = normalizeTag(String(r.page_key || ""));
      const sh = String(r.shift || "").toLowerCase() as Shift;
      if (sh !== "prime" && sh !== "midshift" && sh !== "closing") continue;

      clockedByShift[sh].set(key, {
        clocked: Number(r.clocked || 0),
        covers: Number(r.covers || 0),
      });
    }

    const expectedKeys = Object.keys(EXPECTED_PAGES);

    // Helper to compute one shift
    function computeForShift(sh: Exclude<Shift, "all">) {
      const m = clockedByShift[sh];
      const rows = expectedKeys.map((key) => {
        const label = EXPECTED_PAGES[key];
        const v = m.get(key);
        const clocked = v?.clocked ?? 0;
        const covers = v?.covers ?? 0;
        const missing = clocked === 0 && covers === 0;

        return {
          pageKey: key,
          pageLabel: label,
          shift: sh,
          clocked,
          covers,
          status: missing ? "missing" : "clocked",
        };
      });

      const clockedCount = rows.filter((x) => x.status === "clocked").length;
      const missingCount = rows.filter((x) => x.status === "missing").length;

      return {
        expectedCount: rows.length,
        clockedCount,
        missingCount,
        rows,
      };
    }

    if (shiftParam === "all") {
      // Combine across shifts: if clocked in ANY shift, not missing
      const combined = expectedKeys.map((key) => {
        const label = EXPECTED_PAGES[key];

        const p = clockedByShift.prime.get(key);
        const m = clockedByShift.midshift.get(key);
        const c = clockedByShift.closing.get(key);

        const clocked = (p?.clocked ?? 0) + (m?.clocked ?? 0) + (c?.clocked ?? 0);
        const covers = (p?.covers ?? 0) + (m?.covers ?? 0) + (c?.covers ?? 0);

        const missing = clocked === 0 && covers === 0;

        return {
          pageKey: key,
          pageLabel: label,
          shift: "all",
          clocked,
          covers,
          status: missing ? "missing" : "clocked",
        };
      });

      const clockedCount = combined.filter((x) => x.status === "clocked").length;
      const missingCount = combined.filter((x) => x.status === "missing").length;

      return NextResponse.json({
        shift: "all",
        attendanceDayStartUtc: dayStartUtc.toISOString(),
        expectedCount: combined.length,
        clockedCount,
        missingCount,
        missingPages: combined.filter((x) => x.status === "missing"),
        rows: combined,
      });
    }

    const computed = computeForShift(shiftParam);

    return NextResponse.json({
      shift: shiftParam,
      attendanceDayStartUtc: dayStartUtc.toISOString(),
      expectedCount: computed.expectedCount,
      clockedCount: computed.clockedCount,
      missingCount: computed.missingCount,
      missingPages: computed.rows.filter((x) => x.status === "missing"),
      rows: computed.rows,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "attendance status query failed", detail: String(e?.message || e) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
