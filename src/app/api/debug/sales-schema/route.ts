import { NextResponse } from "next/server";
import { Pool } from "pg";

const salesPool = new Pool({
  connectionString: process.env.SALES_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET() {
  // list tables
  const tablesRes = await salesPool.query(`
    select table_name
    from information_schema.tables
    where table_schema='public'
    order by table_name asc
  `);

  // show columns for each table (limit to first 15 tables so response isn't huge)
  const tables = tablesRes.rows.map((r: any) => r.table_name).slice(0, 15);

  const out: any = {};
  for (const t of tables) {
    const colsRes = await salesPool.query(
      `select column_name from information_schema.columns where table_name=$1 order by ordinal_position`,
      [t]
    );
    out[t] = colsRes.rows.map((r: any) => r.column_name);
  }

  return NextResponse.json({ ok: true, tables, columns: out });
}