import { NextResponse } from "next/server";
import { salesDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Returns a Date that represents PH start-of-day (00:00 Asia/Manila)
 * as a UTC instant (so it matches your ts column if ts is stored in UTC).
 */
function phStartOfDayUtc(d: Date) {
  const now = new Date();
  const phNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));

  const ph = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  ph.setHours(0, 0, 0, 0);

  // Convert PH start to UTC instant by removing the PH offset at that moment.
  // (same approach you used)
  return new Date(ph.getTime() - (phNow.getTime() - now.getTime()));
}

/**
 * Start of PH week (Mon 00:00) as UTC instant
 */
function phStartOfWeekUtc(d: Date) {
  const ph = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  ph.setHours(0, 0, 0, 0);

  // getDay(): Sun=0..Sat=6, we want Monday start
  const day = ph.getDay();
  const diff = (day + 6) % 7; // Mon=0, Tue=1, ... Sun=6
  ph.setDate(ph.getDate() - diff);

  const now = new Date();
  const phNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  return new Date(ph.getTime() - (phNow.getTime() - now.getTime()));
}

/**
 * Start of PH month (1st 00:00) as UTC instant
 */
function phStartOfMonthUtc(d: Date) {
  const ph = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  ph.setDate(1);
  ph.setHours(0, 0, 0, 0);

  const now = new Date();
  const phNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  return new Date(ph.getTime() - (phNow.getTime() - now.getTime()));
}

/**
 * Start of PH year (Jan 1 00:00) as UTC instant
 */
function phStartOfYearUtc(d: Date) {
  const ph = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  ph.setMonth(0, 1);
  ph.setHours(0, 0, 0, 0);

  const now = new Date();
  const phNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  return new Date(ph.getTime() - (phNow.getTime() - now.getTime()));
}

/**
 * End of PH day (23:59:59.999) as UTC instant
 */
function phEndOfDayUtcFromYmd(ymd: string) {
  // ymd is YYYY-MM-DD in PH
  // create a date in PH by building a string and converting with timezone trick
  const now = new Date();
  const phNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));

  const ph = new Date(`${ymd}T00:00:00`);
  // interpret above in local env, so convert to PH “wall time” first:
  const phWall = new Date(ph.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  phWall.setHours(23, 59, 59, 999);

  return new Date(phWall.getTime() - (phNow.getTime() - now.getTime()));
}

function phStartOfDayUtcFromYmd(ymd: string) {
  const now = new Date();
  const phNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));

  const ph = new Date(`${ymd}T00:00:00`);
  const phWall = new Date(ph.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  phWall.setHours(0, 0, 0, 0);

  return new Date(phWall.getTime() - (phNow.getTime() - now.getTime()));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const team = (searchParams.get("team") || "").trim();

  // NEW:
  const range = (searchParams.get("range") || "").trim().toLowerCase();
  const start = (searchParams.get("start") || "").trim(); // YYYY-MM-DD (PH)
  const end = (searchParams.get("end") || "").trim();     // YYYY-MM-DD (PH)

  // OLD (back compat):
  const daysParam = searchParams.get("days");
  const days = Number(daysParam || "15");

  if (!team) return NextResponse.json({ error: "team is required" }, { status: 400 });

  // Determine [from, to] window
  const now = new Date();
  let from: Date;
  let to: Date;

  // If custom range provided, use it (PH dates)
  if (start && end) {
    // very light validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return NextResponse.json({ error: "start/end must be YYYY-MM-DD" }, { status: 400 });
    }

    from = phStartOfDayUtcFromYmd(start);
    to = phEndOfDayUtcFromYmd(end);
  } else if (range) {
    // range mode
    to = now;
    if (range === "daily") from = phStartOfDayUtc(now);
    else if (range === "weekly") from = phStartOfWeekUtc(now);
    else if (range === "monthly") from = phStartOfMonthUtc(now);
    else if (range === "yearly") from = phStartOfYearUtc(now);
    else {
      return NextResponse.json(
        { error: "range must be daily, weekly, monthly, yearly (or use start/end)" },
        { status: 400 }
      );
    }
  } else {
    // fallback to old days param (15/30)
    if (![15, 30].includes(days)) {
      return NextResponse.json({ error: "days must be 15 or 30 (or use range/start/end)" }, { status: 400 });
    }
    to = now;
    from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  // PH "today" start (00:00 PH) converted to UTC Date
  const phTodayStartUtc = phStartOfDayUtc(now);

  const pool = salesDb();
  const client = await pool.connect();

  try {
    // rows (by page) within window
    const salesRes = await client.query(
      `
      SELECT page, COALESCE(SUM(amount), 0) AS total
      FROM sales
      WHERE team = $1 AND ts >= $2 AND ts <= $3
      GROUP BY page
      ORDER BY total DESC
      `,
      [team, from, to]
    );

    // total within window
    const totalRes = await client.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM sales
      WHERE team = $1 AND ts >= $2 AND ts <= $3
      `,
      [team, from, to]
    );

    // today total (PH day)
    const todayRes = await client.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM sales
      WHERE team = $1 AND ts >= $2
      `,
      [team, phTodayStartUtc]
    );

    // goals (unchanged)
    const goalsRes = await client.query(
      `
      SELECT page, goal
      FROM page_goals
      WHERE team = $1
      `,
      [team]
    );

    const totals = new Map<string, number>();
    for (const r of salesRes.rows) totals.set(String(r.page), Number(r.total || 0));

    const goals = new Map<string, number>();
    for (const r of goalsRes.rows) goals.set(String(r.page), Number(r.goal || 0));

    const allPages = new Set<string>([...totals.keys(), ...goals.keys()]);

    const rows = [...allPages].map((page) => {
      const total = Number(totals.get(page) ?? 0);
      const goal = Number(goals.get(page) ?? 0);
      return {
        page,
        total: Math.round(total * 100) / 100,
        goal: Math.round(goal * 100) / 100,
      };
    });

    rows.sort((a, b) => b.total - a.total);

    const totalSales = Number(totalRes.rows?.[0]?.total || 0);
    const todaySales = Number(todayRes.rows?.[0]?.total || 0);

    return NextResponse.json({
      team,
      // keep these for debugging/UX (safe)
      from: from.toISOString(),
      to: to.toISOString(),
      todaySales: Math.round(todaySales * 100) / 100,
      totalSales: Math.round(totalSales * 100) / 100,
      rows,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "sales query failed", detail: String(e?.message || e) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
