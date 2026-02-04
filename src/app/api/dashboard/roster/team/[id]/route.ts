import { NextResponse, type NextRequest } from "next/server";
import { websiteDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const teamId = Number(id);
    if (!teamId) return NextResponse.json({ error: "invalid team id" }, { status: 400 });

    const db = websiteDb();

    // ✅ ON DELETE CASCADE will remove roster_team_pages automatically
    await db.query(`DELETE FROM roster_teams WHERE id = $1`, [teamId]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "failed to delete team", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
