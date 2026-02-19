import { NextResponse } from "next/server";
import { Pool } from "pg";

const salesPool = new Pool({
  connectionString: process.env.SALES_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function tierFromPercentile(rank: number, total: number) {
  if (total <= 0) return 1;
  const p = (rank + 1) / total; // rank 0 = best
  if (p <= 0.1) return 5;
  if (p <= 0.3) return 4;
  if (p <= 0.6) return 3;
  if (p <= 0.85) return 2;
  return 1;
}

async function getColumnType(table: string, column: string) {
  const res = await salesPool.query(
    `
    SELECT data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name=$1
      AND column_name=$2
    LIMIT 1
    `,
    [table, column]
  );

  const row = res.rows?.[0];
  return {
    data_type: String(row?.data_type || ""),
    udt_name: String(row?.udt_name || ""),
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const days = Math.max(1, Number(searchParams.get("days") || "30"));
    const team = String(searchParams.get("team") || "").trim(); // optional
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // ✅ detect ts type
    const tsType = await getColumnType("sales", "ts");
    const isTimestamp =
      tsType.data_type.includes("timestamp") || tsType.data_type === "date" || tsType.udt_name.includes("timestamp");
    const isNumber =
      tsType.data_type === "bigint" ||
      tsType.data_type === "integer" ||
      tsType.data_type === "numeric" ||
      tsType.udt_name === "int8" ||
      tsType.udt_name === "int4";

    // If number, we’ll assume epoch MILLISECONDS (most common).
    // If your values are seconds, we auto-fallback below.
    const fromEpochMs = fromDate.getTime();
    const fromEpochSec = Math.floor(fromEpochMs / 1000);

    // Build WHERE clause depending on ts type
    let whereTs = "";
    let params: any[] = [];
    let tsMode: "timestamp" | "epoch_ms" | "epoch_sec" | "none" = "none";

    if (isTimestamp) {
      tsMode = "timestamp";
      params = [fromDate];
      whereTs = `AND s.ts >= $1`;
    } else if (isNumber) {
      // try ms first
      tsMode = "epoch_ms";
      params = [fromEpochMs];
      whereTs = `AND s.ts >= $1`;
    } else {
      // unknown type, don't filter (so you still see data)
      tsMode = "none";
      params = [];
      whereTs = ``;
    }

    const sql = `
      SELECT
        s.chat_id,
        COALESCE(t.name, 'Chatter ' || s.chat_id::text) AS display_name,
        COALESCE(SUM(s.amount), 0) AS total_sales
      FROM sales s
      LEFT JOIN teams t ON t.chat_id = s.chat_id
      WHERE s.chat_id IS NOT NULL
        ${whereTs}
        ${team ? `AND s.team = $${params.length + 1}` : ""}
      GROUP BY s.chat_id, t.name
      ORDER BY total_sales DESC
    `;

    const finalParams = team ? [...params, team] : params;

    let res = await salesPool.query(sql, finalParams);
    let rows = res.rows || [];

    // ✅ If epoch_ms mode returns empty, auto-fallback to epoch_seconds
    if (rows.length === 0 && tsMode === "epoch_ms") {
      tsMode = "epoch_sec";
      const params2 = [fromEpochSec];
      const sql2 = `
        SELECT
          s.chat_id,
          COALESCE(t.name, 'Chatter ' || s.chat_id::text) AS display_name,
          COALESCE(SUM(s.amount), 0) AS total_sales
        FROM sales s
        LEFT JOIN teams t ON t.chat_id = s.chat_id
        WHERE s.chat_id IS NOT NULL
          AND s.ts >= $1
          ${team ? `AND s.team = $2` : ""}
        GROUP BY s.chat_id, t.name
        ORDER BY total_sales DESC
      `;
      const finalParams2 = team ? [...params2, team] : params2;

      res = await salesPool.query(sql2, finalParams2);
      rows = res.rows || [];
    }

    // ✅ If still empty and we were filtering by ts, do a last fallback = NO time filter
    // so you at least see something and we know the table has data.
    let usedNoTimeFallback = false;
    if (rows.length === 0 && tsMode !== "none") {
      usedNoTimeFallback = true;
      const sql3 = `
        SELECT
          s.chat_id,
          COALESCE(t.name, 'Chatter ' || s.chat_id::text) AS display_name,
          COALESCE(SUM(s.amount), 0) AS total_sales
        FROM sales s
        LEFT JOIN teams t ON t.chat_id = s.chat_id
        WHERE s.chat_id IS NOT NULL
          ${team ? "AND s.team = $1" : ""}
        GROUP BY s.chat_id, t.name
        ORDER BY total_sales DESC
      `;
      const finalParams3 = team ? [team] : [];
      const r3 = await salesPool.query(sql3, finalParams3);
      rows = r3.rows || [];
    }

    const withAvg = rows.map((r: any) => {
      const totalSales = Number(r.total_sales || 0);
      const dailyAvg = totalSales / days;

      return {
        chatterId: String(r.chat_id),
        displayName: String(r.display_name || "").trim(),
        username: "", // sales db does not store usernames
        totalSales: Math.round(totalSales * 100) / 100,
        dailyAvg: Math.round(dailyAvg * 100) / 100,
      };
    });

    // tier based on dailyAvg
    withAvg.sort((a, b) => b.dailyAvg - a.dailyAvg);
    const total = withAvg.length;

    const tiers = withAvg.map((r, i) => ({
      ...r,
      tier: tierFromPercentile(i, total),
    }));

    return NextResponse.json({
      ok: true,
      days,
      team: team || null,
      tsType,
      tsModeUsed: tsMode,
      note: usedNoTimeFallback
        ? "No rows matched the time filter; showing ALL-TIME totals. Check sales.ts type/values."
        : null,
      tiers,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}