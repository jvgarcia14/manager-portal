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

  const todayStart = `
    (date_trunc('day', now() AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'Asia/Manila')
  `;
  const last15Start = `
    (date_trunc('day', (now() AT TIME ZONE 'Asia/Manila') - interval '14 days') AT TIME ZONE 'Asia/Manila')
  `;

  const [todayRes, last15Res] = await Promise.all([
    db.query(
      `SELECT COALESCE(SUM(amount),0) AS total
       FROM sales
       WHERE team=$1 AND ts >= ${todayStart}`,
      [team]
    ),
    db.query(
      `SELECT COALESCE(SUM(amount),0) AS total
       FROM sales
       WHERE team=$1 AND ts >= ${last15Start}`,
      [team]
    ),
  ]);

  return NextResponse.json({
    team,
    today: Number(todayRes.rows[0]?.total ?? 0),
    last15: Number(last15Res.rows[0]?.total ?? 0),
  });
}
