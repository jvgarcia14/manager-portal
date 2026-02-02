// src/app/api/dashboard/attendance/pages/route.ts
import { NextResponse } from "next/server";
import { attendanceDb } from "@/lib/db";
import { attendanceDayPH } from "@/lib/phTime";
import { ATTENDANCE_PAGES } from "@/lib/attendancePages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SHIFTS = new Set(["prime", "midshift", "closing"]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const shift = (searchParams.get("shift") || "prime").trim().toLowerCase();
  if (!SHIFTS.has(shift)) {
    return NextResponse.json({ error: "shift must be prime|midshift|closing" }, { status: 400 });
  }

  // optional: day=YYYY-MM-DD, default is bot logic (6AM PH reset)
  const day = (searchParams.get("day") || attendanceDayPH()).trim();

  const pool = attendanceDb();
  const client = await pool.connect();

  try {
    // get counts per page_key for this day+shift
    const res = await client.query(
      `
      SELECT
        page_key,
        SUM(CASE WHEN is_cover = FALSE THEN 1 ELSE 0 END) AS users_count,
        SUM(CASE WHEN is_cover = TRUE  THEN 1 ELSE 0 END) AS covers_count
      FROM attendance_clockins
      WHERE attendance_day = $1 AND shift = $2
      GROUP BY page_key
      `,
      [day, shift]
    );

    const map = new Map<string, { users: number; covers: number }>();
    for (const r of res.rows) {
      map.set(String(r.page_key), {
        users: Number(r.users_count || 0),
        covers: Number(r.covers_count || 0),
      });
    }

    // build full table like telegram: show ALL expected pages with ✅ or ❌
    const rows = ATTENDANCE_PAGES.map((p) => {
      const c = map.get(p.key) || { users: 0, covers: 0 };
      const missing = c.users === 0 && c.covers === 0;
      return {
        tag: `#${p.key}`,
        page: p.label,
        users: c.users,
        covers: c.covers,
        status: missing ? "❌" : "✅",
      };
    });

    const onShift = rows.reduce((acc, r) => acc + r.users, 0);
    const covers = rows.reduce((acc, r) => acc + r.covers, 0);

    return NextResponse.json({
      day,
      shift,
      onShift,
      covers,
      rows,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "attendance query failed", detail: String(e?.message || e) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
