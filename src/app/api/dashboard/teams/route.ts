import { NextResponse } from "next/server";
import { salesDb } from "@/lib/db";
import { requireApprovedSession } from "@/lib/requireApproved";

export const runtime = "nodejs";

function cleanTeams(list: string[]) {
  const base = list
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    // remove "Team X" duplicates + numeric garbage
    .filter((s) => !/^team\s+/i.test(s))
    .filter((s) => !/^\d+$/.test(s));

  // de-dupe case-insensitive
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of base) {
    const k = t.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export async function GET() {
  const auth = await requireApprovedSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  // Try DB, else fallback to demo teams
  try {
    const db = salesDb();

    // ✅ Change this query to match your real sales DB schema if needed.
    // If you have a "sales" table with a "team" column, use that.
    const res = await db.query(`
      SELECT DISTINCT team
      FROM sales
      WHERE team IS NOT NULL AND team <> ''
      ORDER BY team ASC
    `);

    const teams = cleanTeams(res.rows.map((r: any) => r.team));
    if (teams.length) return NextResponse.json({ teams });

    throw new Error("No teams in DB");
  } catch {
    return NextResponse.json({
      teams: ["Black", "Bruiser", "Cobra", "Killa", "Ninja", "Spartan"],
      demo: true,
    });
  }
}
