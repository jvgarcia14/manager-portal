import { NextResponse } from "next/server"
import { websiteDb } from "@/lib/db"

export async function DELETE(
  req: Request,
  { params }: { params: { replyId: string } }
) {
  const db = websiteDb()

  await db.query(
    `DELETE FROM ticket_replies WHERE id = $1`,
    [params.replyId]
  )

  return NextResponse.json({ success: true })
}