"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";

type SalesPageRow = {
  page: string;
  total: number;
  goal: number;
};

async function safeJson(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  const text = await r.text();
  try {
    const json = JSON.parse(text);
    if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
    return json;
  } catch {
    throw new Error(text || `HTTP ${r.status}`);
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const s: any = session;
  const userStatus = s?.status;

  const [teams, setTeams] = useState<string[]>([]);
  const [team, setTeam] = useState<string>("");

  // ✅ Range selector
  const [range, setRange] = useState<"daily" | "weekly" | "monthly" | "yearly" | "custom">("weekly");
  const [startDate, setStartDate] = useState(""); // YYYY-MM-DD
  const [endDate, setEndDate] = useState(""); // YYYY-MM-DD

  const [salesSummary, setSalesSummary] = useState<{
    today: number;
    total: number;
  } | null>(null);

  const [salesPages, setSalesPages] = useState<SalesPageRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const teamDisplay = useMemo(() => team || teams[0] || "", [team, teams]);

  // ✅ build query for API
  const rangeQuery = useMemo(() => {
    if (range === "custom") {
      if (!startDate || !endDate) return ""; // wait until dates are filled
      return `start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`;
    }
    return `range=${encodeURIComponent(range)}`;
  }, [range, startDate, endDate]);

  const rangeLabel = useMemo(() => {
    if (range === "daily") return "Today";
    if (range === "weekly") return "This week";
    if (range === "monthly") return "This month";
    if (range === "yearly") return "This year";
    if (startDate && endDate) return `${startDate} → ${endDate}`;
    return "Custom range";
  }, [range, startDate, endDate]);

  /* =============================
     Load team list (pills)
  ============================== */
  useEffect(() => {
    if (!session || userStatus !== "approved") return;

    (async () => {
      try {
        const t = await safeJson("/api/dashboard/teams");
        setTeams(t.teams || []);
        if (!team && t.teams?.length) setTeam(t.teams[0]);
      } catch (e: any) {
        setErr(e.message || "Failed to load teams");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, userStatus]);

  /* =============================
     Load SALES data (range/custom)
  ============================== */
  useEffect(() => {
    if (!session || userStatus !== "approved" || !teamDisplay) return;
    if (!rangeQuery) return; // custom mode but dates not selected yet

    setLoading(true);
    setErr("");

    (async () => {
      try {
        const sp = await safeJson(
          `/api/dashboard/sales/pages?team=${encodeURIComponent(teamDisplay)}&${rangeQuery}`
        );

        setSalesSummary({
          today: Number(sp?.todaySales || 0),
          total: Number(sp?.totalSales || 0),
        });

        setSalesPages(sp?.rows || []);
      } catch (e: any) {
        setErr(e.message || "Failed to load sales data");
      } finally {
        setLoading(false);
      }
    })();
  }, [session, userStatus, teamDisplay, rangeQuery]);

  /* =============================
     UI States
  ============================== */
  if (status === "loading") {
    return <div className="card">Loading…</div>;
  }

  if (!session) {
    return (
      <div className="card">
        <h1 className="h1">Not signed in</h1>
        <p className="small">Go to /intro and sign in with Google.</p>
        <div className="spacer" />
        <a className="btn btnPrimary" href="/intro">
          Go to Intro
        </a>
      </div>
    );
  }

  if (userStatus !== "approved") {
    return (
      <div className="card">
        <h1 className="h1">Awaiting approval</h1>
        <p className="small">Your account is pending admin approval.</p>
        <div className="spacer" />
        <a className="btn" href="/intro">
          Back to Intro
        </a>
        <button className="btn" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n || 0);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>
            Sales Dashboard
          </h1>
          <p className="small">Live read-only view from Sales Postgres. Built for internal demo.</p>
        </div>
        <span className="badge">{loading ? "Refreshing…" : "Live"}</span>
      </div>

      <div className="spacer" />

      {/* Team Pills */}
      <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
        {teams.map((t) => (
          <button
            key={t}
            className="btn"
            onClick={() => setTeam(t)}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              opacity: teamDisplay === t ? 1 : 0.75,
              border: teamDisplay === t ? "1px solid rgba(120,120,255,.8)" : "1px solid rgba(255,255,255,.08)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Range Pills */}
      <div className="row" style={{ flexWrap: "wrap", gap: 10, marginTop: 12 }}>
        {(["daily", "weekly", "monthly", "yearly", "custom"] as const).map((r) => (
          <button
            key={r}
            className="btn"
            onClick={() => setRange(r)}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              opacity: range === r ? 1 : 0.75,
              border: range === r ? "1px solid rgba(120,120,255,.8)" : "1px solid rgba(255,255,255,.08)",
            }}
          >
            {r === "daily"
              ? "Daily"
              : r === "weekly"
              ? "Weekly"
              : r === "monthly"
              ? "Monthly"
              : r === "yearly"
              ? "Year"
              : "Custom"}
          </button>
        ))}
      </div>

      {/* Custom Date Inputs */}
      {range === "custom" ? (
        <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="card" style={{ padding: 12 }}>
            <div className="small" style={{ marginBottom: 6, opacity: 0.8 }}>
              Start
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: 10, borderRadius: 10 }}
            />
          </div>

          <div className="card" style={{ padding: 12 }}>
            <div className="small" style={{ marginBottom: 6, opacity: 0.8 }}>
              End
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: 10, borderRadius: 10 }}
            />
          </div>

          <span className="small" style={{ opacity: 0.75 }}>
            {startDate && endDate ? "✅ Applied" : "Pick both dates"}
          </span>
        </div>
      ) : null}

      {err && (
        <>
          <div className="spacer" />
          <div className="card" style={{ border: "1px solid rgba(255,80,80,.35)" }}>
            <p className="small" style={{ color: "rgba(255,180,180,.95)" }}>
              Error: {err}
            </p>
          </div>
        </>
      )}

      <div className="spacer" />

      {/* KPIs */}
      <div className="row">
        <div className="kpi" style={{ flex: 1 }}>
          <p className="kpiTitle">Today Sales</p>
          <p className="kpiValue">{money(salesSummary?.today || 0)}</p>
          <p className="small">Team: {teamDisplay}</p>
        </div>

        <div className="kpi" style={{ flex: 1 }}>
          <p className="kpiTitle">Total Sales</p>
          <p className="kpiValue">{money(salesSummary?.total || 0)}</p>
          <p className="small">{rangeLabel}</p>
        </div>

        <div className="kpi" style={{ flex: 1 }}>
          <p className="kpiTitle">Status</p>
          <p className="kpiValue">Live</p>
          <p className="small">Read-only</p>
        </div>
      </div>

      <div className="hr" />

      {/* Page Performance */}
      <h2 className="h2">Page Performance</h2>
      <p className="small">Shows sales totals by page for: {rangeLabel}</p>

      <div className="spacer" />

      {salesPages.length === 0 ? (
        <p className="small">No sales found for this team.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {salesPages.map((r) => (
            <div key={r.page} className="card" style={{ padding: 14 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700 }}>{r.page}</div>
                <div>
                  {money(r.total)} / {money(r.goal || 0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
