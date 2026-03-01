import { NextRequest, NextResponse } from "next/server"
import { websiteDb } from "@/lib/db"
import { initTicketTables } from "@/lib/initTickets"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await initTicketTables()
  const { id } = await context.params
  const db = websiteDb()

  const ticket = await db.query(`SELECT * FROM tickets WHERE id = $1`, [id])

  const replies = await db.query(
    `SELECT * FROM ticket_replies
     WHERE ticket_id = $1
     ORDER BY created_at ASC`,
    [id]
  )

  return NextResponse.json({
    ticket: ticket.rows[0],
    replies: replies.rows,
  })
}