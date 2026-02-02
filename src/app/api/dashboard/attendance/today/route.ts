import { NextResponse } from "next/server";
import { Pool } from "pg";

// IMPORTANT: attendance DB
const pool = new Pool({
  connectionString: process.env.ATTENDANCE_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// MUST match your attendance bot keys
const EXPECTED_PAGES: Record<string, string> = {
  alannafreeoftv: "Alanna Free / OFTV",
  alannapaid: "Alanna Paid",
  // ... add the rest exactly like your bot (keys are normalized)
  dandpaid: "Dan D Paid",
  livv: "Livv",
};

const SHIFTS = ["prime", "midshift", "closing"] as const;

function attendanceDayPH(now = new Date()) {
  // Attendance day starts 6AM PH.
  // We compute "PH time" by offsetting; better is timezone lib, but this works on server reliably if UTC.
  const ph = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const hour = ph.getUTCHours(); // because we shifted
  const date = new Date(Date.UTC(ph.getUTCFullYear(), ph.getUTCMonth(), ph.getUTCDate()));

  if (hour < 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  // return YYYY-MM-DD
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const day = attendanceDayPH();

    const res = await pool.query(
      `
      SELECT shift, page_key,
        SUM(CASE WHEN is_cover = FALSE THEN 1 ELSE 0 END)::int AS clocked,
        SUM(CASE WHEN is_cover = TRUE  THEN 1 ELSE 0 END)::int AS covers
      FROM attendance_clockins
      WHERE attendance_day = $1
      GROUP BY shift, page_key;
      `,
      [day]
    );

    // map existing counts
    const map = new Map<string, { clocked: number; covers: number }>();
    for (const r of res.rows) {
      map.set(`${r.shift}:${r.page_key}`, { clocked: Number(r.clocked || 0), covers: Number(r.covers || 0) });
    }

    // build FULL table: all pages x shifts
    const rows: Array<{ shift: string; pageKey: string; page: string; clocked: number; covers: number; status: "✅" | "❌" }> = [];

    for (const shift of SHIFTS) {
      for (const [pageKey, page] of Object.entries(EXPECTED_PAGES)) {
        const v = map.get(`${shift}:${pageKey}`) || { clocked: 0, covers: 0 };
        const missing = v.clocked === 0 && v.covers === 0;
        rows.push({ shift, pageKey, page, clocked: v.clocked, covers: v.covers, status: missing ? "❌" : "✅" });
      }
    }

    const totalClocked = rows.reduce((a, r) => a + r.clocked, 0);
    const totalCovers = rows.reduce((a, r) => a + r.covers, 0);

    return NextResponse.json({
      attendance_day: day,
      totals: { clocked: totalClocked, covers: totalCovers },
      rows,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
