import { NextResponse } from "next/server";
import { salesDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ✅ Tier rules (based on DAILY AVERAGE within the selected window)
// Edit these to match your business rules.
function computeTier(dailyAvg: number) {
  // Example thresholds (USD/day)
  if (dailyAvg >= 5000) return { tier: 1, band: "elite" as const };
  if (dailyAvg >= 2500) return { tier: 2, band: "great" as const };
  if (dailyAvg >= 1200) return { tier: 3, band: "good" as const };
  if (dailyAvg >= 600) return { tier: 4, band: "ok" as const };
  return { tier: 5, band: "bad" as const };
}

function clampDays(n: number) {
  if ([7, 14, 30].includes(n)) return n;
  return 30;
}

function normalizeUsername(u: any) {
  const s = String(u || "").trim();
  if (!s) return "";
  return s.startsWith("@") ? s : `@${s}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // UI passes ?days=7|14|30
  const days = clampDays(Number(searchParams.get("days") || "30"));

  // Optional filter: ?team=Black (if you want per-team tiers)
  const team = (searchParams.get("team") || "").trim();

  const now = new Date();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const pool = salesDb();
  const client = await pool.connect();

  try {
    // If bot hasn’t been restarted with the new code yet, these columns won’t exist.
    // We keep the error message clear if that happens.
    //
    // We group by chatter_id, and use MAX() for name/user to avoid duplicates.
    // We also compute active_days (distinct day buckets) to help debug/UX if needed.

    const sql = `
      SELECT
        chatter_id,
        MAX(COALESCE(chatter_name, '')) AS chatter_name,
        MAX(COALESCE(chatter_username, '')) AS chatter_username,
        COALESCE(SUM(amount), 0) AS total_sales,
        COUNT(DISTINCT DATE(ts AT TIME ZONE 'Asia/Manila')) AS active_days
      FROM sales
      WHERE
        ts >= $1
        ${team ? "AND team = $2" : ""}
        AND chatter_id IS NOT NULL
      GROUP BY chatter_id
      ORDER BY total_sales DESC
      LIMIT 500
    `;

    const params: any[] = team ? [from, team] : [from];

    const res = await client.query(sql, params);

    const tiers = res.rows.map((r: any) => {
      const chatterId = r.chatter_id;

      // Prefer chatter_name; fallback to username; fallback "Unknown"
      const username = normalizeUsername(r.chatter_username);
      const displayName =
        String(r.chatter_name || "").trim() ||
        (username ? username.replace(/^@/, "") : "") ||
        "Unknown";

      const totalSales = Number(r.total_sales || 0);
      const dailyAvg = totalSales / days;

      const { tier, band } = computeTier(dailyAvg);

      return {
        chatterId,
        displayName,
        username, // should already be single @
        totalSales: Math.round(totalSales * 100) / 100,
        dailyAvg: Math.round(dailyAvg * 100) / 100,
        tier,
        band, // "elite" | "great" | "good" | "ok" | "bad"
        activeDays: Number(r.active_days || 0),
      };
    });

    return NextResponse.json({
      ok: true,
      days,
      team: team || null,
      from: from.toISOString(),
      to: now.toISOString(),
      tiers,
    });
  } catch (e: any) {
    const msg = String(e?.message || e);

    // Helpful hint if bot isn't updated yet
    if (
      msg.toLowerCase().includes("column") &&
      (msg.toLowerCase().includes("chatter_id") ||
        msg.toLowerCase().includes("chatter_name") ||
        msg.toLowerCase().includes("chatter_username"))
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Sales table missing chatter columns. Restart your Telegram bot with the updated salescheck2.0 so it can auto-add: chatter_id, chatter_name, chatter_username.",
          detail: msg,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "tiers query failed", detail: msg },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}