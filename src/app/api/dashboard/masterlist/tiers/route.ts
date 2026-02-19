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
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // ✅ Group by chatter chat_id (this is the sender / chatter)
    // Join teams to show chatter name (teams.chat_id, teams.name)
    const res = await salesPool.query(
      `
      SELECT
        s.chat_id,
        COALESCE(t.name, 'Chatter ' || s.chat_id::text) AS display_name,
        COALESCE(SUM(s.amount), 0) AS total_sales
      FROM sales s
      LEFT JOIN teams t ON t.chat_id = s.chat_id
      WHERE s.chat_id IS NOT NULL
        AND s.ts >= $1
      GROUP BY s.chat_id, t.name
      ORDER BY total_sales DESC
      `,
      [from]
    );

    const rows = res.rows || [];

    // If still empty, return helpful stats (so we can see what's missing)
    if (rows.length === 0) {
      const stats = await salesPool.query(`
        SELECT
          COUNT(*)::int AS total_rows,
          SUM(CASE WHEN chat_id IS NULL THEN 1 ELSE 0 END)::int AS null_chat_id_rows,
          MIN(ts) AS min_ts,
          MAX(ts) AS max_ts
        FROM sales
      `);

      return NextResponse.json({
        ok: true,
        days,
        from: from.toISOString(),
        tiers: [],
        debug: stats.rows?.[0] || null,
        note:
          "No rows matched (chat_id not null + within date range). Check if sales.chat_id is being saved, or if ts timezone/range is wrong.",
      });
    }

    // daily average + tier based on daily average
    const withAvg = rows.map((r: any) => {
      const totalSales = Number(r.total_sales || 0);
      const dailyAvg = totalSales / days;

      return {
        chatterId: String(r.chat_id),
        displayName: String(r.display_name || "").trim(),
        username: "", // not stored in sales schema you showed
        totalSales: Math.round(totalSales * 100) / 100,
        dailyAvg: Math.round(dailyAvg * 100) / 100,
      };
    });

    // sort by daily average for tiering
    withAvg.sort((a, b) => b.dailyAvg - a.dailyAvg);

    const total = withAvg.length;
    const tiers = withAvg.map((r, i) => ({
      ...r,
      tier: tierFromPercentile(i, total),
    }));

    return NextResponse.json({
      ok: true,
      days,
      from: from.toISOString(),
      tiers,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}