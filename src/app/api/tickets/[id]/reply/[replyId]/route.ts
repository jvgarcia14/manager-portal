import { NextRequest, NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { initTicketTables } from "@/lib/initTickets";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; replyId: string }> }
) {
  try {
    await initTicketTables();
    const { replyId } = await context.params;

    const db = websiteDb();
    await db.query(`DELETE FROM ticket_replies WHERE id = $1`, [replyId]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("TICKETS/[id]/reply/[replyId] DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete reply", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}