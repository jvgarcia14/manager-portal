import { NextResponse, type NextRequest } from "next/server";
import { websiteDb } from "@/lib/db";
import { requireApproved } from "@/lib/requireApproved";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const gate = await requireApproved();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  try {
    const { id } = await params;
    const teamId = Number(id);
    if (!teamId) return NextResponse.json({ error: "invalid team id" }, { status: 400 });

    const db = websiteDb();
    await db.query(`DELETE FROM roster_teams WHERE id=$1`, [teamId]); // cascades to pages
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "failed to delete team", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
