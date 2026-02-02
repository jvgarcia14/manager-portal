import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.SALES_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function clampDays(v: string | null) {
  const n = Number(v ?? 15);
  return n === 30 ? 30 : 15;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const team = (searchParams.get("team") || "Black").trim();
    const days = clampDays(searchParams.get("days"));

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // sales totals by page
    const salesRes = await pool.query(
      `
      SELECT page, COALESCE(SUM(amount), 0) AS sales
      FROM sales
      WHERE team = $1 AND ts >= $2
      GROUP BY page
      ORDER BY sales DESC;
      `,
      [team, cutoff]
    );

    // goals (your newer API schema: page_goals has team,page,goal)
    const goalsRes = await pool.query(
      `
      SELECT page, COALESCE(goal, 0) AS goal
      FROM page_goals
      WHERE team = $1;
      `,
      [team]
    );

    const goalMap = new Map<string, number>();
    for (const r of goalsRes.rows) goalMap.set(String(r.page), Number(r.goal || 0));

    const rows = salesRes.rows.map((r: any) => {
      const page = String(r.page);
      const sales = Number(r.sales || 0);
      const goal = Number(goalMap.get(page) || 0);
      const pct = goal > 0 ? Math.round((sales / goal) * 1000) / 10 : null;
      return { page, sales: Math.round(sales * 100) / 100, goal: Math.round(goal * 100) / 100, pct };
    });

    const total_sales = rows.reduce((a, r) => a + r.sales, 0);
    const total_goal = rows.reduce((a, r) => a + r.goal, 0);
    const overall_pct = total_goal > 0 ? Math.round((total_sales / total_goal) * 1000) / 10 : null;

    return NextResponse.json({
      team,
      days,
      total_sales: Math.round(total_sales * 100) / 100,
      total_goal: Math.round(total_goal * 100) / 100,
      overall_pct,
      rows,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
