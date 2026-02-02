import { NextResponse } from "next/server";
import { salesDb } from "@/lib/db";
import { requireApprovedSession } from "@/lib/requireApproved";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const team = searchParams.get("team");
  if (!team) return NextResponse.json({ error: "Missing team" }, { status: 400 });

  const db = salesDb();

  const last15Start = `
    (date_trunc('day', (now() AT TIME ZONE 'Asia/Manila') - interval '14 days') AT TIME ZONE 'Asia/Manila')
  `;

  const res = await db.query(
    `
    SELECT
      s.page,
      COALESCE(SUM(s.amount),0) AS total,
      COALESCE(pg.goal, 0) AS goal
    FROM sales s
    LEFT JOIN page_goals pg ON pg.page = s.page
    WHERE s.team = $1
      AND s.ts >= ${last15Start}
    GROUP BY s.page, pg.goal
    ORDER BY total DESC
    `,
    [team]
  );

  const pages = res.rows.map((r) => {
    const total = Number(r.total ?? 0);
    const goal = Number(r.goal ?? 0);
    const pct = goal > 0 ? (total / goal) * 100 : null;
    return { page: String(r.page), total, goal, pct };
  });

  return NextResponse.json({ team, pages });
}
