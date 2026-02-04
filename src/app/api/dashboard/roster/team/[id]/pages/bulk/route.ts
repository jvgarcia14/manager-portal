import { NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: { id: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const teamId = Number(params.id);
    if (!teamId) return NextResponse.json({ error: "invalid team id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const pages = Array.isArray(body?.pages) ? body.pages : [];

    if (!pages.length) {
      return NextResponse.json({ error: "pages array is required" }, { status: 400 });
    }

    const values: any[] = [];
    const tuples: string[] = [];
    let i = 1;

    for (const p of pages) {
      const pageKey = String(p?.pageKey || "").trim().toLowerCase();
      const pageLabel = String(p?.pageLabel || "").trim();

      if (!pageKey || !pageLabel) continue;

      tuples.push(`($${i++}, $${i++}, $${i++})`);
      values.push(teamId, pageKey, pageLabel);
    }

    if (!tuples.length) {
      return NextResponse.json({ error: "no valid pages provided" }, { status: 400 });
    }

    const db = websiteDb();
    await db.query(
      `
      INSERT INTO roster_team_pages(team_id, page_key, page_label)
      VALUES ${tuples.join(",")}
      ON CONFLICT (team_id, page_key)
      DO UPDATE SET page_label = EXCLUDED.page_label
      `,
      values
    );

    return NextResponse.json({ ok: true, inserted: tuples.length });
  } catch (e: any) {
    return NextResponse.json(
      { error: "bulk add failed", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
