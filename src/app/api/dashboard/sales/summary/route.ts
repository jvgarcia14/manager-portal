// src/app/api/dashboard/sales/summary/route.ts
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
    const totalSalesRes = await client.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total_sales
      FROM sales
      WHERE team = $1 AND ts >= $2
      `,
      [team, cutoff]
    );

    const totalGoalRes = await client.query(
      `
      SELECT COALESCE(SUM(goal), 0) AS total_goal
      FROM page_goals
      WHERE team = $1
      `,
      [team]
    );

    const totalSales = Number(totalSalesRes.rows?.[0]?.total_sales || 0);
    const totalGoal = Number(totalGoalRes.rows?.[0]?.total_goal || 0);

    return NextResponse.json({
      team,
      days,
      totalSales: Math.round(totalSales * 100) / 100,
      totalGoal: Math.round(totalGoal * 100) / 100,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "sales summary failed", detail: String(e?.message || e) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
