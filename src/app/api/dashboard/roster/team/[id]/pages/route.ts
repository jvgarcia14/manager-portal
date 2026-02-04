import { NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { requireApproved } from "@/lib/requireApproved";
import { EXPECTED_PAGES } from "@/lib/expectedPages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const gate = await requireApproved();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  try {
    const { id } = await params;
    const teamId = Number(id);
    if (!teamId) return NextResponse.json({ error: "invalid team id" }, { status: 400 });

    const db = websiteDb();
    const r = await db.query(
      `
      SELECT page_key as "pageKey", page_label as "pageLabel"
      FROM roster_team_pages
      WHERE team_id = $1
      ORDER BY page_label ASC
      `,
      [teamId]
    );

    // ✅ seed defaults if team has no pages yet
    if ((r.rows?.length || 0) === 0) {
      const values: any[] = [];
      const tuples: string[] = [];
      let i = 1;

      for (const p of EXPECTED_PAGE_LIST) {
        tuples.push(`($${i++}, $${i++}, $${i++})`);
        values.push(teamId, p.pageKey, p.pageLabel);
      }

      await db.query(
        `
        INSERT INTO roster_team_pages(team_id, page_key, page_label)
        VALUES ${tuples.join(",")}
        ON CONFLICT (team_id, page_key)
        DO UPDATE SET page_label = EXCLUDED.page_label
        `,
        values
      );

      const r2 = await db.query(
        `
        SELECT page_key as "pageKey", page_label as "pageLabel"
        FROM roster_team_pages
        WHERE team_id = $1
        ORDER BY page_label ASC
        `,
        [teamId]
      );

      return NextResponse.json({ pages: r2.rows });
    }

    return NextResponse.json({ pages: r.rows });
  } catch (e: any) {
    return NextResponse.json({ error: "failed to load pages", detail: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const gate = await requireApproved();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  try {
    const { id } = await params;
    const teamId = Number(id);
    if (!teamId) return NextResponse.json({ error: "invalid team id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const pageKey = String(body?.pageKey || "").trim().toLowerCase();
    const pageLabel = String(body?.pageLabel || "").trim();

    if (!pageKey || !pageLabel) {
      return NextResponse.json({ error: "pageKey and pageLabel are required" }, { status: 400 });
    }

    const db = websiteDb();
    await db.query(
      `
      INSERT INTO roster_team_pages(team_id, page_key, page_label)
      VALUES ($1, $2, $3)
      ON CONFLICT (team_id, page_key)
      DO UPDATE SET page_label = EXCLUDED.page_label
      `,
      [teamId, pageKey, pageLabel]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "failed to add page", detail: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const gate = await requireApproved();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  try {
    const { id } = await params;
    const teamId = Number(id);

    const { searchParams } = new URL(req.url);
    const pageKey = String(searchParams.get("pageKey") || "").trim().toLowerCase();

    if (!teamId) return NextResponse.json({ error: "invalid team id" }, { status: 400 });
    if (!pageKey) return NextResponse.json({ error: "pageKey is required" }, { status: 400 });

    const db = websiteDb();
    await db.query(`DELETE FROM roster_team_pages WHERE team_id=$1 AND page_key=$2`, [teamId, pageKey]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "failed to delete page", detail: String(e?.message || e) }, { status: 500 });
  }
}
