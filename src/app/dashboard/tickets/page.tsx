"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type TicketRow = {
  id: string;
  title: string;
  description: string;
  created_by: string;
  role: string;
  status: string; // open | answered | closed
  kind?: string;  // ticket | announcement
  pinned?: boolean;
  created_at: string;
};

type Counts = { total: number; open: number; answered: number; closed: number };

const card: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,.10)",
  background: "rgba(255,255,255,.03)",
  borderRadius: 18,
  padding: 14,
};

const pill = (active = false): React.CSSProperties => ({
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 850,
  border: active ? "1px solid rgba(120,120,255,.55)" : "1px solid rgba(255,255,255,.10)",
  background: active ? "rgba(120,120,255,.12)" : "rgba(255,255,255,.04)",
  opacity: 0.95,
});

const mini = (tone: "open" | "answered" | "closed" | "announcement") => {
  const map: any = {
    open: { bg: "rgba(77,163,255,0.14)", bd: "rgba(77,163,255,0.35)", tx: "#A9D6FF" },
    answered: { bg: "rgba(46,229,157,0.14)", bd: "rgba(46,229,157,0.35)", tx: "#2EE59D" },
    closed: { bg: "rgba(255,209,102,0.14)", bd: "rgba(255,209,102,0.35)", tx: "#FFD166" },
    announcement: { bg: "rgba(109,40,217,0.16)", bd: "rgba(109,40,217,0.35)", tx: "#D7C2FF" },
  };
  const t = map[tone];
  return {
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 900,
    border: `1px solid ${t.bd}`,
    background: t.bg,
    color: t.tx,
    whiteSpace: "nowrap" as const,
  };
};

async function safeJson(url: string, init?: RequestInit) {
  const r = await fetch(url, { cache: "no-store" as any, ...(init || {}) });
  const text = await r.text();
  try {
    const json = JSON.parse(text);
    if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
    return json;
  } catch {
    throw new Error(text || `HTTP ${r.status}`);
  }
}

function getLastSeenAnnouncementId() {
  try {
    return localStorage.getItem("last_seen_announcement_id") || "";
  } catch {
    return "";
  }
}

function setLastSeenAnnouncementId(id: string) {
  try {
    localStorage.setItem("last_seen_announcement_id", id);
  } catch {}
}

export default function TicketsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const s: any = session;
  const user = s?.user?.email || "Unknown";
  const role = String(s?.role || "user");
  const isAdmin = role.toLowerCase() === "admin";

  const [tab, setTab] = React.useState<"open" | "answered" | "closed" | "all">("open");
  const [rows, setRows] = React.useState<TicketRow[]>([]);
  const [counts, setCounts] = React.useState<Counts>({ total: 0, open: 0, answered: 0, closed: 0 });
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  // Create modal
  const [showCreate, setShowCreate] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [asAnnouncement, setAsAnnouncement] = React.useState(false);
  const [pinAnnouncement, setPinAnnouncement] = React.useState(true);

  // ✅ Toast state for announcements
  const [toast, setToast] = React.useState<null | {
    id: string;
    title: string;
    description: string;
  }>(null);

  async function load(which = tab, opts?: { silent?: boolean }) {
    if (!opts?.silent) setLoading(true);
    setErr("");

    try {
      const data = await safeJson(`/api/tickets?status=${which}&kind=all&t=${Date.now()}`);
      const list = Array.isArray(data?.rows) ? data.rows : [];
      setRows(list);

      setCounts({
        total: Number(data?.counts?.total || 0),
        open: Number(data?.counts?.open || 0),
        answered: Number(data?.counts?.answered || 0),
        closed: Number(data?.counts?.closed || 0),
      });

      // ✅ Detect newest announcement and show toast if new
      const announcements = list
        .filter((r: TicketRow) => (r.kind || "ticket") === "announcement")
        .sort((a: TicketRow, b: TicketRow) => +new Date(b.created_at) - +new Date(a.created_at));

      if (announcements.length) {
        const newest = announcements[0];
        const lastSeen = getLastSeenAnnouncementId();

        // only toast if this announcement hasn't been seen
        if (newest.id && newest.id !== lastSeen) {
          setToast({
            id: newest.id,
            title: newest.title,
            description: newest.description,
          });
        }
      }
    } catch (e: any) {
      setErr(e.message || "Failed to load tickets");
      setRows([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  // initial load + tab load
  React.useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ✅ Poll every 10 seconds (silent refresh) so announcements “pop up” quickly
  React.useEffect(() => {
    const t = setInterval(() => {
      load(tab, { silent: true });
    }, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const announcements = rows.filter((r) => (r.kind || "ticket") === "announcement");
  const ticketsOnly = rows.filter((r) => (r.kind || "ticket") !== "announcement");

  async function createTicket() {
    if (!title.trim() || !desc.trim()) return;

    try {
      await safeJson("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim(),
          user,
          role,
          kind: asAnnouncement ? "announcement" : "ticket",
          pinned: asAnnouncement ? pinAnnouncement : false,
        }),
      });

      setShowCreate(false);
      setTitle("");
      setDesc("");
      setAsAnnouncement(false);
      setPinAnnouncement(true);

      await load(tab);
    } catch (e: any) {
      setErr(e.message || "Failed to create");
    }
  }

  function dismissToast() {
    if (toast?.id) setLastSeenAnnouncementId(toast.id);
    setToast(null);
  }

  function viewToast() {
    // mark as seen then scroll to announcements (or keep it simple: just dismiss)
    if (toast?.id) setLastSeenAnnouncementId(toast.id);
    setToast(null);
    // scroll top area where announcements are shown
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* ✅ Announcement Toast */}
      {toast ? (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 9999,
            width: 420,
            maxWidth: "calc(100vw - 36px)",
            borderRadius: 18,
            padding: 14,
            border: "1px solid rgba(109,40,217,0.45)",
            background: "rgba(15,10,35,0.92)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={mini("announcement")}>NEW ANNOUNCEMENT</span>
              <span style={{ opacity: 0.75, fontSize: 12 }}>Just now</span>
            </div>
            <button className="btn" onClick={dismissToast}>✕</button>
          </div>

          <div style={{ marginTop: 10, fontWeight: 950 }}>{toast.title}</div>
          <div style={{ marginTop: 6, opacity: 0.85, fontSize: 13, lineHeight: 1.5 }}>
            {toast.description}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
            <button className="btn" onClick={dismissToast}>Dismiss</button>
            <button className="btn" onClick={viewToast}>View</button>
          </div>
        </div>
      ) : null}

      {/* Sticky header */}
      <div style={{ ...card, position: "sticky", top: 10, zIndex: 5, backdropFilter: "blur(10px)" as any }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0 }}>Ticket System</h1>
            <div style={{ opacity: 0.75, fontSize: 13, marginTop: 6 }}>
              Ask questions here so managers + coaches have one source of truth.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn" onClick={() => setShowCreate(true)}>Create</button>
            <button className="btn" onClick={() => load(tab)} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn" style={pill(tab === "open") as any} onClick={() => setTab("open")}>
            Open <span style={{ opacity: 0.8 }}>({counts.open})</span>
          </button>
          <button className="btn" style={pill(tab === "answered") as any} onClick={() => setTab("answered")}>
            Answered <span style={{ opacity: 0.8 }}>({counts.answered})</span>
          </button>
          <button className="btn" style={pill(tab === "closed") as any} onClick={() => setTab("closed")}>
            Closed <span style={{ opacity: 0.8 }}>({counts.closed})</span>
          </button>
          <button className="btn" style={pill(tab === "all") as any} onClick={() => setTab("all")}>
            All <span style={{ opacity: 0.8 }}>({counts.total})</span>
          </button>
        </div>

        {err ? (
          <div style={{ marginTop: 12, ...card, borderColor: "rgba(255,80,80,.35)", background: "rgba(255,80,80,.06)" }}>
            <strong>Error</strong>
            <div style={{ opacity: 0.85, marginTop: 6, fontSize: 13 }}>{err}</div>
          </div>
        ) : null}
      </div>

      {/* Announcements always on top */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={mini("announcement")}>ANNOUNCEMENTS</span>
            <span style={{ opacity: 0.75, fontSize: 13 }}>Shows immediately for everyone.</span>
          </div>

          {isAdmin ? (
            <button
              className="btn"
              onClick={() => {
                setShowCreate(true);
                setAsAnnouncement(true);
                setPinAnnouncement(true);
              }}
            >
              + New Announcement
            </button>
          ) : null}
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {announcements.length === 0 ? (
            <div style={{ opacity: 0.75, fontSize: 13 }}>No announcements yet.</div>
          ) : (
            announcements.slice(0, 3).map((a) => (
              <div key={a.id} style={{ ...card, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {a.pinned ? <span style={mini("announcement")}>PINNED</span> : <span style={mini("announcement")}>UPDATE</span>}
                    <span style={{ opacity: 0.75, fontSize: 12 }}>{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontWeight: 900 }}>{a.title}</div>
                <div style={{ marginTop: 6, opacity: 0.82, fontSize: 13, lineHeight: 1.5 }}>{a.description}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tickets list */}
      <div style={{ display: "grid", gap: 10 }}>
        {loading ? (
          <div style={card}>Loading…</div>
        ) : ticketsOnly.length === 0 ? (
          <div style={card}>No tickets found for this tab.</div>
        ) : (
          ticketsOnly.map((t) => {
            const st = String(t.status || "open").toLowerCase() as any;
            return (
              <div key={t.id} style={{ ...card, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 260 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={mini(st)}>{st.toUpperCase()}</span>
                    <span style={pill(false)}>{t.role}</span>
                    <span style={pill(false)}>{t.created_by}</span>
                    <span style={{ opacity: 0.65, fontSize: 12 }}>{new Date(t.created_at).toLocaleString()}</span>
                  </div>

                  <div style={{ marginTop: 10, fontWeight: 950, fontSize: 16 }}>{t.title}</div>
                  <div style={{ marginTop: 6, opacity: 0.80, fontSize: 13, lineHeight: 1.5 }}>
                    {t.description}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center" }}>
                  <button className="btn" onClick={() => router.push(`/dashboard/tickets/${t.id}`)}>
                    Open Thread →
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create modal */}
      {showCreate ? (
        <div style={{ ...card }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 950 }}>
              {asAnnouncement ? "New Announcement" : "Create Ticket"}
            </div>
            <button className="btn" onClick={() => setShowCreate(false)}>Close</button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={asAnnouncement ? "Announcement title (example: No scamming vidcall)" : "Ticket title"}
              style={{
                width: "100%",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(0,0,0,.15)",
                color: "inherit",
                padding: "10px 12px",
                outline: "none",
              }}
            />

            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={asAnnouncement ? "Announcement details…" : "Describe the question…"}
              style={{
                width: "100%",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(0,0,0,.15)",
                color: "inherit",
                padding: "10px 12px",
                outline: "none",
                minHeight: 120,
                resize: "vertical",
              }}
            />

            {isAdmin ? (
              <label style={{ display: "flex", gap: 10, alignItems: "center", opacity: 0.9 }}>
                <input
                  type="checkbox"
                  checked={asAnnouncement}
                  onChange={(e) => setAsAnnouncement(e.target.checked)}
                />
                Post as Announcement (shows at top)
              </label>
            ) : null}

            {isAdmin && asAnnouncement ? (
              <label style={{ display: "flex", gap: 10, alignItems: "center", opacity: 0.9 }}>
                <input
                  type="checkbox"
                  checked={pinAnnouncement}
                  onChange={(e) => setPinAnnouncement(e.target.checked)}
                />
                Pin announcement (always top)
              </label>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn" onClick={createTicket}>
                {asAnnouncement ? "Post Announcement" : "Create Ticket"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}