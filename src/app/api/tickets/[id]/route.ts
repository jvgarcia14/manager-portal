import { NextRequest, NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { initTicketTables } from "@/lib/initTickets";

// ✅ Force Node runtime (pg doesn't work on Edge)
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await initTicketTables();
    const { id } = await context.params;

    const db = websiteDb();

    const ticketRes = await db.query(`SELECT * FROM tickets WHERE id = $1`, [id]);
    const ticket = ticketRes.rows[0];

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found", id }, { status: 404 });
    }

    const repliesRes = await db.query(
      `SELECT * FROM ticket_replies WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    return NextResponse.json({
      ticket,
      replies: repliesRes.rows,
    });
  } catch (err: any) {
    // ✅ shows up in Railway logs
    console.error("TICKETS/[id] GET error:", err);

    return NextResponse.json(
      {
        error: "Failed to load ticket thread",
        details: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}