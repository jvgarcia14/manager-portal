"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";

type SalesPageRow = { page: string; total: number; goal: number };
type AttendanceRow = { pageKey: string; shift: string; clockedIn: number; covers: number };

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
  const role = s?.role || "user";

  const [teams, setTeams] = useState<string[]>([]);
  const [team, setTeam] = useState<string>("");

  const [salesSummary, setSalesSummary] = useState<{ today: number; total15d: number } | null>(null);
  const [salesPages, setSalesPages] = useState<SalesPageRow[]>([]);
  const [attSummary, setAttSummary] = useState<{ attendanceDay: string; clockedIn: number; covers: number } | null>(null);
  const [attRows, setAttRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const teamDisplay = useMemo(() => team || (teams[0] || ""), [team, teams]);

  useEffect(() => {
    if (!session) return;
    if (userStatus !== "approved") return;

    (async () => {
      try {
        const t = await safeJson("/api/dashboard/teams");
        setTeams(t.teams || []);
        if (!team && (t.teams?.length || 0) > 0) setTeam(t.teams[0]);
      } catch (e: any) {
        setErr(e.message || "Failed to load teams");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, userStatus]);

  useEffect(() => {
    if (!session) return;
    if (userStatus !== "approved") return;
    if (!teamDisplay) return;

    setLoading(true);
    setErr("");

    (async () => {
      try {
        const [ss, sp, as, ap] = await Promise.all([
          safeJson(`/api/dashboard/sales/summary?team=${encodeURIComponent(teamDisplay)}`),
          safeJson(`/api/dashboard/sales/pages?team=${encodeURIComponent(teamDisplay)}`),
          safeJson(`/api/dashboard/attendance/summary`),
          safeJson(`/api/dashboard/attendance/pages`),
        ]);

        setSalesSummary({ today: ss.today || 0, total15d: ss.total15d || 0 });
        setSalesPages(sp.rows || []);
        setAttSummary({ attendanceDay: as.attendanceDay || "", clockedIn: as.clockedIn || 0, covers: as.covers || 0 });
        setAttRows(ap.rows || []);
      } catch (e: any) {
        setErr(e.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    })();
  }, [session, userStatus, teamDisplay]);

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

  const money = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

  return (
    <div className="container">
      <div className="nav">
        <div className="row" style={{ gap: 10 }}>
          <span className="badge">🍓 Tasty Media</span>
          <span className="badge">Dashboard</span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span className="badge">{session.user?.email}</span>
          <span className="badge">Role: {role}</span>
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
                border: teamDisplay === t ? "1px solid rgba(120,120,255,.8)" : undefined,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {err ? (
          <>
            <div className="spacer" />
            <div className="card" style={{ border: "1px solid rgba(255,80,80,.35)" }}>
              <p className="small" style={{ color: "rgba(255,180,180,.95)" }}>
                Error: {err}
              </p>
              <p className="small">If this is DB-related, re-check Railway variables: SALES_DATABASE_URL and ATTENDANCE_DATABASE_URL.</p>
            </div>
          </>
        ) : null}

        <div className="spacer" />

        {/* KPIs */}
        <div className="row">
          <div className="kpi" style={{ flex: 1 }}>
            <p className="kpiTitle">Today Sales</p>
            <p className="kpiValue">{money(salesSummary?.today || 0)}</p>
            <p className="small">Team: {teamDisplay}</p>
          </div>
          <div className="kpi" style={{ flex: 1 }}>
            <p className="kpiTitle">Total Sales (15d)</p>
            <p className="kpiValue">{money(salesSummary?.total15d || 0)}</p>
            <p className="small">Rolling last 15 days</p>
          </div>
          <div className="kpi" style={{ flex: 1 }}>
            <p className="kpiTitle">On shift (today)</p>
            <p className="kpiValue">{attSummary?.clockedIn || 0}</p>
            <p className="small">Covers: {attSummary?.covers || 0}</p>
          </div>
        </div>

        <div className="hr" />

        {/* Page Performance */}
        <h2 className="h2">Page Performance (15d)</h2>
        <p className="small">Shows sales totals by page. (Goals can be added next.)</p>
        <div className="spacer" />

        {salesPages.length === 0 ? (
          <p className="small">No sales found for this team (last 15 days).</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {salesPages.map((r) => (
              <div key={r.page} className="card" style={{ padding: 14 }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700 }}>{r.page}</div>
                  <div style={{ opacity: 0.9 }}>{money(r.total)} / {money(r.goal || 0)}</div>
                </div>
                <div className="hr" />
                <div className="small" style={{ opacity: 0.75 }}>—</div>
              </div>
            ))}
          </div>
        )}

        <div className="hr" />

        {/* Attendance */}
        <h2 className="h2">Attendance Today</h2>
        <p className="small">
          Attendance day starts at <b>6:00 AM PH</b>. (Attendance is global unless your bot stores team.)
        </p>

        <div className="spacer" />

        <div className="card" style={{ padding: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
            <span className="badge">Attendance day: {attSummary?.attendanceDay || "—"}</span>
            <span className="badge">Clocked in: {attSummary?.clockedIn || 0}</span>
            <span className="badge">Covers: {attSummary?.covers || 0}</span>
          </div>

          <div className="spacer" />

          <div className="row" style={{ fontWeight: 700, opacity: 0.85 }}>
            <div style={{ flex: 1 }}>Shift</div>
            <div style={{ flex: 2 }}>Page</div>
            <div style={{ width: 120, textAlign: "right" }}>Clocked</div>
            <div style={{ width: 120, textAlign: "right" }}>Covers</div>
          </div>
          <div className="hr" />

          {attRows.length === 0 ? (
            <p className="small">No attendance rows found for today yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {attRows.map((r, idx) => (
                <div key={`${r.pageKey}-${r.shift}-${idx}`} className="row" style={{ opacity: 0.95 }}>
                  <div style={{ flex: 1 }}>{r.shift}</div>
                  <div style={{ flex: 2 }}>{r.pageKey}</div>
                  <div style={{ width: 120, textAlign: "right" }}>{r.clockedIn}</div>
                  <div style={{ width: 120, textAlign: "right" }}>{r.covers}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
