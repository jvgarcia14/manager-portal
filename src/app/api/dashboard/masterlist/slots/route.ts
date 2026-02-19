import { NextResponse } from "next/server";
import { ensureWebsiteSchema, websitePool } from "@/lib/websiteDb";

export async function GET() {
  await ensureWebsiteSchema();
  const { rows } = await websitePool.query(
    `select id, page_key, shift, main_tg_username, main_display_name
     from masterlist_slots
     order by page_key asc, shift asc`
  );
  return NextResponse.json({ ok: true, slots: rows });
}

export async function POST(req: Request) {
  await ensureWebsiteSchema();
  const body = await req.json();

  const page_key = String(body.page_key || "").trim();
  const shift = String(body.shift || "").trim();
  const main_tg_username = String(body.main_tg_username || "").trim().replace(/^@/, "");
  const main_display_name = String(body.main_display_name || "").trim();

  if (!page_key || !shift) {
    return NextResponse.json({ ok: false, error: "Missing page_key or shift" }, { status: 400 });
  }

  const { rows } = await websitePool.query(
    `
    insert into masterlist_slots (page_key, shift, main_tg_username, main_display_name)
    values ($1,$2,$3,$4)
    on conflict (page_key, shift)
    do update set
      main_tg_username = excluded.main_tg_username,
      main_display_name = excluded.main_display_name,
      updated_at = now()
    returning id, page_key, shift, main_tg_username, main_display_name
    `,
    [page_key, shift, main_tg_username || null, main_display_name || null]
  );

  return NextResponse.json({ ok: true, slot: rows[0] });
}