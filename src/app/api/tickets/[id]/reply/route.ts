import { NextRequest, NextResponse } from "next/server"
import { websiteDb } from "@/lib/db"
import { initTicketTables } from "@/lib/initTickets"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await initTicketTables()

  const { id } = await context.params
  const body = await req.json()
  const db = websiteDb()

  await db.query(
    `INSERT INTO ticket_replies (ticket_id, user_name, role, message)
     VALUES ($1, $2, $3, $4)`,
    [id, body.user, body.role, body.message]
  )

  return NextResponse.json({ success: true })
}