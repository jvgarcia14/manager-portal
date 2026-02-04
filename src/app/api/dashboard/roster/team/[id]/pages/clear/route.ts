import { NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { requireApproved } from "@/lib/requireApproved";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Ctx) {
  const gate = await requireApproved();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  try {
    const teamId = Number(params.id);
    if (!teamId) return NextResponse.json({ error: "invalid team id" }, { status: 400 });

    const db = websiteDb();
    const r = await db.query(`DELETE FROM roster_team_pages WHERE team_id=$1`, [teamId]);

    return NextResponse.json({ ok: true, removed: r.rowCount || 0 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "failed to clear team pages", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
