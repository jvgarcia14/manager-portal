import { NextRequest, NextResponse } from "next/server"
import { websiteDb } from "@/lib/db"
import { initTicketTables } from "@/lib/initTickets"

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; replyId: string }> }
) {
  await initTicketTables()
  const { replyId } = await context.params
  const db = websiteDb()

  await db.query(`DELETE FROM ticket_replies WHERE id = $1`, [replyId])

  return NextResponse.json({ success: true })
}