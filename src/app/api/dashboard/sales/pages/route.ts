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

    const res = await db.query(
      `
      SELECT page as pageName, COALESCE(SUM(amount),0) as total
      FROM sales
      WHERE ($1 = '' OR team = $1)
        AND created_at >= (NOW() - INTERVAL '15 days')
      GROUP BY page
      ORDER BY total DESC
      LIMIT 50
      `,
      [team]
    );

    const rows = res.rows.map((r: any) => ({
      pageName: String(r.pagename || r.pageName || r.page),
      total: Number(r.total || 0),
    }));

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ rows: [], error: e?.message || "sales pages failed" }, { status: 500 });
  }
}
