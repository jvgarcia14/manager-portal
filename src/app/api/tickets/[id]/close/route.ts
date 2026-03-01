import { NextRequest, NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { initTicketTables } from "@/lib/initTickets";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await initTicketTables();
    const { id } = await context.params;

    const db = websiteDb();
    await db.query(`UPDATE tickets SET status = 'closed' WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("TICKETS/[id]/close POST error:", err);
    return NextResponse.json(
      { error: "Failed to close ticket", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}