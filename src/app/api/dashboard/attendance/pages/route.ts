import { NextResponse } from "next/server";
import { attendanceDb } from "@/lib/db";
import { requireApprovedSession } from "@/lib/requireApproved";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const db = attendanceDb();

  // IMPORTANT: Update to match your attendance bot table.
  // Assumes: attendance_clockins(attendance_day, page_key, shift, is_cover, created_at)
  const res = await db.query(`
    WITH now_ph AS (SELECT (now() AT TIME ZONE 'Asia/Manila') AS t),
    att_day AS (
      SELECT CASE
        WHEN (SELECT t::time FROM now_ph) < time '06:00'
          THEN (SELECT t::date FROM now_ph) - 1
        ELSE (SELECT t::date FROM now_ph)
      END AS d
    )
    SELECT
      page_key,
      shift,
      COUNT(*) FILTER (WHERE is_cover = FALSE) AS clocked_in,
      COUNT(*) FILTER (WHERE is_cover = TRUE) AS covers,
      MAX(created_at) AS last_time
    FROM attendance_clockins
    WHERE attendance_day = (SELECT d FROM att_day)
    GROUP BY page_key, shift
    ORDER BY shift ASC, page_key ASC;
  `);

  const rows = res.rows.map((r: any) => ({
    pageKey: String(r.page_key),
    shift: String(r.shift),
    clockedIn: Number(r.clocked_in ?? 0),
    covers: Number(r.covers ?? 0),
    lastTime: r.last_time ?? null,
  }));

  return NextResponse.json({ rows });
}
