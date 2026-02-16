import { NextResponse } from "next/server";
import { ensureWebsiteSchema, websitePool } from "@/lib/websiteDb";
import { requireApprovedSession } from "@/lib/requireApproved";
import { requireAdminSession } from "@/lib/requireAdmin";

function normalizeTag(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/\//g, "")
    .replace(/&/g, "")
    .replace(/x/g, "");
}

export async function GET() {
  // allow approved users to view (optional). If you want admin-only, switch to requireAdminSession()
  const gate = await requireApprovedSession();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 401 });

  await ensureWebsiteSchema();

  const { rows } = await websitePool.query(
    `SELECT tag, label, is_active, created_at, updated_at
     FROM pages
     ORDER BY lower(tag) ASC`
  );

  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  await ensureWebsiteSchema();

  const body = await req.json().catch(() => ({}));
  const tag = normalizeTag(body.tag);
  const label = String(body.label || "").trim();

  if (!tag || tag.length < 2) {
    return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
  }
  if (!label) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }

  await websitePool.query(
    `
    INSERT INTO pages (tag, label, is_active)
    VALUES ($1, $2, TRUE)
    ON CONFLICT (tag)
    DO UPDATE SET label = EXCLUDED.label, is_active = TRUE
    `,
    [tag, label]
  );

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  await ensureWebsiteSchema();

  const body = await req.json().catch(() => ({}));
  const tag = normalizeTag(body.tag);

  if (!tag) return NextResponse.json({ error: "Missing tag" }, { status: 400 });

  // allow toggling active and editing label
  const hasActive = typeof body.is_active === "boolean";
  const hasLabel = typeof body.label === "string";

  if (!hasActive && !hasLabel) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  if (hasActive && hasLabel) {
    await websitePool.query(
      `UPDATE pages SET is_active=$2, label=$3 WHERE tag=$1`,
      [tag, body.is_active, String(body.label).trim()]
    );
  } else if (hasActive) {
    await websitePool.query(`UPDATE pages SET is_active=$2 WHERE tag=$1`, [tag, body.is_active]);
  } else {
    await websitePool.query(`UPDATE pages SET label=$2 WHERE tag=$1`, [tag, String(body.label).trim()]);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  await ensureWebsiteSchema();

  const body = await req.json().catch(() => ({}));
  const tag = normalizeTag(body.tag);
  if (!tag) return NextResponse.json({ error: "Missing tag" }, { status: 400 });

  await websitePool.query(`DELETE FROM pages WHERE tag=$1`, [tag]);
  return NextResponse.json({ ok: true });
}