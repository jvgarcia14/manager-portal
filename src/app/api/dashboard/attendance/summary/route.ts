import { NextResponse } from "next/server";
import { attendanceDb } from "@/lib/db";
import { requireApprovedSession } from "@/lib/requireApproved";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error, status: auth.status }, { status: 401 });

  try {
    const db = attendanceDb();

    // Adjust table/columns if needed (this assumes attendance_clockins exists)
    const res = await db.query(`
      WITH now_ph AS (SELECT (NOW() AT TIME ZONE 'Asia/Manila') AS t),
      att_day AS (
        SELECT CASE
          WHEN (SELECT t::time FROM now_ph) < time '06:00'
            THEN (SELECT t::date FROM now_ph) - 1
          ELSE (SELECT t::date FROM now_ph)
        END AS d
      )
      SELECT
        (SELECT d FROM att_day) as attendance_day,
        COUNT(*) FILTER (WHERE is_cover = FALSE) as clocked_in,
        COUNT(*) FILTER (WHERE is_cover = TRUE) as covers
      FROM attendance_clockins
      WHERE attendance_day = (SELECT d FROM att_day);
    `);

    const row = res.rows[0] || {};
    return NextResponse.json({
      attendanceDay: row.attendance_day,
      clockedIn: Number(row.clocked_in || 0),
      covers: Number(row.covers || 0),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "attendance summary failed" }, { status: 500 });
  }
}
