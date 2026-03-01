"use client";

import React from "react";
import Link from "next/link";
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
  minHeight: 90,
  resize: "vertical" as const,
};

export default function TicketsPage() {
  const { data: session } = useSession();
  const s: any = session;
  const user = s?.user?.email || "Unknown";
  const role = String(s?.role || "user");

  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [showCreate, setShowCreate] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function loadTickets() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/tickets", { cache: "no-store" as any });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to load tickets.");
        setTickets([]);
      } else {
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch (e: any) {
      setError("Failed to load tickets. Check API/DB.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadTickets();
  }, []);

  async function createTicket() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          user,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to create ticket.");
        return;
      }

      // reset
      setTitle("");
      setDescription("");
      setShowCreate(false);

      // reload list
      await loadTickets();
    } catch {
      setError("Failed to create ticket. Check API/DB.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Ticket System</h1>
          <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
            Ask questions here so managers + coaches have one source of truth.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Close" : "Create Ticket"}
          </button>
          <button className="btn" onClick={loadTickets}>
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ ...card, borderColor: "rgba(255,120,120,.30)", background: "rgba(255,120,120,.06)" }}>
          <strong style={{ display: "block", marginBottom: 6 }}>Error</strong>
          <div style={{ opacity: 0.9, fontSize: 13 }}>{error}</div>
        </div>
      ) : null}

      {showCreate ? (
        <div style={card}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span style={pill(true)}>New Ticket</span>
              <span style={pill(false)}>Role: {role}</span>
              <span style={pill(false)}>{user}</span>
            </div>

            <input
              style={input}
              placeholder="Title (example: Is it allowed to upsell video call?)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              style={textarea}
              placeholder="Describe the question and context (pricing, model, rules, etc.)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button className="btn" onClick={createTicket} disabled={saving}>
                {saving ? "Creating..." : "Submit Ticket"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={pill(false)}>Total: {tickets.length}</span>
        <span style={pill(false)}>Open: {tickets.filter((t) => String(t.status).toLowerCase() === "open").length}</span>
        <span style={pill(false)}>Answered: {tickets.filter((t) => String(t.status).toLowerCase() === "answered").length}</span>
        <span style={pill(false)}>Closed: {tickets.filter((t) => String(t.status).toLowerCase() === "closed").length}</span>
      </div>

      {loading ? (
        <div style={{ ...card, opacity: 0.8 }}>Loading tickets…</div>
      ) : tickets.length === 0 ? (
        <div style={{ ...card, opacity: 0.8 }}>No tickets yet. Create the first one.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {tickets.map((t) => {
            const st = String(t.status || "open").toLowerCase();
            const statusPill =
              st === "answered" ? pill(true) : st === "closed" ? { ...pill(false), opacity: 0.65 } : pill(false);

            return (
              <div key={t.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 220 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={statusPill}>{st.toUpperCase()}</span>
                      <span style={pill(false)}>{t.role}</span>
                      <span style={pill(false)}>{t.created_by}</span>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 18, fontWeight: 650 }}>
                      <Link href={`/dashboard/tickets/${t.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                        {t.title}
                      </Link>
                    </div>

                    <div style={{ marginTop: 6, opacity: 0.78, fontSize: 13, lineHeight: 1.4 }}>
                      {t.description}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Link className="btn" href={`/dashboard/tickets/${t.id}`}>
                      Open Thread →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}