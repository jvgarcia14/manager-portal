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

async function detectSalesCols() {
  const { rows } = await salesPool.query(
    `select column_name from information_schema.columns where table_name = 'sales'`
  );
  return new Set(rows.map((r: any) => r.column_name));
}

function pick(cols: Set<string>, list: string[]) {
  for (const c of list) if (cols.has(c)) return c;
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

    // If your table isn't named 'sales', tell me and I’ll adjust.
    const cols = await detectSalesCols();

    const colAmount = pick(cols, ["amount", "sale_amount", "sales", "total"]);
    const colCreated = pick(cols, ["created_at", "date", "sold_at", "timestamp"]);
    const colUser = pick(cols, ["tg_username", "username", "chatter_username"]);
    const colFirst = pick(cols, ["tg_first_name", "first_name"]);
    const colLast = pick(cols, ["tg_last_name", "last_name"]);
    const colName = pick(cols, ["display_name", "name"]);

    if (!colAmount || !colCreated) {
      return NextResponse.json(
        { ok: false, error: "Sales table missing amount/created_at columns. Paste your sales schema." },
        { status: 500 }
      );
    }

    // Group by username (preferred) OR display_name if no username exists
    const groupKey = colUser ? colUser : (colName ? colName : null);
    if (!groupKey) {
      return NextResponse.json(
        { ok: false, error: "Sales table missing username/name to group by. Paste your sales schema." },
        { status: 500 }
      );
    }

    const selectName = colName ? `${colName} as display_name` : "null as display_name";
    const selectFirst = colFirst ? `${colFirst} as first_name` : "null as first_name";
    const selectLast = colLast ? `${colLast} as last_name` : "null as last_name";
    const selectUser = colUser ? `${colUser} as tg_username` : "null as tg_username";

    const { rows } = await salesPool.query(
      `
      select
        ${groupKey} as group_key,
        max(${selectName}) as display_name,
        max(${selectFirst}) as first_name,
        max(${selectLast}) as last_name,
        max(${selectUser}) as tg_username,
        coalesce(sum(${colAmount}), 0) as total_sales
      from sales
      where ${colCreated} >= now() - ($1 || ' days')::interval
      group by ${groupKey}
      order by total_sales desc
      `,
      [days]
    );

    const total = rows.length;
    const tiers = rows.map((r: any, i: number) => {
      const displayFromParts = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
      const username = normalizeUsername(r.tg_username);

      const displayName =
        String(r.display_name || "").trim() ||
        displayFromParts ||
        (username ? `@${username}` : String(r.group_key || "Unknown"));

      return {
        displayName,
        username: username ? `@${username}` : "",
        totalSales: Number(r.total_sales || 0),
        tier: tierFromPercentile(i, total),
      };
    });

    return NextResponse.json({ ok: true, days, tiers });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}