"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";

type TeamsResp = { teams: string[]; error?: string };
type SalesSummary = { team: string; today: number; total15: number; error?: string };
type SalesPages = { rows: { pageName: string; total: number }[]; error?: string };
type AttSummary = { attendanceDay?: string; clockedIn: number; covers: number; error?: string };
type AttPages = { rows: { pageKey: string; shift: string; clockedIn: number; covers: number }[]; error?: string };

async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // This prevents "Unexpected end of JSON input"
    throw new Error(`API did not return JSON (status ${res.status}). Body: ${text.slice(0, 120)}...`);
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession();

  const [teams, setTeams] = useState<string[]>([]);
  const [team, setTeam] = useState<string>("");

  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [salesPages, setSalesPages] = useState<SalesPages | null>(null);

  const [attSummary, setAttSummary] = useState<AttSummary | null>(null);
  const [attPages, setAttPages] = useState<AttPages | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const email = session?.user?.email || "";

  const userOk = useMemo(() => {
    const s: any = session;
    return !!session && s?.status === "approved";
  }, [session]);

  useEffect(() => {
    if (!userOk) return;

    (async () => {
      try {
        const res = await fetch("/api/dashboard/teams", { cache: "no-store" });
        const data = await safeJson<TeamsResp>(res);
        const list = data.teams || [];
        setTeams(list);
        setTeam((prev) => prev || list[0] || "");
      } catch (e: any) {
        setError(e?.message || "Failed to load teams");
      }
    })();
  }, [userOk]);

  useEffect(() => {
    if (!userOk) return;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const qs = team ? `?team=${encodeURIComponent(team)}` : "";

        const [s1, s2, a1, a2] = await Promise.all([
          fetch(`/api/dashboard/sales/summary${qs}`, { cache: "no-store" }),
          fetch(`/api/dashboard/sales/pages${qs}`, { cache: "no-store" }),
          fetch(`/api/dashboard/attendance/summary`, { cache: "no-store" }),
          fetch(`/api/dashboard/attendance/pages`, { cache: "no-store" }),
        ]);

        setSalesSummary(await safeJson<SalesSummary>(s1));
        setSalesPages(await safeJson<SalesPages>(s2));
        setAttSummary(await safeJson<AttSummary>(a1));
        setAttPages(await safeJson<AttPages>(a2));
      } catch (e: any) {
        setError(e?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    })();
  }, [userOk, team]);

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
          <a className="btn btnPrimary" href="/intro">
            Go to Intro
          </a>
        </div>
      </div>
    );
  }

  const s: any = session;
  const userStatus = s?.status;

  if (userStatus !== "approved") {
    return (
      <div className="container">
        <div className="card">
          <h1 className="h1">Awaiting approval</h1>
          <p className="small">
            Your account is pending admin approval. You can’t access the dashboard yet.
          </p>
          <div className="spacer" />
          <a className="btn" href="/intro">
            Back to Intro
          </a>
          <button className="btn" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

  return (
    <div className="container">
      <div className="nav">
        <div className="row" style={{ gap: 10 }}>
          <span className="badge">🍓 Tasty Media</span>
          <span className="badge">Dashboard</span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span className="badge">{email}</span>
          <span className="badge">Role: {s?.role || "user"}</span>
          <button className="btn" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>

      <div className="spacer" />

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
          <div>
            <h1 className="h1" style={{ marginBottom: 6 }}>Sales Dashboard</h1>
            <p className="small">
              Live read-only view from Sales + Attendance Postgres. Built for internal demo.
            </p>
          </div>
          <span className="badge">{loading ? "Refreshing…" : "Live"}</span>
        </div>

        <div className="spacer" />

        {/* Team Pills */}
        <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
          {teams.length === 0 ? (
            <span className="badge">No teams found</span>
          ) : (
            teams.map((t) => (
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
            ))
          )}
        </div>

        <div className="spacer" />

        {error ? (
          <div className="card" style={{ border: "1px solid rgba(255,80,80,.35)" }}>
            <p className="small" style={{ color: "rgba(255,180,180,.95)" }}>
              <b>Error:</b> {error}
            </p>
            <p className="small">Check Railway variables: <b>SALES_DATABASE_URL</b> and <b>ATTENDANCE_DATABASE_URL</b>.</p>
          </div>
        ) : null}

        <div className="spacer" />

        {/* KPIs */}
        <div className="row">
          <div className="kpi" style={{ flex: 1 }}>
            <p className="kpiTitle">Today Sales</p>
            <p className="kpiValue">{fmtMoney(salesSummary?.today || 0)}</p>
            <p className="small">Team: {team || "—"}</p>
          </div>
          <div className="kpi" style={{ flex: 1 }}>
            <p className="kpiTitle">Total Sales (15d)</p>
            <p className="kpiValue">{fmtMoney(salesSummary?.total15 || 0)}</p>
            <p className="small">Rolling last 15 days</p>
          </div>
          <div className="kpi" style={{ flex: 1 }}>
            <p className="kpiTitle">On shift (today)</p>
            <p className="kpiValue">{attSummary?.clockedIn || 0}</p>
            <p className="small">Covers: {attSummary?.covers || 0}</p>
          </div>
        </div>

        <div className="hr" />

        {/* Sales Pages */}
        <h2 className="h2">Page Performance (15d)</h2>
        <p className="small">Shows sales totals by page. (Goals can be added next.)</p>

        <div className="spacer" />

        {salesPages?.rows?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {salesPages.rows.map((r) => (
              <div key={r.pageName} className="card" style={{ padding: 14 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <b>{r.pageName}</b>
                  <b>{fmtMoney(r.total)}</b>
                </div>
                <div className="hr" style={{ margin: "10px 0" }} />
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
                      height: "100%",
                      width: `${Math.min(100, (r.total / Math.max(1, salesSummary?.total15 || 1)) * 100)}%`,
                      background: "rgba(120,120,255,.7)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="small">No sales found for this team (last 15 days).</p>
        )}

        <div className="hr" />

        {/* Attendance */}
        <h2 className="h2">Attendance Today</h2>
        <p className="small">
          Attendance day starts at <b>6:00 AM PH</b>. (Attendance is global unless your bot stores team.)
        </p>

        <div className="spacer" />

        <div className="card" style={{ padding: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <span className="badge">Attendance day: {attSummary?.attendanceDay || "—"}</span>
            <span className="badge">Clocked in: {attSummary?.clockedIn || 0}</span>
            <span className="badge">Covers: {attSummary?.covers || 0}</span>
          </div>

          <div className="spacer" />

          <div className="row" style={{ fontWeight: 700, opacity: 0.9 }}>
            <div style={{ flex: 1 }}>Shift</div>
            <div style={{ flex: 2 }}>Page</div>
            <div style={{ width: 110, textAlign: "right" }}>Clocked</div>
            <div style={{ width: 110, textAlign: "right" }}>Covers</div>
          </div>

          <div className="hr" />

          {attPages?.rows?.length ? (
            attPages.rows.map((r, idx) => (
              <div key={idx} className="row" style={{ padding: "10px 0" }}>
                <div style={{ flex: 1 }}>{r.shift}</div>
                <div style={{ flex: 2 }}>{r.pageKey}</div>
                <div style={{ width: 110, textAlign: "right" }}>{r.clockedIn}</div>
                <div style={{ width: 110, textAlign: "right" }}>{r.covers}</div>
              </div>
            ))
          ) : (
            <p className="small">No attendance rows found for today yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
