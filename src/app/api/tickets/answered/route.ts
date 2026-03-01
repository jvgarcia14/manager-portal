import { NextResponse } from "next/server"
import { websiteDb } from "@/lib/db"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const db = websiteDb()

  await db.query(
    `UPDATE tickets SET status = 'answered' WHERE id = $1`,
    [params.id]
  )

  return NextResponse.json({ success: true })
}