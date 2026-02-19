import { NextResponse } from "next/server";
import { Pool } from "pg";

const salesPool = new Pool({
  connectionString: process.env.SALES_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function tierFromPercentile(rank: number, total: number) {
  if (total <= 0) return 1;
  const p = (rank + 1) / total; // rank 0 = best
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
    const team = String(searchParams.get("team") || "").trim(); // optional

    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // ✅ Group by chatter (chat_id), ignore null, join teams for real name
    const sql = `
      SELECT
        s.chat_id,
        COALESCE(t.name, 'Chatter ' || s.chat_id::text) AS display_name,
        COALESCE(SUM(s.amount), 0) AS total_sales
      FROM sales s
      LEFT JOIN teams t ON t.chat_id = s.chat_id
      WHERE s.chat_id IS NOT NULL
        AND s.ts >= $1
        ${team ? "AND s.team = $2" : ""}
      GROUP BY s.chat_id, t.name
      ORDER BY total_sales DESC
    `;

    const params = team ? [from, team] : [from];
    const res = await salesPool.query(sql, params);

    const rows = res.rows || [];

    // ✅ daily average
    const withAvg = rows.map((r: any) => {
      const totalSales = Number(r.total_sales || 0);
      const dailyAvg = totalSales / days;

      return {
        chatterId: String(r.chat_id),
        displayName: String(r.display_name || "").trim(),
        username: "", // not available in your SALES DB schema
        totalSales: Math.round(totalSales * 100) / 100,
        dailyAvg: Math.round(dailyAvg * 100) / 100,
      };
    });

    // ✅ tier based on dailyAvg
    withAvg.sort((a, b) => b.dailyAvg - a.dailyAvg);

    const total = withAvg.length;
    const tiers = withAvg.map((r, i) => ({
      ...r,
      tier: tierFromPercentile(i, total),
    }));

    // median daily avg (optional info)
    const avgs = tiers.map((t) => t.dailyAvg).filter((n) => Number.isFinite(n));
    const median =
      avgs.length === 0 ? 0 : avgs.slice().sort((a, b) => a - b)[Math.floor(avgs.length / 2)];

    return NextResponse.json({
      ok: true,
      days,
      team: team || null,
      medianDailyAvg: median,
      tiers,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}