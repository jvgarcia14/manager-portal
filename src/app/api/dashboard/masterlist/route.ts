import { NextResponse } from "next/server";
import { Pool } from "pg";
import { ensureWebsiteSchema, websitePool } from "@/lib/websiteDb";
import { EXPECTED_PAGE_LIST } from "@/lib/expectedPages";

// Attendance DB pool (same as your attendance/today route)
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

async function getClockinColumns() {
  // Detect which columns exist so we can safely pull Telegram display name + username
  const { rows } = await attendancePool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'attendance_clockins'
    `
  );
  const cols = new Set(rows.map((r: any) => r.column_name));
  return cols;
}

function bestField(cols: Set<string>, candidates: string[]) {
  for (const c of candidates) if (cols.has(c)) return c;
  return null;
}

function normalizeUsername(u: any) {
  const s = String(u || "").trim();
  if (!s) return "";
  return s.startsWith("@") ? s.slice(1) : s;
}

export async function GET() {
  try {
    await ensureWebsiteSchema();

    const day = attendanceDayPH();

    // 1) Saved main slots (website DB)
    const saved = await websitePool.query(
      `select page_key, shift, main_tg_username, main_display_name
       from masterlist_slots`
    );
    const savedMap = new Map<string, { displayName: string; username: string }>();
    for (const r of saved.rows) {
      savedMap.set(`${r.page_key}:${r.shift}`, {
        displayName: String(r.main_display_name || "").trim(),
        username: normalizeUsername(r.main_tg_username),
      });
    }

    // 2) Attendance DB: get clockins (detailed)
    const cols = await getClockinColumns();

    // Try common column names (we auto-detect)
    const colFirst = bestField(cols, ["tg_first_name", "first_name", "telegram_first_name"]);
    const colLast = bestField(cols, ["tg_last_name", "last_name", "telegram_last_name"]);
    const colUser = bestField(cols, ["tg_username", "username", "telegram_username", "user_name"]);
    const colName = bestField(cols, ["display_name", "tg_name", "name"]);

    // Build SELECT safely
    const selectParts = [
      "shift",
      "page_key",
      "is_cover",
      "created_at",
      colFirst ? `${colFirst} as first_name` : "null as first_name",
      colLast ? `${colLast} as last_name` : "null as last_name",
      colUser ? `${colUser} as tg_username` : "null as tg_username",
      colName ? `${colName} as display_name` : "null as display_name",
    ];

    const clockinsRes = await attendancePool.query(
      `
      SELECT ${selectParts.join(", ")}
      FROM attendance_clockins
      WHERE attendance_day = $1
      ORDER BY created_at ASC
      `,
      [day]
    );

    // Pick 1 chatter per page+shift (prefer MAIN over COVER, but still show #cover if only cover exists)
    type Slot = { displayName: string; username: string; isCover: boolean };
    const liveMap = new Map<string, Slot>();

    for (const r of clockinsRes.rows) {
      const key = `${String(r.page_key)}:${String(r.shift)}`;
      const isCover = !!r.is_cover;

      const displayNameFromParts = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
      const displayName =
        String(r.display_name || "").trim() ||
        displayNameFromParts ||
        (r.tg_username ? `@${String(r.tg_username).replace(/^@/, "")}` : "Unknown");

      const username = r.tg_username ? normalizeUsername(r.tg_username) : "";

      // Prefer a non-cover if we have both
      if (!liveMap.has(key)) {
        liveMap.set(key, { displayName, username, isCover });
      } else {
        const existing = liveMap.get(key)!;
        if (existing.isCover && !isCover) {
          liveMap.set(key, { displayName, username, isCover });
        }
      }
    }

    // 3) Build response per expected page
    const pages = EXPECTED_PAGE_LIST.map((p) => {
      const page_key = p.pageKey;
      const page_label = p.pageLabel;

      const buildShift = (shift: typeof SHIFTS[number]) => {
        const live = liveMap.get(`${page_key}:${shift}`);
        if (live) {
          return {
            displayName: live.displayName,
            username: live.username ? `@${live.username}` : "",
            isCover: live.isCover,
            source: "attendance" as const,
          };
        }

        const saved = savedMap.get(`${page_key}:${shift}`);
        if (saved && (saved.displayName || saved.username)) {
          return {
            displayName: saved.displayName || (saved.username ? `@${saved.username}` : "—"),
            username: saved.username ? `@${saved.username}` : "",
            isCover: false,
            source: "saved" as const,
          };
        }

        return null;
      };

      return {
        pageKey: page_key,
        pageLabel: page_label,
        prime: buildShift("prime"),
        midshift: buildShift("midshift"),
        closing: buildShift("closing"),
      };
    });

    return NextResponse.json({ ok: true, attendance_day: day, pages });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}