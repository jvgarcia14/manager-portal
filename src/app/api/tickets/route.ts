import { NextRequest, NextResponse } from "next/server";
import { websiteDb } from "@/lib/db";
import { initTicketTables } from "@/lib/initTickets";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await initTicketTables();
    const db = websiteDb();

    const { searchParams } = new URL(req.url);
    const status = String(searchParams.get("status") || "all").toLowerCase(); // open/answered/closed/all
    const kind = String(searchParams.get("kind") || "all").toLowerCase();     // ticket/announcement/all

    const where: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (kind !== "all") {
      where.push(`kind = $${i++}`);
      params.push(kind);
    }

    if (status !== "all") {
      where.push(`status = $${i++}`);
      params.push(status);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // ✅ List with pinned announcements always on top
    const list = await db.query(
      `
      SELECT *
      FROM tickets
      ${whereSql}
      ORDER BY
        CASE WHEN kind='announcement' AND pinned=true THEN 0
             WHEN kind='announcement' THEN 1
             ELSE 2
        END,
        created_at DESC
      `
      ,
      params
    );

    // ✅ Counts for tabs (tickets only)
    const counts = await db.query(`
      SELECT
        SUM(CASE WHEN kind='ticket' THEN 1 ELSE 0 END) AS total,
        SUM(CASE WHEN kind='ticket' AND status='open' THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN kind='ticket' AND status='answered' THEN 1 ELSE 0 END) AS answered,
        SUM(CASE WHEN kind='ticket' AND status='closed' THEN 1 ELSE 0 END) AS closed
      FROM tickets
    `);

    return NextResponse.json({
      rows: list.rows || [],
      counts: counts.rows?.[0] || { total: 0, open: 0, answered: 0, closed: 0 },
    });
  } catch (err: any) {
    console.error("TICKETS GET error:", err);
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

    const kind = String(body?.kind || "ticket").toLowerCase(); // ticket | announcement
    const pinned = Boolean(body?.pinned || false);

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
    }

    const safeKind = kind === "announcement" ? "announcement" : "ticket";

    const result = await db.query(
      `
      INSERT INTO tickets (title, description, created_by, role, kind, pinned)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [title, description, user, role, safeKind, pinned]
    );

    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    console.error("TICKETS POST error:", err);
    return NextResponse.json(
      { error: "Failed to create ticket", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}