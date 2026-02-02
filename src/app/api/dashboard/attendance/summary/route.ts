import { NextResponse } from "next/server";
import { attendanceDb } from "@/lib/db";
import { requireApprovedSession } from "@/lib/requireApproved";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  try {
    const db = attendanceDb();

    const res = await db.query(`
      WITH now_ph AS (
        SELECT (now() AT TIME ZONE 'Asia/Manila') AS t
      ),
      att_day AS (
        SELECT CASE
          WHEN (SELECT t::time FROM now_ph) < time '06:00'
            THEN (SELECT t::date FROM now_ph) - 1
          ELSE (SELECT t::date FROM now_ph)
        END AS d
      )
      SELECT
        (SELECT d FROM att_day) AS attendance_day,
        COUNT(*) FILTER (WHERE is_cover = FALSE) AS clocked_in,
        COUNT(*) FILTER (WHERE is_cover = TRUE)  AS covers
      FROM attendance_clockins
      WHERE attendance_day = (SELECT d FROM att_day);
    `);

    return NextResponse.json({
      attendanceDay: String(res.rows[0]?.attendance_day || ""),
      clockedIn: Number(res.rows[0]?.clocked_in || 0),
      covers: Number(res.rows[0]?.covers || 0),
    });
  } catch {
    return NextResponse.json({
      attendanceDay: "",
      clockedIn: 0,
      covers: 0,
      demo: true,
    });
  }
}
