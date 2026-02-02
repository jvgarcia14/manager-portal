import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs"; // IMPORTANT for pg

const PH_TZ = "Asia/Manila";

function getShiftStartPH(now = new Date()) {
  // Convert to PH "components" safely using Intl
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  const y = Number(get("year"));
  const m = Number(get("month"));
  const d = Number(get("day"));
  const hour = Number(get("hour"));

  // shift blocks: 8-16, 16-24, 0-8 in PH
  let shiftHour = 0;
  if (hour >= 8 && hour < 16) shiftHour = 8;
  else if (hour >= 16 && hour < 24) shiftHour = 16;
  else shiftHour = 0;

  // Build a Date representing that PH local time.
  // We’ll pass it into SQL as timestamptz by converting via AT TIME ZONE in query.
  return { y, m, d, shiftHour };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const team = searchParams.get("team");
  if (!team) return NextResponse.json({ error: "Missing team" }, { status: 400 });

  const now = new Date();
  const { y, m, d, shiftHour } = getShiftStartPH(now);

  // compute windows
  const days15 = 15;
  const days30 = 30;

  // 1) Shift totals by page
  // We compute shiftStart as PH local timestamp then convert to timestamptz in SQL.
  const shiftStartSql = `
    (make_timestamp($2,$3,$4,$5,0,0) AT TIME ZONE '${PH_TZ}')
  `;

  const shiftByPage = await db.query(
    `
    SELECT page, COALESCE(SUM(amount),0)::float AS total
    FROM sales
    WHERE team=$1
      AND ts >= ${shiftStartSql}
    GROUP BY page
    ORDER BY total DESC;
    `,
    [team, y, m, d, shiftHour]
  );

  const shiftTotal = shiftByPage.rows.reduce((a, r) => a + Number(r.total), 0);

  // 2) 15/30 day totals by page
  const totals15 = await db.query(
    `
    SELECT page, COALESCE(SUM(amount),0)::float AS total
    FROM sales
    WHERE team=$1
      AND ts >= (now() - ($2 || ' days')::interval)
    GROUP BY page
    ORDER BY total DESC;
    `,
    [team, days15]
  );

  const totals30 = await db.query(
    `
    SELECT page, COALESCE(SUM(amount),0)::float AS total
    FROM sales
    WHERE team=$1
      AND ts >= (now() - ($2 || ' days')::interval)
    GROUP BY page
    ORDER BY total DESC;
    `,
    [team, days30]
  );

  // 3) Daily time series (last 30 days)
  const daily = await db.query(
    `
    SELECT
      (date_trunc('day', ts AT TIME ZONE '${PH_TZ}'))::date AS day,
      COALESCE(SUM(amount),0)::float AS total
    FROM sales
    WHERE team=$1
      AND ts >= (now() - '30 days'::interval)
    GROUP BY day
    ORDER BY day ASC;
    `,
    [team]
  );

  // 4) Goals (optional)
  const shiftGoals = await db.query(`SELECT page, goal::float AS goal FROM shift_goals;`);
  const pageGoals = await db.query(`SELECT page, goal::float AS goal FROM page_goals;`);

  const goalsShiftMap = Object.fromEntries(shiftGoals.rows.map(r => [r.page, r.goal]));
  const goalsPageMap = Object.fromEntries(pageGoals.rows.map(r => [r.page, r.goal]));

  return NextResponse.json({
    team,
    shift: {
      phDate: `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`,
      startHour: shiftHour,
      total: shiftTotal,
      byPage: shiftByPage.rows,
      goals: goalsShiftMap,
    },
    days15: { byPage: totals15.rows, goals: goalsPageMap },
    days30: { byPage: totals30.rows, goals: goalsPageMap },
    daily: daily.rows,
  });
}
