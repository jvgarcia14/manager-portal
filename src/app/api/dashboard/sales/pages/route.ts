import { NextResponse } from "next/server";
import { salesDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const team = (searchParams.get("team") || "").trim();
  const days = Number(searchParams.get("days") || "15");

  if (!team) return NextResponse.json({ error: "team is required" }, { status: 400 });
  if (![15, 30].includes(days)) return NextResponse.json({ error: "days must be 15 or 30" }, { status: 400 });

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const pool = salesDb();
  const client = await pool.connect();

  try {
    // ✅ keep alias "total" because your UI expects it
    const salesRes = await client.query(
      `
      SELECT page, COALESCE(SUM(amount), 0) AS total
      FROM sales
      WHERE team = $1 AND ts >= $2
      GROUP BY page
      ORDER BY total DESC
      `,
      [team, cutoff]
    );

    const goalsRes = await client.query(
      `
      SELECT page, COALESCE(goal, 0) AS goal
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

    // ✅ rows include BOTH total (old) + sales (new)
    const rows = [...allPages].map((page) => {
      const total = Number(totals.get(page) ?? 0);
      const goal = Number(goals.get(page) ?? 0);
      const pct = goal > 0 ? Math.round((total / goal) * 1000) / 10 : null;

      return {
        page,
        total: Math.round(total * 100) / 100,  // OLD (UI uses this)
        sales: Math.round(total * 100) / 100,  // NEW (optional)
        goal: Math.round(goal * 100) / 100,
        pct,
      };
    });

    rows.sort((a, b) => b.total - a.total);

    const total_sales = Math.round(rows.reduce((a, r) => a + r.total, 0) * 100) / 100;
    const total_goal = Math.round(rows.reduce((a, r) => a + r.goal, 0) * 100) / 100;
    const overall_pct = total_goal > 0 ? Math.round((total_sales / total_goal) * 1000) / 10 : null;

    return NextResponse.json({
      team,
      days,
      total_sales,   // ✅ new
      total_goal,    // ✅ new
      overall_pct,   // ✅ new
      rows,          // ✅ still compatible because rows[].total exists
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
