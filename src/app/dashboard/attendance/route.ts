import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
const PH_TZ = "Asia/Manila";

const SHIFT_CUTOFFS: Record<string, string> = {
  prime: "08:00:00",
  midshift: "16:00:00",
  closing: "00:00:00",
};

function phTodayISO(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const day = searchParams.get("day") ?? phTodayISO();

  // Get all rows for that attendance_day
  const rows = await db.query(
    `
    SELECT attendance_day, shift, page_key, user_name, is_cover, ph_ts
    FROM attendance_clockins
    WHERE attendance_day = $1
    ORDER BY shift, page_key, is_cover, user_name;
    `,
    [day]
  );

  // Build a structured response
  type Clock = {
    users: { name: string; time: string }[];
    covers: { name: string; time: string }[];
    late: { name: string; time: string; isCover: boolean }[];
  };

  const data: Record<string, Record<string, Clock>> = {}; // shift -> page_key -> clocks

  for (const r of rows.rows) {
    const shift = r.shift as string;
    const pageKey = r.page_key as string;

    data[shift] ??= {};
    data[shift][pageKey] ??= { users: [], covers: [], late: [] };

    const timePH = new Date(r.ph_ts).toLocaleTimeString("en-US", {
      timeZone: PH_TZ,
      hour: "2-digit",
      minute: "2-digit",
    });

    const isCover = Boolean(r.is_cover);
    const name = String(r.user_name);

    if (isCover) data[shift][pageKey].covers.push({ name, time: timePH });
    else data[shift][pageKey].users.push({ name, time: timePH });

    // Late logic: compare ph_ts time-of-day to cutoff
    const cutoff = SHIFT_CUTOFFS[shift];
    if (cutoff) {
      // Make HH:MM:SS from PH
      const timeHHMMSS = new Intl.DateTimeFormat("en-GB", {
        timeZone: PH_TZ,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(r.ph_ts));

      if (timeHHMMSS > cutoff) {
        data[shift][pageKey].late.push({ name, time: timePH, isCover });
      }
    }
  }

  return NextResponse.json({ day, data });
}
