import { NextRequest, NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { initTicketTables } from "@/lib/initTickets";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await initTicketTables();
    const { id } = await context.params;

    const body = await req.json();
    const user = String(body?.user || "Unknown");
    const role = String(body?.role || "user");
    const message = String(body?.message || "").trim();

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const db = websiteDb();

    await db.query(
      `INSERT INTO ticket_replies (ticket_id, user_name, role, message)
       VALUES ($1, $2, $3, $4)`,
      [id, user, role, message]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("TICKETS/[id]/reply POST error:", err);
    return NextResponse.json(
      { error: "Failed to add reply", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}