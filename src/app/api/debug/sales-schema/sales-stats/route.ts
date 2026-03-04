import { NextResponse } from "next/server";
import { salesDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const pool = salesDb();
  const client = await pool.connect();
  try {
    const stats = await client.query(`
      SELECT
        COUNT(*)::int AS total_rows,
        SUM(CASE WHEN chat_id IS NULL THEN 1 ELSE 0 END)::int AS null_chat_id_rows,
        SUM(CASE WHEN chat_id IS NOT NULL THEN 1 ELSE 0 END)::int AS non_null_chat_id_rows,
        MIN(ts) AS min_ts,
        MAX(ts) AS max_ts
      FROM sales
    `);

    const sample = await client.query(`
      SELECT id, chat_id, team, page, amount, ts
      FROM sales
      ORDER BY ts DESC
      LIMIT 10
    `);

    return NextResponse.json({ ok: true, stats: stats.rows[0], sample: sample.rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  } finally {
    client.release();
  }
}