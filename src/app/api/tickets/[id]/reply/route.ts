import { NextResponse } from "next/server"
import { websiteDb } from "@/lib/db"
import { initTicketTables } from "@/lib/initTickets"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  await initTicketTables()
  const db = websiteDb()
  const body = await req.json()

  await db.query(
    `INSERT INTO ticket_replies (ticket_id, user_name, role, message)
     VALUES ($1, $2, $3, $4)`,
    [params.id, body.user, body.role, body.message]
  )

  return NextResponse.json({ success: true })
}