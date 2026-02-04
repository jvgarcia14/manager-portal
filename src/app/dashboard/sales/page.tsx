import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.SALES_DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const team = (searchParams.get("team") || "").trim();
    const days = Number(searchParams.get("days") || "15");

    if (!team) {
      return NextResponse.json({ error: "Missing team" }, { status: 400 });
    }

    // === Customize these to match your DB schema ===
    // Assume a table like: sales(team, page, amount, created_at)
    // created_at is timestamp
    const fromDateExpr = `NOW() - INTERVAL '${days} days'`;

    // 1) Sales grouped by page (last X days)
    const rowsRes = await pool.query(
      `
      SELECT 
        page as page,
        COALESCE(SUM(amount), 0) as total
      FROM sales
      WHERE team = $1
        AND created_at >= ${fromDateExpr}
      GROUP BY page
      ORDER BY total DESC
      `,
      [team]
    );

    const rows = rowsRes.rows.map((r: any) => ({
      page: String(r.page),
      total: Number(r.total || 0),
      goal: 0, // you can wire goals later
    }));

    // 2) Today sales (team)
    const todayRes = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM sales
      WHERE team = $1
        AND created_at >= date_trunc('day', NOW())
      `,
      [team]
    );

    const todaySales = Number(todayRes.rows?.[0]?.total || 0);

    // 3) Total last X days
    const totalRes = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM sales
      WHERE team = $1
        AND created_at >= ${fromDateExpr}
      `,
      [team]
    );

    const totalSales = Number(totalRes.rows?.[0]?.total || 0);

    return NextResponse.json({
      todaySales,
      totalSales,
      rows,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load sales pages" },
      { status: 500 }
    );
  }
}
