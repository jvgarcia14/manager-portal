import { NextResponse } from "next/server";
import { Pool } from "pg";

const salesPool = new Pool({
  connectionString: process.env.SALES_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function tierFromPercentile(rank: number, total: number) {
  if (total <= 0) return 1;
  const p = (rank + 1) / total;
  if (p <= 0.1) return 5;
  if (p <= 0.3) return 4;
  if (p <= 0.6) return 3;
  if (p <= 0.85) return 2;
  return 1;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.max(1, Number(searchParams.get("days") || "30"));
    const teamFilter = String(searchParams.get("team") || "").trim();

    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // ✅ SALES grouped by PAGE
    const sql = `
      SELECT
        tp.team,
        t.name as chatter_name,
        SUM(s.amount) as total_sales
      FROM sales s
      LEFT JOIN team_pages tp ON tp.page = s.page
      LEFT JOIN teams t ON t.chat_id = tp.team
      WHERE s.ts >= $1
        ${teamFilter ? "AND tp.team = $2" : ""}
      GROUP BY tp.team, t.name
      ORDER BY total_sales DESC
    `;

    const params = teamFilter ? [from, teamFilter] : [from];

    const res = await salesPool.query(sql, params);
    const rows = res.rows || [];

    if (rows.length === 0) {
      return NextResponse.json({
        ok: true,
        days,
        team: teamFilter || null,
        tiers: [],
      });
    }

    const withAvg = rows.map((r: any) => {
      const totalSales = Number(r.total_sales || 0);
      const dailyAvg = totalSales / days;

      return {
        chatterId: String(r.team),
        displayName: r.chatter_name || `Team ${r.team}`,
        username: "",
        totalSales: Math.round(totalSales * 100) / 100,
        dailyAvg: Math.round(dailyAvg * 100) / 100,
      };
    });

    // Sort by daily avg
    withAvg.sort((a, b) => b.dailyAvg - a.dailyAvg);

    const total = withAvg.length;

    const tiers = withAvg.map((r, i) => ({
      ...r,
      tier: tierFromPercentile(i, total),
    }));

    return NextResponse.json({
      ok: true,
      days,
      team: teamFilter || null,
      tiers,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}