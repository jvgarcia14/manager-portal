// src/app/api/dashboard/sales/pages/route.ts
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

  // PH "today" start (00:00 PH) converted to UTC Date
  const now = new Date();
  const phNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const phStart = new Date(phNow);
  phStart.setHours(0, 0, 0, 0);
  // convert PH start to UTC instant:
  const phStartUtc = new Date(phStart.getTime() - (phNow.getTime() - now.getTime()));

  const pool = salesDb();
  const client = await pool.connect();

  try {
    // rows (by page) within days
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

    // total within days
    const totalRes = await client.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM sales
      WHERE team = $1 AND ts >= $2
      `,
      [team, cutoff]
    );

    // today total (PH day)
    const todayRes = await client.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM sales
      WHERE team = $1 AND ts >= $2
      `,
      [team, phStartUtc]
    );

    // goals
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
      return { page, total: Math.round(total * 100) / 100, goal: Math.round(goal * 100) / 100 };
    });

    rows.sort((a, b) => b.total - a.total);

    const totalSales = Number(totalRes.rows?.[0]?.total || 0);
    const todaySales = Number(todayRes.rows?.[0]?.total || 0);

    return NextResponse.json({
      team,
      days,
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
