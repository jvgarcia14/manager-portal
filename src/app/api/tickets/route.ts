import { NextRequest, NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { initTicketTables } from "@/lib/initTickets";

export async function GET(req: NextRequest) {
  try {
    await initTicketTables();
    const db = websiteDb();

    const result = await db.query(`SELECT * FROM tickets ORDER BY created_at DESC`);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to load tickets", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await initTicketTables();
    const db = websiteDb();

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const description = String(body?.description || "").trim();
    const user = String(body?.user || "Unknown");
    const role = String(body?.role || "user");

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO tickets (title, description, created_by, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, description, user, role]
    );

    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to create ticket", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}