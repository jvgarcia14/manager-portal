// src/app/api/dashboard/attendance/pages/route.ts
import { NextResponse } from "next/server";
import { attendanceDb } from "@/lib/db";
import { requireApprovedSession } from "@/lib/requireApproved";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

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
      shift,
      page_key,
      COUNT(*) FILTER (WHERE is_cover = FALSE) AS clocked_in,
      COUNT(*) FILTER (WHERE is_cover = TRUE)  AS covers
    FROM attendance_clockins
    WHERE attendance_day = (SELECT d FROM att_day)
    GROUP BY shift, page_key
    ORDER BY shift, page_key;
  `);

  const rows = (res.rows || []).map((r: any) => ({
    shift: String(r.shift || ""),
    pageKey: String(r.page_key || ""),
    clockedIn: Number(r.clocked_in || 0),
    covers: Number(r.covers || 0),
  }));

  return NextResponse.json({ rows });
}
