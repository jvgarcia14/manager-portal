import { NextResponse } from "next/server";
import { Pool } from "pg";
import { ensureWebsiteSchema, websitePool } from "@/lib/websiteDb";
import { EXPECTED_PAGE_LIST } from "@/lib/expectedPages";

// Attendance DB pool
const attendancePool = new Pool({
  connectionString: process.env.ATTENDANCE_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const SHIFTS = ["prime", "midshift", "closing"] as const;

function attendanceDayPH(now = new Date()) {
  const ph = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const hour = ph.getUTCHours();
  const date = new Date(Date.UTC(ph.getUTCFullYear(), ph.getUTCMonth(), ph.getUTCDate()));
  if (hour < 6) date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

async function getCols(table: string, pool: Pool) {
  const { rows } = await pool.query(
    `select column_name from information_schema.columns where table_name = $1`,
    [table]
  );
  return new Set(rows.map((r: any) => r.column_name));
}

function pick(cols: Set<string>, candidates: string[]) {
  for (const c of candidates) if (cols.has(c)) return c;
  return null;
}

function normalizeUsername(u: any) {
  const s = String(u || "").trim();
  if (!s) return "";
  return s.startsWith("@") ? s.slice(1) : s;
}

export async function GET() {
  const day = attendanceDayPH();

  // Always return pages list even if attendance DB fails
  const basePages = EXPECTED_PAGE_LIST.map((p) => ({
    pageKey: p.pageKey,
    pageLabel: p.pageLabel,
    prime: null,
    midshift: null,
    closing: null,
  }));

  try {
    await ensureWebsiteSchema();

    // 1) Load saved slots from WEBSITE DB (fallback when no one clocked in)
    const savedRes = await websitePool.query(
      `select page_key, shift, main_tg_username, main_display_name from masterlist_slots`
    );
    const savedMap = new Map<string, { displayName: string; username: string }>();
    for (const r of savedRes.rows) {
      savedMap.set(`${r.page_key}:${r.shift}`, {
        displayName: String(r.main_display_name || "").trim(),
        username: normalizeUsername(r.main_tg_username),
      });
    }

    // 2) Attendance table column detection
    const cols = await getCols("attendance_clockins", attendancePool);

    const colShift = pick(cols, ["shift"]);
    const colPage = pick(cols, ["page_key", "pagekey", "page"]);
    const colCover = pick(cols, ["is_cover", "cover"]);
    const colDay = pick(cols, ["attendance_day", "day"]);

    // Telegram identity cols (use whatever exists)
    const colFirst = pick(cols, ["tg_first_name", "first_name", "telegram_first_name"]);
    const colLast = pick(cols, ["tg_last_name", "last_name", "telegram_last_name"]);
    const colUser = pick(cols, ["tg_username", "username", "telegram_username", "user_name"]);
    const colName = pick(cols, ["display_name", "tg_name", "name"]);

    // Timestamp/order column (THIS FIXES YOUR created_at error)
    const colTime = pick(cols, [
      "created_at",
      "clocked_in_at",
      "clockin_at",
      "clock_in_at",
      "timestamp",
      "ts",
      "time",
      "inserted_at",
      "id", // fallback: order by id if no timestamp exists
    ]);

    if (!colShift || !colPage || !colCover || !colDay) {
      return NextResponse.json({
        ok: false,
        error:
          "attendance_clockins is missing required columns (shift/page_key/is_cover/attendance_day). Paste table columns list.",
        attendance_day: day,
        pages: basePages,
      });
    }

    const selectParts = [
      `${colShift} as shift`,
      `${colPage} as page_key`,
      `${colCover} as is_cover`,
      colFirst ? `${colFirst} as first_name` : `null as first_name`,
      colLast ? `${colLast} as last_name` : `null as last_name`,
      colUser ? `${colUser} as tg_username` : `null as tg_username`,
      colName ? `${colName} as display_name` : `null as display_name`,
    ];

    const orderBy = colTime ? `order by ${colTime} asc` : "";

    const clockinsRes = await attendancePool.query(
      `
      select ${selectParts.join(", ")}
      from attendance_clockins
      where ${colDay} = $1
      ${orderBy}
      `,
      [day]
    );

    // Live map: choose 1 person per (page_key, shift) preferring MAIN over COVER
    type Slot = { displayName: string; username: string; isCover: boolean; source: "attendance" | "saved" };
    const liveMap = new Map<string, Slot>();

    for (const r of clockinsRes.rows) {
      const key = `${String(r.page_key)}:${String(r.shift)}`;
      const isCover = !!r.is_cover;

      const displayFromParts = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
      const username = normalizeUsername(r.tg_username);

      const displayName =
        String(r.display_name || "").trim() ||
        displayFromParts ||
        (username ? `@${username}` : "Unknown");

      const candidate: Slot = {
        displayName,
        username: username ? `@${username}` : "",
        isCover,
        source: "attendance",
      };

      // prefer MAIN
      if (!liveMap.has(key)) {
        liveMap.set(key, candidate);
      } else {
        const existing = liveMap.get(key)!;
        if (existing.isCover && !candidate.isCover) {
          liveMap.set(key, candidate);
        }
      }
    }

    // Merge into basePages
    const pages = basePages.map((p) => {
      const pageKey = p.pageKey;

      const pickSlot = (shift: "prime" | "midshift" | "closing"): Slot | null => {
        const live = liveMap.get(`${pageKey}:${shift}`);
        if (live) return live;

        const saved = savedMap.get(`${pageKey}:${shift}`);
        if (saved && (saved.displayName || saved.username)) {
          return {
            displayName: saved.displayName || (saved.username ? `@${saved.username}` : "—"),
            username: saved.username ? `@${saved.username}` : "",
            isCover: false,
            source: "saved",
          };
        }
        return null;
      };

      return {
        ...p,
        prime: pickSlot("prime"),
        midshift: pickSlot("midshift"),
        closing: pickSlot("closing"),
      };
    });

    return NextResponse.json({ ok: true, attendance_day: day, pages });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e), attendance_day: day, pages: basePages },
      { status: 500 }
    );
  }
}