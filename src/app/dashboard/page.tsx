"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";

async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`API returned non-JSON (${res.status}). Body: ${text.slice(0, 220)}`);
  }
}

type SalesSummary = {
  todaySales: number;
  totalSales15d: number;
  team: string;
};

type SalesPageRow = {
  page: string;
  total: number;
  goal?: number | null;
};

type AttendanceSummary = {
  attendanceDay: string | null;
  clockedIn: number;
  covers: number;
};

type AttendanceRow = {
  shift: string;
  pageKey: string;
  clockedIn: number;
  covers: number;
  lastTime: string | null;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const s: any = session;
  const userStatus = s?.status;
  const role = s?.role ?? "user";

  const [teams, setTeams] = useState<string[]>([]);
  const [team, setTeam] = useState<string>("Black");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [salesSummary, setSalesSummary] = useState<SalesSummary>({
    todaySales: 0,
    totalSales15d: 0,
    team: "Black",
  });
  const [salesPages, setSalesPages] = useState<SalesPageRow[]>([]);

  const [attSummary, setAttSummary] = useState<AttendanceSummary>({
    attendanceDay: null,
    clockedIn: 0,
    covers: 0,
  });
  const [attRows, setAttRows] = useState<AttendanceRow[]>([]);

  const isApproved = userStatus === "approved";

  useEffect(() => {
    if (!isApproved) return;

    (async () => {
      setError("");
      try {
        const res = await fetch("/api/dashboard/teams", { cache: "no-store" });
        const data = await safeJson<{ teams: string[] }>(res);
        const list = (data.teams || []).filter(Boolean);
        setTeams(list.length ? list : ["Black", "Bruiser", "Cobra", "Killa", "Ninja", "Spartan"]);
        if (list.length) setTeam(list[0]);
      } catch (e: any) {
        setTeams(["Black", "Bruiser", "Cobra", "Killa", "Ninja", "Spartan"]);
        setError(e?.message ?? "Failed loading teams");
      }
    })();
  }, [isApproved]);

  useEffect(() => {
    if (!isApproved) return;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const [sumRes, pagesRes, attSumRes, attPagesRes] = await Promise.all([
          fetch(`/api/dashboard/sales/summary?team=${encodeURIComponent(team)}`, { cache: "no-store" }),
          fetch(`/api/dashboard/sales/pages?team=${encodeURIComponent(team)}`, { cache: "no-store" }),
          fetch(`/api/dashboard/attendance/summary`, { cache: "no-store" }),
          fetch(`/api/dashboard/attendance/pages`, { cache: "no-store" }),
        ]);

        const sum = await safeJson<SalesSummary>(sumRes);
        const pages = await safeJson<{ rows: SalesPageRow[] }>(pagesRes);
        const aSum = await safeJson<AttendanceSummary>(attSumRes);
        const aPages = await safeJson<{ rows: AttendanceRow[] }>(attPagesRes);

        setSalesSummary(sum);
        setSalesPages(pages.rows || []);
        setAttSummary(aSum);
        setAttRows(aPages.rows || []);
      } catch (e: any) {
        setError(
          (e?.message ?? "Failed loading data") +
            "\n\nCheck Railway variables: SALES_DATABASE_URL and ATTENDANCE_DATABASE_URL."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [team, isApproved]);

  const money = useMemo(
    () => (n: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(Number.isFinite(n) ? n : 0),
    []
  );

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

  if (!isApproved) {
    return (
      <div className="container">
        <div className="card">
          <h1 className="h1">Awaiting approval</h1>
          <p className="small">Your account is pending admin approval. You can’t access the dashboard yet.</p>
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
          <button className="btn" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>

      <div className="spacer" />

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 className="h1" style={{ marginBottom: 6 }}>
              Sales Dashboard
            </h1>
            <p className="small">Live read-only view from Sales + Attendance Postgres. Built for internal demo.</p>
          </div>
          <span className="badge">{loading ? "Refreshing…" : "Live"}</span>
        </div>

        <div className="spacer" />

        {/* Team Pills */}
        <div className="pillRow">
          {(teams.length ? teams : ["Black", "Bruiser", "Cobra", "Killa", "Ninja", "Spartan"]).map((t) => (
            <button
              key={t}
              className={`pill ${team === t ? "pillActive" : ""}`}
              onClick={() => setTeam(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="spacer" />

        {error ? (
          <div className="errorBox">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Error</div>
            <div className="small" style={{ whiteSpace: "pre-wrap" }}>
              {error}
            </div>
          </div>
        ) : null}

        <div className="spacer" />

        {/* KPIs */}
        <div className="kpiGrid">
          <div className="cardSoft">
            <p className="kpiTitle">Today Sales</p>
            <p className="kpiValue">{money(salesSummary.todaySales)}</p>
            <p className="small">Team: {team}</p>
          </div>
          <div className="cardSoft">
            <p className="kpiTitle">Total Sales (15d)</p>
            <p className="kpiValue">{money(salesSummary.totalSales15d)}</p>
            <p className="small">Rolling last 15 days</p>
          </div>
          <div className="cardSoft">
            <p className="kpiTitle">On shift (today)</p>
            <p className="kpiValue">{attSummary.clockedIn}</p>
            <p className="small">Covers: {attSummary.covers}</p>
          </div>
        </div>

        <div className="hr" />

        <h2 style={{ margin: 0, fontSize: 18 }}>Page Performance (15d)</h2>
        <p className="small">Shows sales totals by page. If page goals exist, we show progress.</p>

        <div className="spacer" />

        {salesPages.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Total</th>
                <th>Goal</th>
              </tr>
            </thead>
            <tbody>
              {salesPages.map((r) => (
                <tr key={r.page}>
                  <td>{r.page}</td>
                  <td>{money(r.total)}</td>
                  <td>{r.goal == null ? "—" : money(Number(r.goal))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="small">No sales found for this team (last 15 days).</div>
        )}

        <div className="hr" />

        <h2 style={{ margin: 0, fontSize: 18 }}>Attendance Today</h2>
        <p className="small">
          Attendance day starts at <b>6:00 AM PH</b>. (Attendance is global because the bot table has no team column.)
        </p>

        <div className="spacer" />

        <div className="cardSoft">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="badge">Attendance day: {attSummary.attendanceDay ?? "—"}</span>
            <span className="badge">Clocked in: {attSummary.clockedIn}</span>
            <span className="badge">Covers: {attSummary.covers}</span>
          </div>

          <div className="spacer" />

          {attRows.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Shift</th>
                  <th>Page</th>
                  <th>Clocked</th>
                  <th>Covers</th>
                  <th>Last time</th>
                </tr>
              </thead>
              <tbody>
                {attRows.map((r, idx) => (
                  <tr key={`${r.pageKey}-${r.shift}-${idx}`}>
                    <td>{r.shift}</td>
                    <td>{r.pageKey}</td>
                    <td>{r.clockedIn}</td>
                    <td>{r.covers}</td>
                    <td>{r.lastTime ? String(r.lastTime) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="small">No attendance rows found for today yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
