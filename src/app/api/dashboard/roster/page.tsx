"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pages, setPages] = useState<TeamPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [newTeamName, setNewTeamName] = useState("");
  const [pageKey, setPageKey] = useState("");
  const [pageLabel, setPageLabel] = useState("");

  const selectedTeam = useMemo(() => teams.find(t => t.id === selectedId) || null, [teams, selectedId]);

  async function loadTeams() {
    const t = await safeJson("/api/dashboard/roster/teams");
    setTeams(t.teams || []);
    if (!selectedId && (t.teams?.length || 0) > 0) setSelectedId(t.teams[0].id);
  }

  async function loadPages(teamId: number) {
    const p = await safeJson(`/api/dashboard/roster/team/${teamId}/pages`);
    setPages(p.pages || []);
  }

  useEffect(() => {
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
  }, []);

  useEffect(() => {
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
  }, [selectedId]);

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
      await safeJson(`/api/dashboard/roster/team/${selectedId}/pages?pageKey=${encodeURIComponent(k)}`, {
        method: "DELETE",
      });
      await loadPages(selectedId);
    } catch (e: any) {
      setErr(e.message || "Failed to remove page");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>Roster</h1>
          <p className="small">Create teams and add pages so attendance tracking is accurate per team.</p>
        </div>
        <span className="badge">{loading ? "Saving…" : "Ready"}</span>
      </div>

      {err ? (
        <>
          <div className="spacer" />
          <div className="card" style={{ border: "1px solid rgba(255,80,80,.35)" }}>
            <p className="small" style={{ color: "rgba(255,180,180,.95)" }}>Error: {err}</p>
          </div>
        </>
      ) : null}

      <div className="spacer" />

      <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
        <div className="card" style={{ padding: 14, flex: 1, minWidth: 280 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Teams</div>

          <div className="row" style={{ gap: 10 }}>
            <input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="New team name (e.g. Black)"
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.10)",
                color: "white",
                outline: "none",
              }}
            />
            <button className="btn btnPrimary" onClick={createTeam} disabled={!newTeamName.trim()}>
              Create
            </button>
          </div>

          <div className="spacer" />

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
                  border: selectedId === t.id ? "1px solid rgba(120,120,255,.8)" : "1px solid rgba(255,255,255,.08)",
                }}
              >
                <span style={{ fontWeight: 800 }}>{t.name}</span>
                <span className="badge">#{t.id}</span>
              </button>
            ))}
            {teams.length === 0 ? <p className="small">No teams yet. Create one.</p> : null}
          </div>
        </div>

        <div className="card" style={{ padding: 14, flex: 2, minWidth: 320 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800 }}>Pages in Team</div>
            <span className="badge">{selectedTeam ? selectedTeam.name : "Select a team"}</span>
          </div>

          <div className="spacer" />

          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <input
              value={pageLabel}
              onChange={(e) => setPageLabel(e.target.value)}
              placeholder="Page label (e.g. Alanna Paid)"
              style={{
                flex: 2,
                minWidth: 220,
                padding: 12,
                borderRadius: 12,
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.10)",
                color: "white",
                outline: "none",
              }}
            />
            <input
              value={pageKey}
              onChange={(e) => setPageKey(e.target.value)}
              placeholder="pageKey (e.g. alannapaid)"
              style={{
                flex: 1,
                minWidth: 180,
                padding: 12,
                borderRadius: 12,
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.10)",
                color: "white",
                outline: "none",
              }}
            />
            <button className="btn btnPrimary" onClick={addPage} disabled={!selectedId || !pageKey.trim() || !pageLabel.trim()}>
              Add
            </button>
          </div>

          <div className="spacer" />
          <div className="hr" />

          {pages.length === 0 ? (
            <p className="small">No pages in this team yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pages.map((p) => (
                <div key={p.pageKey} className="card" style={{ padding: 14 }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{p.pageLabel}</div>
                      <div className="small" style={{ opacity: 0.75 }}>#{p.pageKey}</div>
                    </div>
                    <button className="btn" onClick={() => removePage(p.pageKey)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
