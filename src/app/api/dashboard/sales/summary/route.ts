import { NextResponse } from "next/server";
import { salesDb } from "@/lib/db";
import { requireApprovedSession } from "@/lib/requireApproved";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error, status: auth.status }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const team = searchParams.get("team") || "";

  try {
    const db = salesDb();

    // last 15 days total for team
    const total15 = await db.query(
      `
      SELECT COALESCE(SUM(amount),0) as total
      FROM sales
      WHERE ($1 = '' OR team = $1)
        AND created_at >= (NOW() - INTERVAL '15 days')
      `,
      [team]
    );

    // today total for team (PH time simple version)
    const today = await db.query(
      `
      SELECT COALESCE(SUM(amount),0) as total
      FROM sales
      WHERE ($1 = '' OR team = $1)
        AND created_at >= date_trunc('day', (NOW() AT TIME ZONE 'Asia/Manila'))
      `,
      [team]
    );

    return NextResponse.json({
      team,
      today: Number(today.rows[0]?.total || 0),
      total15: Number(total15.rows[0]?.total || 0),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "sales summary failed" }, { status: 500 });
  }
}
