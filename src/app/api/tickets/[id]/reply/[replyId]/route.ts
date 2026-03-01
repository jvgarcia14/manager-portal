import { NextResponse } from "next/server"
import { websiteDb } from "@/lib/db"

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; replyId: string }> }
) {
  const { id, replyId } = await context.params
  const db = websiteDb()

  await db.query(
    `DELETE FROM ticket_replies WHERE id = $1`,
    [replyId]
  )

  return NextResponse.json({ success: true })
}