"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";

type SalesResp = {
  team: string;
  shift?: {
    total: number;
    byPage: { page: string; total: number }[];
    goals?: Record<string, number>;
  };
};

type AttendanceResp = {
  day: string;
  data: Record<
    string,
    Record<
      string,
      {
        users: { name: string; time: string }[];
        covers: { name: string; time: string }[];
        late: { name: string; time: string; isCover: boolean }[];
      }
    >
  >;
};

function phTodayISO(): string {
  // YYYY-MM-DD in Asia/Manila
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const s: any = session;
  const userStatus = s?.status;

  // ---- dashboard state ----
  const [team, setTeam] = useState<string>("Team 1");
  const [day, setDay] = useState<string>(() => phTodayISO());

  const [sales, setSales] = useState<SalesResp | null>(null);
  const [attendance, setAttendance] = useState<AttendanceResp | null>(null);

  const [loadingData, setLoadingData] = useState(false);
  const [errMsg, setErrMsg] = useState<string>("");

  // ---- auth gating (unchanged) ----
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

  if (userStatus !== "approved") {
    return (
      <div className="container">
        <div className="card">
          <h1 className="h1">Awaiting approval</h1>
          <p className="small">
            Your account is pending admin approval. You can’t access the
            dashboard yet.
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

  // ---- data fetching ----
  useEffect(() => {
    let alive = true;

    async function load() {
      setLoadingData(true);
      setErrMsg("");

      try {
        const [salesRes, attRes] = await Promise.all([
          fetch(`/api/dashboard/sales?team=${encodeURIComponent(team)}`, {
            cache: "no-store",
          }),
          fetch(`/api/dashboard/attendance?day=${encodeURIComponent(day)}`, {
            cache: "no-store",
          }),
        ]);

        // If routes aren't created yet, show a friendly message instead of crashing
        if (!salesRes.ok) {
          const t = await safeText(salesRes);
          throw new Error(`Sales API error: ${salesRes.status} ${t}`);
        }
        if (!attRes.ok) {
          const t = await safeText(attRes);
          throw new Error(`Attendance API error: ${attRes.status} ${t}`);
        }

        const salesJson = (await salesRes.json()) as SalesResp;
        const attJson = (await attRes.json()) as AttendanceResp;

        if (!alive) return;
        setSales(salesJson);
        setAttendance(attJson);
      } catch (e: any) {
        if (!alive) return;
        setSales(null);
        setAttendance(null);
        setErrMsg(e?.message || "Failed to load dashboard data.");
      } finally {
        if (!alive) return;
        setLoadingData(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [team, day]);

  // ---- derived KPIs ----
  const todaySales = sales?.shift?.total ?? null;

  const onShiftCount = useMemo(() => {
    // count unique names across all shifts/pages (users + covers)
    if (!attendance?.data) return null;

    const names = new Set<string>();
    for (const shift of Object.keys(attendance.data)) {
      const pages = attendance.data[shift] || {};
      for (const pk of Object.keys(pages)) {
        const item = pages[pk];
        (item?.users ?? []).forEach((u) => names.add(u.name));
        (item?.covers ?? []).forEach((u) => names.add(u.name));
      }
    }
    return names.size;
  }, [attendance]);

  const redPagesCount = useMemo(() => {
    // If sales API includes goals map, compute "red" pages (<31%)
    const byPage = sales?.shift?.byPage ?? [];
    const goals = sales?.shift?.goals ?? {};

    let red = 0;
    for (const r of byPage) {
      const goal = Number(goals[r.page] ?? 0);
      if (goal <= 0) continue;
      const pct = (Number(r.total) / goal) * 100;
      if (pct < 31) red += 1;
    }
    return red;
  }, [sales]);

  return (
    <div className="container">
      <div className="nav">
        <div className="row" style={{ gap: 10 }}>
          <span className="badge">🍓 Tasty Media</span>
          <span className="badge">Dashboard</span>
          <span className="badge" style={{ opacity: 0.9 }}>
            {loadingData ? "Refreshing…" : "Live"}
          </span>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <span className="badge">{session.user?.email}</span>
          <button className="btn" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>

      <div className="spacer" />

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 className="h1">Overview</h1>
            <p className="h2">Sales + attendance monitoring</p>
          </div>

          <div className="row" style={{ gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="small" style={{ opacity: 0.8 }}>
                Team
              </span>
              <select
                className="btn"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                style={{ padding: "10px 12px" }}
              >
                <option>Team 1</option>
                <option>Team 2</option>
                <option>Team 3</option>
              </select>
            </div>

            <div className="row" style={{ gap: 8 }}>
              <span className="small" style={{ opacity: 0.8 }}>
                Attendance day
              </span>
              <input
                className="btn"
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                style={{ padding: "10px 12px" }}
              />
            </div>
          </div>
        </div>

        {errMsg ? (
          <>
            <div className="spacer" />
            <div className="card" style={{ borderColor: "rgba(255,0,0,0.25)" }}>
              <p className="h2">Data error</p>
              <p className="small" style={{ whiteSpace: "pre-wrap" }}>
                {errMsg}
              </p>
              <div className="spacer" />
              <p className="small">
                If you haven’t created the API routes yet, create:
                <br />
                <span className="badge">/api/dashboard/sales</span>{" "}
                <span className="badge">/api/dashboard/attendance</span>
              </p>
            </div>
          </>
        ) : null}

        <div className="spacer" />

        <div className="row">
          <div className="kpi" style={{ flex: 1 }}>
            <p className="kpiTitle">Shift Sales</p>
            <p className="kpiValue">
              {todaySales == null ? "—" : `$${Number(todaySales).toFixed(2)}`}
            </p>
            <p className="small">
              {sales?.team ? `Team: ${sales.team}` : "Reading Postgres sales…"}
            </p>
          </div>

          <div className="kpi" style={{ flex: 1 }}>
            <p className="kpiTitle">On shift</p>
            <p className="kpiValue">{onShiftCount == null ? "—" : onShiftCount}</p>
            <p className="small">Unique users clocked in (incl. covers).</p>
          </div>

          <div className="kpi" style={{ flex: 1 }}>
            <p className="kpiTitle">Red pages</p>
            <p className="kpiValue">{Number.isFinite(redPagesCount) ? redPagesCount : "—"}</p>
            <p className="small">Pages below 31% of shift goal.</p>
          </div>
        </div>

        <div className="hr" />

        <div className="row" style={{ gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div className="card" style={{ flex: 1, minWidth: 320 }}>
            <p className="h2">Top pages (this shift)</p>
            <div className="spacer" />

            {(sales?.shift?.byPage ?? []).length === 0 ? (
              <p className="small" style={{ opacity: 0.8 }}>
                No sales yet for this shift.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {sales!.shift!.byPage.slice(0, 8).map((r) => (
                  <div key={r.page} className="row" style={{ justifyContent: "space-between", gap: 10 }}>
                    <span className="small">{r.page}</span>
                    <span className="badge">${Number(r.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ flex: 1, minWidth: 320 }}>
            <p className="h2">Attendance summary</p>
            <div className="spacer" />

            {!attendance?.data ? (
              <p className="small" style={{ opacity: 0.8 }}>
                No attendance data loaded.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {["prime", "midshift", "closing"].map((shift) => {
                  const pages = attendance.data?.[shift] ?? {};
                  const pageCount = Object.keys(pages).length;

                  let lateCount = 0;
                  for (const pk of Object.keys(pages)) lateCount += (pages[pk].late ?? []).length;

                  return (
                    <div key={shift} className="row" style={{ justifyContent: "space-between", gap: 10 }}>
                      <span className="small" style={{ textTransform: "capitalize" }}>
                        {shift}
                      </span>
                      <div className="row" style={{ gap: 8 }}>
                        <span className="badge">{pageCount} pages</span>
                        <span className="badge">{lateCount} late</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="spacer" />
            <a className="btn btnPrimary" href="/dashboard/attendance">
              Open attendance →
            </a>
          </div>
        </div>

        <div className="spacer" />

        <p className="small" style={{ opacity: 0.75 }}>
          This page reads data using server API routes (no bot changes).
        </p>
      </div>
    </div>
  );
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
