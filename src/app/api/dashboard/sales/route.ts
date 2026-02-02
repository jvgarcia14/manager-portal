import { NextResponse } from "next/server";
import { requireApprovedSession } from "@/lib/requireApproved";
import { db } from "@/lib/db";

export const runtime = "nodejs";
const PH_TZ = "Asia/Manila";

function getShiftStartPHParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const y = Number(get("year"));
  const m = Number(get("month"));
  const d = Number(get("day"));
  const hour = Number(get("hour"));

  let shiftHour = 0;
  if (hour >= 8 && hour < 16) shiftHour = 8;
  else if (hour >= 16 && hour < 24) shiftHour = 16;
  else shiftHour = 0;

  return { y, m, d, shiftHour };
}

export async function GET(req: Request) {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const team = searchParams.get("team");
  if (!team) return NextResponse.json({ error: "Missing team" }, { status: 400 });

  const { y, m, d, shiftHour } = getShiftStartPHParts(new Date());

  // shift start in PH -> convert to timestamptz in SQL
  const shiftStartSql = `(make_timestamp($2,$3,$4,$5,0,0) AT TIME ZONE '${PH_TZ}')`;

  // totals by page for current shift
  const shiftByPage = await db.query(
    `
    SELECT page, COALESCE(SUM(amount),0)::float AS total
    FROM sales
    WHERE team=$1 AND ts >= ${shiftStartSql}
    GROUP BY page
    ORDER BY total DESC;
    `,
    [team, y, m, d, shiftHour]
  );

  const shiftTotal = shiftByPage.rows.reduce((a: number, r: any) => a + Number(r.total), 0);

  // goals (your sales bot stores them globally)
  const shiftGoals = await db.query(`SELECT page, goal::float AS goal FROM shift_goals;`);
  const pageGoals = await db.query(`SELECT page, goal::float AS goal FROM page_goals;`);

  const goalsShiftMap = Object.fromEntries(shiftGoals.rows.map((r: any) => [r.page, r.goal]));
  const goalsPageMap = Object.fromEntries(pageGoals.rows.map((r: any) => [r.page, r.goal]));

  // red pages count (<31% of shift goal)
  let redPages = 0;
  for (const r of shiftByPage.rows) {
    const goal = Number(goalsShiftMap[r.page] ?? 0);
    if (goal <= 0) continue;
    const pct = (Number(r.total) / goal) * 100;
    if (pct < 31) redPages += 1;
  }

  return NextResponse.json({
    team,
    shift: {
      phDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      startHour: shiftHour,
      total: shiftTotal,
      byPage: shiftByPage.rows,
      goals: goalsShiftMap,
      redPages,
    },
    pageGoals: goalsPageMap,
  });
}
