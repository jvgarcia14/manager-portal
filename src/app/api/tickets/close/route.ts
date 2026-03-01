import { NextRequest, NextResponse } from "next/server"
import { websiteDb } from "@/lib/db"
import { initTicketTables } from "@/lib/initTickets"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await initTicketTables()
  const { id } = await context.params
  const db = websiteDb()

  await db.query(`UPDATE tickets SET status = 'closed' WHERE id = $1`, [id])

  return NextResponse.json({ success: true })
}