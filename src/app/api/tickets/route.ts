import { NextResponse } from "next/server"
import { websiteDb } from "@/lib/db"
import { initTicketTables } from "@/lib/initTickets"

export async function GET() {
  await initTicketTables()
  const db = websiteDb()

  const result = await db.query(
    `SELECT * FROM tickets ORDER BY created_at DESC`
  )

  return NextResponse.json(result.rows)
}

export async function POST(req: Request) {
  await initTicketTables()
  const db = websiteDb()
  const body = await req.json()

  const result = await db.query(
    `INSERT INTO tickets (title, description, created_by, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [body.title, body.description, body.user, body.role]
  )

  return NextResponse.json(result.rows[0])
}