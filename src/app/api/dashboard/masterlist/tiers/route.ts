import { NextResponse } from "next/server";
import { Pool } from "pg";

const salesPool = new Pool({
  connectionString: process.env.SALES_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function tierFromPercentile(rank: number, total: number) {
  if (total <= 0) return 1;
  const p = (rank + 1) / total;
  if (p <= 0.10) return 5;
  if (p <= 0.30) return 4;
  if (p <= 0.60) return 3;
  if (p <= 0.85) return 2;
  return 1;
}

async function getCols(table: string) {
  const { rows } = await salesPool.query(
    `select column_name from information_schema.columns where table_name = $1`,
    [table]
  );
  return new Set(rows.map((r: any) => r.column_name));
}

function pick(cols: Set<string>, candidates: string[]) {
  for (const c of candidates) if (cols.has(c)) return c;
  return null;
}

function normalizeUsername(u: any) {
  const s = String(u || "").trim();
  if (!s) return "";
  return s.startsWith("@") ? s.slice(1) : s;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") || "30");

    // If your table name is not "sales", tell me and I’ll change it.
    const table = "sales";
    const cols = await getCols(table);

    // Detect amount + date + chatter identity columns
    const colAmount = pick(cols, ["amount", "sale_amount", "total", "sales", "usd", "net"]);
    const colDate = pick(cols, ["created_at", "date", "sold_at", "timestamp", "ts", "day"]);
    const colUser = pick(cols, ["tg_username", "username", "chatter_username", "chatter"]);
    const colName = pick(cols, ["display_name", "name"]);
    const colFirst = pick(cols, ["tg_first_name", "first_name"]);
    const colLast = pick(cols, ["tg_last_name", "last_name"]);

    if (!colAmount) {
      return NextResponse.json(
        { ok: false, error: "Sales table: can't find amount column. Tell me your amount column name." },
        { status: 500 }
      );
    }

    // Group by chatter username if available, else name
    const groupKey = colUser || colName;
    if (!groupKey) {
      return NextResponse.json(
        { ok: false, error: "Sales table: can't find chatter username/name column to group by." },
        { status: 500 }
      );
    }

    const whereDate = colDate
      ? `where ${colDate} >= now() - ($1 || ' days')::interval`
      : ""; // if no date col, we just compute all-time

    const params: any[] = [];
    if (colDate) params.push(days);

    const { rows } = await salesPool.query(
      `
      select
        ${groupKey} as group_key,
        max(${colName ? colName : groupKey}) as display_name,
        max(${colUser ? colUser : groupKey}) as tg_username,
        max(${colFirst ? colFirst : groupKey}) as first_name,
        max(${colLast ? colLast : groupKey}) as last_name,
        coalesce(sum(${colAmount}), 0) as total_sales
      from ${table}
      ${whereDate}
      group by ${groupKey}
      order by total_sales desc
      `,
      params
    );

    const total = rows.length;
    const tiers = rows.map((r: any, i: number) => {
      const username = normalizeUsername(r.tg_username);
      const displayFromParts = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();

      const displayName =
        String(r.display_name || "").trim() ||
        displayFromParts ||
        (username ? `@${username}` : String(r.group_key || "Unknown"));

      return {
        chatterId: r.group_key,
        displayName,
        username: username ? `@${username}` : "",
        totalSales: Number(r.total_sales || 0),
        tier: tierFromPercentile(i, total),
      };
    });

    return NextResponse.json({
      ok: true,
      daysUsed: colDate ? days : null,
      note: colDate ? null : "No date column found; showing ALL-TIME totals.",
      tiers,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}