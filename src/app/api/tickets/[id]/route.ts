import { NextRequest, NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { initTicketTables } from "@/lib/initTickets";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await initTicketTables();
    const { id } = await context.params;

    const db = websiteDb();

    const ticket = await db.query(`SELECT * FROM tickets WHERE id = $1`, [id]);
    if (!ticket.rows[0]) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const replies = await db.query(
      `SELECT * FROM ticket_replies WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    return NextResponse.json({
      ticket: ticket.rows[0],
      replies: replies.rows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to load ticket thread", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}