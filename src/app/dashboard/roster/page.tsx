"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { RAW_PAGES } from "@/lib/expectedPages";

type Team = { id: number; name: string };
type TeamPage = { pageKey: string; pageLabel: string };

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

export default function RosterPage() {
  const { data: session, status: sessionStatus } = useSession();

  const role = String((session as any)?.role || "user").toLowerCase();
  const approval = String((session as any)?.status || "").toLowerCase(); // "approved" | "pending" | ...

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pages, setPages] = useState<TeamPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [newTeamName, setNewTeamName] = useState("");
  const [pageKey, setPageKey] = useState("");
  const [pageLabel, setPageLabel] = useState("");

  // ✅ Quick Add state
  const [qaOpen, setQaOpen] = useState(true);
  const [qaSearch, setQaSearch] = useState("");
  const [qaSelected, setQaSelected] = useState<Record<string, boolean>>({});

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedId) || null,
    [teams, selectedId]
  );

  const rawList = useMemo(() => {
    return Object.entries(RAW_PAGES).map(([k, v]) => ({
      pageKey: String(k).toLowerCase(),
      pageLabel: String(v),
    }));
  }, []);

  const filteredRawList = useMemo(() => {
    const q = qaSearch.trim().toLowerCase();
    if (!q) return rawList;
    return rawList.filter(
      (x) => x.pageKey.includes(q) || x.pageLabel.toLowerCase().includes(q)
    );
  }, [qaSearch, rawList]);

  async function loadTeams() {
    const t = await safeJson("/api/dashboard/roster/teams");
    const nextTeams = (t.teams || []) as Team[];
    setTeams(nextTeams);

    // keep selection stable; otherwise pick first
    if (!selectedId && nextTeams.length > 0) setSelectedId(nextTeams[0].id);
  }

  async function loadPages(teamId: number) {
    const p = await safeJson(`/api/dashboard/roster/team/${teamId}/pages`);
    setPages(p.pages || []);
  }

  // ✅ Allow ALL approved users to use roster (admin + user)
  useEffect(() => {
    if (!session) return;
    if (approval !== "approved") return;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        await loadTeams();
      } catch (e: any) {
        setErr(e.message || "Failed to load roster");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, approval]);

  useEffect(() => {
    if (!session) return;
    if (approval !== "approved") return;
    if (!selectedId) return;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        await loadPages(selectedId);
      } catch (e: any) {
        setErr(e.message || "Failed to load team pages");
      } finally {
        setLoading(false);
      }
    })();
  }, [session, approval, selectedId]);

  async function createTeam() {
    const name = newTeamName.trim();
    if (!name) return;

    setLoading(true);
    setErr("");
    try {
      await safeJson("/api/dashboard/roster/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setNewTeamName("");
      await loadTeams();
    } catch (e: any) {
      setErr(e.message || "Failed to create team");
    } finally {
      setLoading(false);
    }
  }

  async function addPage() {
    if (!selectedId) return;

    const k = pageKey.trim().toLowerCase();
    const l = pageLabel.trim();
    if (!k || !l) return;

    setLoading(true);
    setErr("");
    try {
      await safeJson(`/api/dashboard/roster/team/${selectedId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey: k, pageLabel: l }),
      });
      setPageKey("");
      setPageLabel("");
      await loadPages(selectedId);
    } catch (e: any) {
      setErr(e.message || "Failed to add page");
    } finally {
      setLoading(false);
    }
  }

  async function removePage(k: string) {
    if (!selectedId) return;

    setLoading(true);
    setErr("");
    try {
      await safeJson(
        `/api/dashboard/roster/team/${selectedId}/pages?pageKey=${encodeURIComponent(k)}`,
        { method: "DELETE" }
      );
      await loadPages(selectedId);
    } catch (e: any) {
      setErr(e.message || "Failed to remove page");
    } finally {
      setLoading(false);
    }
  }

  function toggleQa(key: string) {
    setQaSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function selectAllVisible() {
    const next: Record<string, boolean> = { ...qaSelected };
    for (const x of filteredRawList) next[x.pageKey] = true;
    setQaSelected(next);
  }

  function clearSelection() {
    setQaSelected({});
  }

  const selectedCount = useMemo(
    () => Object.values(qaSelected).filter(Boolean).length,
    [qaSelected]
  );

  async function bulkAddSelected() {
    if (!selectedId) return;
    const pagesToAdd = rawList.filter((x) => qaSelected[x.pageKey]);
    if (!pagesToAdd.length) return;

    setLoading(true);
    setErr("");
    try {
      await safeJson(`/api/dashboard/roster/team/${selectedId}/pages/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: pagesToAdd }),
      });
      clearSelection();
      await loadPages(selectedId);
    } catch (e: any) {
      setErr(e.message || "Failed to bulk add pages");
    } finally {
      setLoading(false);
    }
  }

  // ✅ NEW: Delete all members/pages (FAST: one endpoint)
  async function deleteAllMembers() {
    if (!selectedId) return;
    if (pages.length === 0) return;

    const ok = confirm(
      `Delete ALL members/pages from "${selectedTeam?.name || "this team"}"?`
    );
    if (!ok) return;

    setLoading(true);
    setErr("");
    try {
      await safeJson(`/api/dashboard/roster/team/${selectedId}/pages/clear`, {
        method: "DELETE",
      });
      await loadPages(selectedId);
    } catch (e: any) {
      setErr(e.message || "Failed to delete all members");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Professional gating
  if (sessionStatus === "loading") {
    return (
      <div className="card">
        <h1 className="h1">Roster</h1>
        <p className="small">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="card">
        <h1 className="h1">Roster</h1>
        <p className="small">Please sign in to continue.</p>
      </div>
    );
  }

  if (approval !== "approved") {
    return (
      <div className="card">
        <h1 className="h1">Roster</h1>
        <p className="small">Awaiting approval.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}
      >
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>
            Roster
          </h1>
          <p className="small">
            Create teams and add pages. Attendance will track only pages inside the selected team.
          </p>
        </div>
        <span className="badge">{loading ? "Saving…" : "Ready"}</span>
      </div>

      {err ? (
        <>
          <div className="spacer" />
          <div className="errorBox">
            <p className="small" style={{ color: "rgba(255,180,180,.95)" }}>
              Error: {err}
            </p>
          </div>
        </>
      ) : null}

      <div className="spacer" />

      <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* LEFT: Teams */}
        <div className="card" style={{ padding: 14, flex: 1, minWidth: 280 }}>
          {/* Sticky Create Team */}
          <div
            style={{
              position: "sticky",
              top: 10,
              zIndex: 5,
              background: "rgba(0,0,0,.25)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,.10)",
              borderRadius: 14,
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Teams</div>

            <div className="row" style={{ gap: 10 }}>
              <input
                className="input"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="New team name (Black, Cobra, ...)"
              />
              <button
                className="btn btnPrimary"
                onClick={createTeam}
                disabled={!newTeamName.trim() || loading}
              >
                Create
              </button>
            </div>
          </div>

          <div className="spacer" />

          {/* Scroll only team list */}
          <div style={{ maxHeight: 520, overflow: "auto", paddingRight: 4 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {teams.map((t) => (
                <button
                  key={t.id}
                  className="btn"
                  onClick={() => setSelectedId(t.id)}
                  style={{
                    justifyContent: "space-between",
                    borderRadius: 14,
                    padding: "12px 14px",
                    opacity: selectedId === t.id ? 1 : 0.8,
                    border:
                      selectedId === t.id
                        ? "1px solid rgba(120,120,255,.8)"
                        : "1px solid rgba(255,255,255,.08)",
                  }}
                >
                  <span style={{ fontWeight: 800 }}>{t.name}</span>
                  <span className="badge">#{t.id}</span>
                </button>
              ))}
              {teams.length === 0 ? <p className="small">No teams yet. Create one.</p> : null}
            </div>
          </div>
        </div>

        {/* RIGHT: Pages */}
        <div className="card" style={{ padding: 14, flex: 2, minWidth: 320 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Pages in Team</div>

            <div className="row" style={{ gap: 10 }}>
              <span className="badge">{selectedTeam ? selectedTeam.name : "Select a team"}</span>

              <button
                className="btn"
                onClick={deleteAllMembers}
                disabled={!selectedId || pages.length === 0 || loading}
                style={{
                  border: "1px solid var(--danger-border)",
                  background: "var(--danger)",
                }}
              >
                Delete all members
              </button>
            </div>
          </div>

          <div className="spacer" />

          {/* Quick Add Panel */}
          <div className="cardSoft">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Quick Add</div>
              <button className="btn" onClick={() => setQaOpen((v) => !v)}>
                {qaOpen ? "Hide" : "Show"}
              </button>
            </div>

            {qaOpen ? (
              <>
                <div className="spacer" />

                <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                  <input
                    className="input"
                    value={qaSearch}
                    onChange={(e) => setQaSearch(e.target.value)}
                    placeholder="Search RAW_PAGES (key or label)…"
                    style={{ minWidth: 240 }}
                  />

                  <button className="btn" onClick={selectAllVisible}>
                    Select visible
                  </button>
                  <button className="btn" onClick={clearSelection}>
                    Clear
                  </button>
                  <button
                    className="btn btnPrimary"
                    onClick={bulkAddSelected}
                    disabled={!selectedId || selectedCount === 0 || loading}
                  >
                    Add selected ({selectedCount})
                  </button>
                </div>

                <div className="hr" />

                <div style={{ maxHeight: 380, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                  {filteredRawList.map((x) => (
                    <button
                      key={x.pageKey}
                      className="btn"
                      onClick={() => toggleQa(x.pageKey)}
                      style={{
                        justifyContent: "space-between",
                        borderRadius: 14,
                        padding: "12px 14px",
                        border: qaSelected[x.pageKey]
                          ? "1px solid rgba(120,120,255,.8)"
                          : "1px solid rgba(255,255,255,.08)",
                        opacity: qaSelected[x.pageKey] ? 1 : 0.85,
                        textAlign: "left",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800 }}>{x.pageLabel}</div>
                        <div className="small" style={{ opacity: 0.75 }}>
                          #{x.pageKey}
                        </div>
                      </div>
                      <span className="badge">{qaSelected[x.pageKey] ? "Selected" : "Pick"}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div className="spacer" />

          {/* Manual Add */}
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <input
              className="input"
              value={pageLabel}
              onChange={(e) => setPageLabel(e.target.value)}
              placeholder="Page label (e.g. Alanna Paid)"
              style={{ flex: 2, minWidth: 220 }}
            />
            <input
              className="input"
              value={pageKey}
              onChange={(e) => setPageKey(e.target.value)}
              placeholder="pageKey (e.g. alannapaid)"
              style={{ flex: 1, minWidth: 180 }}
            />
            <button
              className="btn btnPrimary"
              onClick={addPage}
              disabled={!selectedId || !pageKey.trim() || !pageLabel.trim() || loading}
            >
              Add
            </button>
          </div>

          <div className="hr" />

          {pages.length === 0 ? (
            <p className="small">No pages in this team yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pages.map((p) => (
                <div key={p.pageKey} className="cardSoft">
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{p.pageLabel}</div>
                      <div className="small" style={{ opacity: 0.75 }}>
                        #{p.pageKey}
                      </div>
                    </div>
                    <button className="btn" onClick={() => removePage(p.pageKey)} disabled={loading}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="spacer" />
          <p className="small" style={{ opacity: 0.5 }}>
            Role: {role} • Status: {approval}
          </p>
        </div>
      </div>
    </div>
  );
}
