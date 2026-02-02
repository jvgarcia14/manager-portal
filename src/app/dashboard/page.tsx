"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";

type SalesSummary = { team: string; today: number; last15: number };
type SalesPage = { page: string; total: number; goal: number; pct: number | null };
type AttendanceSummary = { attendanceDay: string; clockedIn: number; covers: number };
type AttendanceRow = { pageKey: string; shift: string; clockedIn: number; covers: number; lastTime: string };

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const s: any = session;
  const userStatus = s?.status;

  const [teams, setTeams] = useState<string[]>([]);
  const [team, setTeam] = useState<string>("");

  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [salesPages, setSalesPages] = useState<SalesPage[]>([]);
  const [attSummary, setAttSummary] = useState<AttendanceSummary | null>(null);
  const [attRows, setAttRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const canSee = status === "authenticated" && userStatus === "approved";

  useEffect(() => {
    if (!canSee) return;
    (async () => {
      setError("");
      const res = await fetch("/api/dashboard/teams", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to load teams");
        return;
      }
      setTeams(data.teams || []);
      setTeam((prev) => prev || data.teams?.[0] || "");
    })();
  }, [canSee]);

  useEffect(() => {
    if (!canSee) return;
    if (!team) return;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [sumRes, pagesRes, attSumRes, attPagesRes] = await Promise.all([
          fetch(`/api/dashboard/sales/summary?team=${encodeURIComponent(team)}`, { cache: "no-store" }),
          fetch(`/api/dashboard/sales/pages?team=${encodeURIComponent(team)}`, { cache: "no-store" }),
          fetch(`/api/dashboard/attendance/summary`, { cache: "no-store" }),
          fetch(`/api/dashboard/attendance/pages`, { cache: "no-store" }),
        ]);

        const [sum, pages, attS, attP] = await Promise.all([
          sumRes.json(),
          pagesRes.json(),
          attSumRes.json(),
          attPagesRes.json(),
        ]);

        if (!sumRes.ok) throw new Error(sum?.error || "Sales summary failed");
        if (!pagesRes.ok) throw new Error(pages?.error || "Sales pages failed");
        if (!attSumRes.ok) throw new Error(attS?.error || "Attendance summary failed");
        if (!attPagesRes.ok) throw new Error(attP?.error || "Attendance pages failed");

        setSalesSummary(sum);
        setSalesPages(pages.pages || []);
        setAttSummary(attS);
        setAttRows(attP.rows || []);
      } catch (e: any) {
        setError(e?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [canSee, team]);

  const topPages = useMemo(() => salesPages.slice(0, 12), [salesPages]);

  if (status === "loading") {
    return (
      <div className="container">
        <div className="card">Loading…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container">
        <div className="card">
          <h1 className="h1">Not signed in</h1>
          <p className="small">Go to /intro and sign in with Google.</p>
          <div className="spacer" />
          <a className="btn btnPrimary" href="/intro">Go to Intro</a>
        </div>
      </div>
    );
  }

  if (userStatus !== "approved") {
    return (
      <div className="container">
        <div className="card">
          <h1 className="h1">Awaiting approval</h1>
          <p className="small">Your account is pending admin approval.</p>
          <div className="spacer" />
          <a className="btn" href="/intro">Back to Intro</a>
          <button className="btn" onClick={() => signOut()}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="nav">
        <div className="row" style={{ gap: 10 }}>
          <span className="badge">🍓 Tasty Media</span>
          <span className="badge">Dashboard</span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span className="badge">{session.user?.email}</span>
          <span className="badge">Role: {s?.role || "user"}</span>
          <button className="btn" onClick={() => signOut()}>Sign out</button>
        </div>
      </div>

      <div className="spacer" />

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
          <div>
            <h1 className="h1" style={{ marginBottom: 6 }}>Sales Dashboard</h1>
            <p className="small">Live read-only view from Sales + Attendance Postgres. Built for internal demo.</p>
          </div>
          {loading ? <span className="badge">Refreshing…</span> : <span className="badge">Live</span>}
        </div>

        <div className="spacer" />

        {/* Team Pills */}
        <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
          {teams.map((t) => (
            <button
              key={t}
              className="btn"
              style={{
                borderRadius: 999,
                padding: "10px 14px",
                opacity: team === t ? 1 : 0.75,
                border: team === t ? "1px solid rgba(120,120,255,.8)" : undefined,
              }}
              onClick={() => setTeam(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {error ? (
          <>
            <div className="spacer" />
            <div className="card" style={{ border: "1px solid rgba(255,80,80,.35)" }}>
              <p className="small" style={{ color: "rgba(255,180,180,.95)" }}>
                Error: {error}
              </p>
              <p className="small">
                Check Railway variables: <b>SALES_DATABASE_URL</b> and <b>ATTENDANCE_DATABASE_URL</b>.
              </p>
            </div>
          </>
        ) : null}

        <div className="spacer" />

        {/* KPI Row */}
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <div className="kpi" style={{ flex: 1, minWidth: 220 }}>
            <p className="kpiTitle">Today Sales</p>
            <p className="kpiValue">{money(salesSummary?.today ?? 0)}</p>
            <p className="small">Team: {team || "—"}</p>
          </div>

          <div className="kpi" style={{ flex: 1, minWidth: 220 }}>
            <p className="kpiTitle">Total Sales (15d)</p>
            <p className="kpiValue">{money(salesSummary?.last15 ?? 0)}</p>
            <p className="small">Rolling last 15 days</p>
          </div>

          <div className="kpi" style={{ flex: 1, minWidth: 220 }}>
            <p className="kpiTitle">On shift (today)</p>
            <p className="kpiValue">{attSummary ? attSummary.clockedIn : 0}</p>
            <p className="small">Covers: {attSummary ? attSummary.covers : 0}</p>
          </div>
        </div>

        <div className="hr" />

        {/* Page performance */}
        <h2 className="h2" style={{ marginBottom: 8 }}>Page Performance (15d)</h2>
        <p className="small" style={{ marginTop: 0 }}>
          Shows sales totals by page. If page goals exist, we show progress.
        </p>

        <div className="spacer" />

        <div style={{ display: "grid", gap: 10 }}>
          {topPages.map((p) => {
            const pct = p.goal > 0 ? Math.min(100, Math.round((p.total / p.goal) * 100)) : null;
            return (
              <div key={p.page} className="card" style={{ padding: 14 }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ fontWeight: 700 }}>{p.page}</div>
                    <div className="small" style={{ opacity: 0.8 }}>
                      {money(p.total)} {p.goal > 0 ? ` / ${money(p.goal)}` : ""}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span className="badge">{pct === null ? "No goal" : `${pct}%`}</span>
                  </div>
                </div>

                <div style={{ height: 10 }} />

                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(255,255,255,.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: pct === null ? "12%" : `${pct}%`,
                      height: "100%",
                      background: "rgba(120,120,255,.75)",
                    }}
                  />
                </div>
              </div>
            );
          })}
          {salesPages.length === 0 ? (
            <div className="small">No sales found for this team (last 15 days).</div>
          ) : null}
        </div>

        <div className="hr" />

        {/* Attendance */}
        <h2 className="h2" style={{ marginBottom: 8 }}>Attendance Today</h2>
        <p className="small" style={{ marginTop: 0 }}>
          Attendance day starts at <b>6:00 AM PH</b>. (Attendance is global because the bot table has no team column.)
        </p>

        <div className="spacer" />

        <div className="card" style={{ padding: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span className="badge">Attendance day: {attSummary?.attendanceDay || "—"}</span>
            <span className="badge">Clocked in: {attSummary?.clockedIn ?? 0}</span>
            <span className="badge">Covers: {attSummary?.covers ?? 0}</span>
          </div>

          <div className="spacer" />

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", opacity: 0.8 }}>
                  <th style={{ padding: "8px 6px" }}>Shift</th>
                  <th style={{ padding: "8px 6px" }}>Page</th>
                  <th style={{ padding: "8px 6px" }}>Clocked</th>
                  <th style={{ padding: "8px 6px" }}>Covers</th>
                </tr>
              </thead>
              <tbody>
                {attRows.slice(0, 60).map((r, idx) => (
                  <tr key={`${r.shift}-${r.pageKey}-${idx}`} style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
                    <td style={{ padding: "8px 6px" }}>{r.shift}</td>
                    <td style={{ padding: "8px 6px" }}>#{r.pageKey}</td>
                    <td style={{ padding: "8px 6px" }}>{r.clockedIn}</td>
                    <td style={{ padding: "8px 6px" }}>{r.covers}</td>
                  </tr>
                ))}
                {attRows.length === 0 ? (
                  <tr>
                    <td className="small" style={{ padding: "10px 6px" }} colSpan={4}>
                      No attendance rows found for today yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {attRows.length > 60 ? (
            <p className="small" style={{ marginTop: 10, opacity: 0.8 }}>
              Showing first 60 rows for demo.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
