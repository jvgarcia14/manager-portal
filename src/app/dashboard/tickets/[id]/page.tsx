"use client";

import React from "react";
import { useSession } from "next-auth/react";

type Ticket = {
  id: string;
  title: string;
  description: string;
  created_by: string;
  role: string;
  status: string;
  created_at: string;
};

type Reply = {
  id: string;
  ticket_id: string;
  user_name: string;
  role: string;
  message: string;
  created_at: string;
};

const pill = (active = false) => ({
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  border: active ? "1px solid rgba(120,120,255,.55)" : "1px solid rgba(255,255,255,.10)",
  background: active ? "rgba(120,120,255,.12)" : "rgba(255,255,255,.04)",
  opacity: 0.95,
});

const card = {
  border: "1px solid rgba(255,255,255,.10)",
  background: "rgba(255,255,255,.03)",
  borderRadius: 18,
  padding: 14,
};

const input = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.10)",
  background: "rgba(0,0,0,.15)",
  color: "inherit",
  padding: "10px 12px",
  outline: "none",
};

const textarea = {
  ...input,
  minHeight: 110,
  resize: "vertical" as const,
};

export default function TicketThreadPage({ params }: { params: { id: string } }) {
  const ticketId = params.id;

  const { data: session } = useSession();
  const s: any = session;
  const user = s?.user?.email || "Unknown";
  const role = String(s?.role || "user");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [ticket, setTicket] = React.useState<Ticket | null>(null);
  const [replies, setReplies] = React.useState<Reply[]>([]);
  const [message, setMessage] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function loadThread() {
  setLoading(true);
  setError(null);

  try {
    const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}`, {
      cache: "no-store" as any,
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data?.error || "Failed to load thread.");
      setTicket(null);
      setReplies([]);
    } else {
      // ✅ supports BOTH API shapes:
      // A) { ticket: {...}, replies: [...] }
      // B) { ticket: { ..., replies: [...] } }
      const ticketObj = data?.ticket || null;
      const repliesArr = Array.isArray(data?.replies)
        ? data.replies
        : Array.isArray(data?.ticket?.replies)
        ? data.ticket.replies
        : [];

      setTicket(ticketObj);
      setReplies(repliesArr);
    }
  } catch {
    setError("Failed to load thread. Check API/DB.");
    setTicket(null);
    setReplies([]);
  } finally {
    setLoading(false);
  }
}

  React.useEffect(() => {
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function sendReply() {
    if (!message.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user,
          role,
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to send reply.");
        return;
      }

      setMessage("");
      await loadThread();
    } catch {
      setError("Failed to send reply. Check API/DB.");
    } finally {
      setSaving(false);
    }
  }

  async function markAnswered() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/answered`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to mark as answered.");
        return;
      }
      await loadThread();
    } catch {
      setError("Failed to mark as answered. Check API/DB.");
    } finally {
      setSaving(false);
    }
  }

  async function closeTicket() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/close`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to close ticket.");
        return;
      }
      await loadThread();
    } catch {
      setError("Failed to close ticket. Check API/DB.");
    } finally {
      setSaving(false);
    }
  }

  const status = String(ticket?.status || "open").toLowerCase();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {loading ? (
        <div style={card}>Loading thread…</div>
      ) : error ? (
        <div style={{ ...card, borderColor: "rgba(255,120,120,.30)", background: "rgba(255,120,120,.06)" }}>
          <strong style={{ display: "block", marginBottom: 6 }}>Error</strong>
          <div style={{ opacity: 0.9, fontSize: 13 }}>{error}</div>
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button className="btn" onClick={loadThread}>
              Retry
            </button>
          </div>
        </div>
      ) : !ticket ? (
        <div style={card}>Ticket not found.</div>
      ) : (
        <>
          {/* Header */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 240 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={pill(status === "open")}>{status.toUpperCase()}</span>
                  <span style={pill(false)}>{ticket.role}</span>
                  <span style={pill(false)}>{ticket.created_by}</span>
                </div>

                <h1 style={{ margin: "12px 0 6px 0" }}>{ticket.title}</h1>
                <div style={{ opacity: 0.78, fontSize: 13, lineHeight: 1.5 }}>{ticket.description}</div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button className="btn" onClick={loadThread} disabled={saving}>
                  Refresh
                </button>
                <button className="btn" onClick={markAnswered} disabled={saving || status === "closed"}>
                  Mark Answered
                </button>
                <button className="btn" onClick={closeTicket} disabled={saving || status === "closed"}>
                  Close Ticket
                </button>
              </div>
            </div>
          </div>

          {/* Replies */}
          <div style={{ display: "grid", gap: 12 }}>
            {replies.length === 0 ? (
              <div style={card}>No replies yet. Add the first reply below.</div>
            ) : (
              replies.map((r) => (
                <div key={r.id} style={card}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={pill(false)}>{r.role}</span>
                    <span style={pill(false)}>{r.user_name}</span>
                    <span style={{ opacity: 0.6, fontSize: 12 }}>
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ marginTop: 10, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{r.message}</div>
                </div>
              ))
            )}
          </div>

          {/* Reply box */}
          <div style={card}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
              <span style={pill(true)}>Reply</span>
              <span style={pill(false)}>{role}</span>
              <span style={pill(false)}>{user}</span>
            </div>

            <textarea
              style={textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your reply…"
              disabled={status === "closed"}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button className="btn" onClick={() => setMessage("")} disabled={saving || status === "closed"}>
                Clear
              </button>
              <button className="btn" onClick={sendReply} disabled={saving || status === "closed"}>
                {saving ? "Sending…" : "Send Reply"}
              </button>
            </div>

            {status === "closed" ? (
              <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
                This ticket is closed. Replies are disabled.
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}