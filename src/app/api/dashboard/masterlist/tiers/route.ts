import { NextResponse } from "next/server";
import { Pool } from "pg";

const salesPool = new Pool({
  connectionString: process.env.SALES_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const attendancePool = new Pool({
  connectionString: process.env.ATTENDANCE_DATABASE_URL,
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

function cleanUsername(u: any) {
  const s = String(u || "").trim();
  if (!s) return "";
  return s.replace(/^@+/, "").replace(/[^\w]/g, "");
}

function cleanDisplayName(name: any) {
  let s = String(name || "").trim();
  // remove embedded @username
  s = s.replace(/@\w+/g, "").trim();
  // collapse spaces
  s = s.replace(/\s+/g, " ");
  return s;
}

async function getCols(pool: Pool, table: string) {
  const { rows } = await pool.query(
    `select column_name from information_schema.columns where table_name = $1`,
    [table]
  );
  return new Set(rows.map((r: any) => r.column_name));
}

function pick(cols: Set<string>, candidates: string[]) {
  for (const c of candidates) if (cols.has(c)) return c;
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const days = Number(searchParams.get("days") || "30");
    const team = String(searchParams.get("team") || "").trim(); // optional

    // 1) SALES: group by chat_id
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const salesSqlBase = `
      select chat_id, coalesce(sum(amount), 0) as total_sales
      from sales
      where ts >= $1
      ${team ? "and team = $2" : ""}
      group by chat_id
      order by total_sales desc
    `;

    const salesParams = team ? [from, team] : [from];
    const salesRes = await salesPool.query(salesSqlBase, salesParams);

    const rows = salesRes.rows || [];
    if (rows.length === 0) {
      return NextResponse.json({ ok: true, days, team: team || null, tiers: [] });
    }

    // 2) ATTENDANCE: try to enrich chat_id -> display_name + username
    const aCols = await getCols(attendancePool, "attendance_clockins");

    // Try common column names
    const colChatId = pick(aCols, ["chat_id", "tg_chat_id", "telegram_chat_id", "user_id", "tg_user_id"]);
    const colUser = pick(aCols, ["tg_username", "username", "telegram_username", "user_name"]);
    const colFirst = pick(aCols, ["tg_first_name", "first_name", "telegram_first_name"]);
    const colLast = pick(aCols, ["tg_last_name", "last_name", "telegram_last_name"]);
    const colName = pick(aCols, ["display_name", "tg_name", "name"]);

    // Timestamp column (for picking latest identity)
    const colTime = pick(aCols, [
      "created_at",
      "clocked_in_at",
      "clockin_at",
      "clock_in_at",
      "ts",
      "timestamp",
      "time",
      "inserted_at",
      "id",
    ]);

    // Build identity map from attendance if possible
    const identityMap = new Map<string, { displayName: string; username: string }>();

    if (colChatId) {
      // batch IN query for all chat_ids in sales results
      const chatIds = rows.map((r: any) => String(r.chat_id));

      // Postgres IN needs $1,$2,... so build placeholders
      const placeholders = chatIds.map((_, i) => `$${i + 1}`).join(",");

      const selectParts = [
        `${colChatId} as chat_id`,
        colUser ? `${colUser} as tg_username` : `null as tg_username`,
        colFirst ? `${colFirst} as first_name` : `null as first_name`,
        colLast ? `${colLast} as last_name` : `null as last_name`,
        colName ? `${colName} as display_name` : `null as display_name`,
      ];

      const orderBy = colTime ? `order by ${colTime} desc` : "";

      // We grab recent rows for those chat ids and keep the first (latest) per chat_id
      const attRes = await attendancePool.query(
        `
        select ${selectParts.join(", ")}
        from attendance_clockins
        where ${colChatId} in (${placeholders})
        ${orderBy}
        `,
        chatIds
      );

      for (const r of attRes.rows || []) {
        const cid = String(r.chat_id);
        if (identityMap.has(cid)) continue; // keep latest only

        const uname = cleanUsername(r.tg_username);
        const fromParts = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
        const nm = cleanDisplayName(r.display_name) || cleanDisplayName(fromParts);

        identityMap.set(cid, {
          displayName: nm || (uname ? uname : `Chatter ${cid}`),
          username: uname,
        });
      }
    }

    // 3) Build tiers response
    const total = rows.length;
    const tiers = rows.map((r: any, i: number) => {
      const cid = String(r.chat_id);
      const totalSales = Number(r.total_sales || 0);

      const identity = identityMap.get(cid);
      const displayName = identity?.displayName || `Chatter ${cid}`;
      const username = identity?.username ? `@${identity.username}` : "";

      return {
        chatterId: cid,
        displayName,
        username,
        totalSales: Math.round(totalSales * 100) / 100,
        tier: tierFromPercentile(i, total),
      };
    });

    return NextResponse.json({
      ok: true,
      days,
      team: team || null,
      tiers,
      note: !pick(await getCols(attendancePool, "attendance_clockins"), ["chat_id", "tg_chat_id", "telegram_chat_id", "user_id", "tg_user_id"])
        ? "attendance_clockins has no chat_id/user_id column, so tiers can't show names yet."
        : null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}