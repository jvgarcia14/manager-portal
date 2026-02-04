"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type Team = { id: number; name: string };
type ExpectedPage = { pageKey: string; pageLabel: string };

type AttRow = {
  pageKey: string;
  shift: string;
  clockedIn: number;
  covers: number;
};

async function safeJson(url: string, init?: RequestInit) {
  const r = await fetch(url, { cache: "no-store", ...(init || {}) });
  const text = await r.text();
  try {
    const json = JSON.parse(text);
    if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
    return json;
  } catch {
    throw new Error(text || `HTTP ${r.status}`);
  }
}

const TABS = ["all", "prime", "midshift", "closing"] as const;
type Tab = (typeof TABS)[number];

export default function AttendancePage() {
  const { data: session, status } = useSession();
  const s: any = session;
  const userStatus = s?.status;
  const role = s?.role || "user";

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const [attendanceDay, setAttendanceDay] = useState<string>("");
  const [attRowsAll, setAttRowsAll] = useState<AttRow[]>([]);
  const [expectedPages, setExpectedPages] = useState<ExpectedPage[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Load teams
  useEffect(() => {
    if (!session || userStatus !== "approved") return;
    (async () => {
      try {
        const t = await safeJson("/api/dashboard/roster/teams");
        setTeams(t.teams || []);
        if (!teamId && (t.teams?.length || 0) > 0) setTeamId(t.teams[0].id);
      } catch (e: any) {
        setErr(e.message || "Failed to load teams");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, userStatus]);

  // Load expected pages for selected team
  useEffect(() => {
    if (!session || userStatus !== "approved") return;
    if (!teamId) return;
    (async () => {
      try {
        const p = await safeJson(`/api/dashboard/roster/team/${teamId}/pages`);
        setExpectedPages(p.pages || []);
      } catch (e: any) {
        setErr(e.message || "Failed to load team pages");
      }
    })();
  }, [session, userStatus, teamId]);

  // Load attendance (global rows) + summary day
  useEffect(() => {
    if (!session || userStatus !== "approved") return;

    setLoading(true);
    setErr("");

    (async () => {
      try {
        const [sum, pages] = await Promise.all([
          safeJson("/api/dashboard/attendance/summary"),
          safeJson("/api/dashboard/attendance/pages"),
        ]);

        setAttendanceDay(String(sum?.attendanceDay || ""));
        setAttRowsAll(pages?.rows || []);
      } catch (e: any) {
        setErr(e.message || "Failed to load attendance data");
      } finally {
        setLoading(false);
      }
    })();
  }, [session, userStatus]);

  // UI states (match your style)
  if (status === "loading") {
    return (
      <div className="card">
        <p className="small">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="card">
        <h1 className="h1">Not signed in</h1>
        <p className="small">Go to /intro and sign in with Google.</p>
      </div>
    );
  }

  if (userStatus !== "approved") {
    return (
      <div className="card">
        <h1 className="h1">Awaiting approval</h1>
        <p className="small">Your account is pending admin approval.</p>
      </div>
    );
  }

  const selectedTeam = teams.find((t) => t.id === teamId) || null;

  // Build lookup of clock-ins from API rows
  const clockedMap = useMemo(() => {
    const m = new Map<string, { clockedIn: number; covers: number; shift: string }>();
    for (const r of attRowsAll) {
      m.set(String(r.pageKey).toLowerCase(), {
        clockedIn: Number(r.clockedIn || 0),
        covers: Number(r.covers || 0),
        shift: String(r.shift || ""),
      });
    }
    return m;
  }, [attRowsAll]);

  // Table rows = expected pages (team roster) + their status from clockins
  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    const rows = (expectedPages || []).map((p) => {
      const key = String(p.pageKey).toLowerCase();
      const hit = clockedMap.get(key);

      const clockedIn = hit?.clockedIn || 0;
      const covers = hit?.covers || 0;
      const shift = hit?.shift || "";

      const isMissing = clockedIn === 0 && covers === 0;

      // tab filter
      const tabOk = tab === "all" ? true : shift === tab;

      // search filter
      const searchOk = !q
        ? true
        : key.includes(q) || String(p.pageLabel).toLowerCase().includes(q);

      return {
        pageKey: key,
        pageLabel: p.pageLabel,
        shift,
        clockedIn,
        covers,
        isMissing,
        tabOk,
        searchOk,
      };
    });

    return rows
      .filter((r) => r.tabOk && r.searchOk)
      .sort((a, b) => {
        // Missing first
        if (a.isMissing !== b.isMissing) return a.isMissing ? -1 : 1;
        // then label
        return String(a.pageLabel).localeCompare(String(b.pageLabel));
      });
  }, [expectedPages, clockedMap, tab, search]);

  // Stats
  const expectedCount = expectedPages.length;
  const clockedCount = useMemo(() => {
    // count expected pages that are clocked (users or covers)
    let n = 0;
    for (const p of expectedPages) {
      const hit = clockedMap.get(String(p.pageKey).toLowerCase());
      if ((hit?.clockedIn || 0) > 0 || (hit?.covers || 0) > 0) n++;
    }
    return n;
  }, [expectedPages, clockedMap]);

  const missingCount = Math.max(0, expectedCount - clockedCount);

  const pill = (active: boolean) => ({
    borderRadius: 999,
    padding: "10px 14px",
    opacity: active ? 1 : 0.75,
    border: active ? "1px solid rgba(120,120,255,.8)" : "1px solid rgba(255,255,255,.08)",
    background: "transparent",
  });

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>
            Attendance Today
          </h1>
          <p className="small">
            Attendance day starts at <b>6:00 AM PH</b>. Select a team to track only its expected pages.
          </p>
        </div>
        <span className="badge">{loading ? "Refreshing…" : "Live"}</span>
      </div>

      <div className="spacer" />

      {/* Team pills */}
      <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
        {teams.map((t) => (
          <button
            key={t.id}
            className="btn"
            onClick={() => setTeamId(t.id)}
            style={pill(teamId === t.id) as any}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="spacer" />

      {/* Tabs */}
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        {TABS.map((k) => (
          <button key={k} className="btn" onClick={() => setTab(k)} style={pill(tab === k) as any}>
            {k === "all" ? "All" : k[0].toUpperCase() + k.slice(1)}
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
          </div>
        </>
      ) : null}

      <div className="spacer" />

      {/* Summary badges */}
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <span className="badge">
          Team: {selectedTeam ? selectedTeam.name : "—"}
        </span>
        <span className="badge">Attendance day: {attendanceDay || "—"}</span>
        <span className="badge">Expected: {expectedCount}</span>
        <span className="badge">Clocked: {clockedCount}</span>
        <span className="badge">Missing: {missingCount}</span>
      </div>

      <div className="spacer" />

      <h2 className="h2">Team Attendance Table</h2>
      <p className="small">
        This table always shows all expected pages in the selected team. Missing pages are shown first.
      </p>

      <div className="spacer" />

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search page key or label…"
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 12,
          background: "rgba(255,255,255,.06)",
          border: "1px solid rgba(255,255,255,.10)",
          color: "white",
          outline: "none",
        }}
      />

      <div className="spacer" />
      <div className="hr" />

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", opacity: 0.85 }}>
              <th style={{ padding: "10px 8px" }}>Status</th>
              <th style={{ padding: "10px 8px" }}>Page</th>
              <th style={{ padding: "10px 8px" }}>Key</th>
              <th style={{ padding: "10px 8px" }}>Shift</th>
              <th style={{ padding: "10px 8px", textAlign: "right" }}>Clocked</th>
              <th style={{ padding: "10px 8px", textAlign: "right" }}>Covers</th>
            </tr>
          </thead>

          <tbody>
            {expectedPages.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 12, opacity: 0.8 }}>
                  No pages added for this team yet. Go to <b>Roster</b> and add pages.
                </td>
              </tr>
            ) : tableRows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 12, opacity: 0.8 }}>
                  No rows match your filters.
                </td>
              </tr>
            ) : (
              tableRows.map((r) => {
                const statusLabel = r.isMissing ? "Missing" : r.covers > 0 ? "Cover" : "Clocked";
                const statusBg = r.isMissing
                  ? "rgba(255,80,80,.14)"
                  : r.covers > 0
                  ? "rgba(255,210,80,.14)"
                  : "rgba(80,255,160,.12)";

                const statusBorder = r.isMissing
                  ? "rgba(255,80,80,.35)"
                  : r.covers > 0
                  ? "rgba(255,210,80,.35)"
                  : "rgba(80,255,160,.28)";

                return (
                  <tr key={r.pageKey} style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
                    <td style={{ padding: "10px 8px" }}>
                      <span
                        className="badge"
                        style={{
                          border: `1px solid ${statusBorder}`,
                          background: statusBg,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: "10px 8px", fontWeight: 800 }}>{r.pageLabel}</td>
                    <td style={{ padding: "10px 8px", opacity: 0.8 }}>#{r.pageKey}</td>
                    <td style={{ padding: "10px 8px", opacity: 0.9 }}>
                      {r.shift || (r.isMissing ? "—" : "—")}
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "right" }}>{r.clockedIn}</td>
                    <td style={{ padding: "10px 8px", textAlign: "right" }}>{r.covers}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="spacer" />
      <div className="hr" />

      <h2 className="h2">Clocked In List (All pages)</h2>
      <p className="small">
        This list shows all clock-ins from the bot (global). Team table above is based on the selected roster.
      </p>

      <div className="spacer" />

      <div className="card" style={{ padding: 14 }}>
        <div className="row" style={{ fontWeight: 700, opacity: 0.85 }}>
          <div style={{ flex: 1 }}>Shift</div>
          <div style={{ flex: 2 }}>Page</div>
          <div style={{ width: 120, textAlign: "right" }}>Clocked</div>
          <div style={{ width: 120, textAlign: "right" }}>Covers</div>
        </div>
        <div className="hr" />
        {attRowsAll.length === 0 ? (
          <p className="small">No attendance rows found for today yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {attRowsAll.map((r, idx) => (
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
  );
}
