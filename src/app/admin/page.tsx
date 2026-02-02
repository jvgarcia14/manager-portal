"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";

type WebUser = {
  id: number;
  email: string;
  name?: string | null;
  role: string;
  status: string;
  created_at: string;
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

export default function AdminPage() {
  const { data: session, status } = useSession();
  const s: any = session;
  const userStatus = s?.status;
  const role = s?.role || "user";

  const [users, setUsers] = useState<WebUser[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await safeJson(`/api/admin/users?status=${filter}`);
      setUsers(data.users || []);
    } catch (e: any) {
      setErr(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    if (userStatus !== "approved") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, userStatus, filter]);

  async function approve(id: number, newRole: "manager" | "admin" = "manager") {
    try {
      await safeJson(`/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "approve", role: newRole }),
      });
      await load();
    } catch (e: any) {
      setErr(e.message || "Approve failed");
    }
  }

  async function reject(id: number) {
    try {
      await safeJson(`/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "reject" }),
      });
      await load();
    } catch (e: any) {
      setErr(e.message || "Reject failed");
    }
  }

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
          <p className="small">Sign in first.</p>
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
          <a className="btn" href="/intro">Back</a>
          <button className="btn" onClick={() => signOut()}>Sign out</button>
        </div>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="container">
        <div className="card">
          <h1 className="h1">Admin only</h1>
          <p className="small">You don’t have permission to view this page.</p>
          <div className="spacer" />
          <a className="btn" href="/dashboard">Back to Dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="nav">
        <div className="row" style={{ gap: 10 }}>
          <span className="badge">🍓 Tasty Media</span>
          <span className="badge">Admin</span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span className="badge">{session.user?.email}</span>
          <button className="btn" onClick={() => signOut()}>Sign out</button>
        </div>
      </div>

      <div className="spacer" />

      <div className="card">
        <h1 className="h1" style={{ marginBottom: 6 }}>User approvals</h1>
        <p className="small">Approve accounts to unlock dashboard access.</p>

        <div className="spacer" />

        <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            {(["pending", "approved", "all"] as const).map((x) => (
              <button
                key={x}
                className="btn"
                onClick={() => setFilter(x)}
                style={{
                  borderRadius: 999,
                  padding: "10px 14px",
                  opacity: filter === x ? 1 : 0.75,
                  border: filter === x ? "1px solid rgba(120,120,255,.8)" : undefined,
                }}
              >
                {x}
              </button>
            ))}
          </div>

          <div className="row" style={{ gap: 10 }}>
            <button className="btn" onClick={load}>{loading ? "Refreshing…" : "Refresh"}</button>
            <a className="btn" href="/dashboard">Back to Dashboard</a>
          </div>
        </div>

        {err ? (
          <>
            <div className="spacer" />
            <div className="card" style={{ border: "1px solid rgba(255,80,80,.35)" }}>
              <p className="small" style={{ color: "rgba(255,180,180,.95)" }}>Error: {err}</p>
              <p className="small">
                If it says DB error, make sure WEBSITE_DATABASE_URL points to your LOGIN/WEBSITE Postgres (the one that has web_users).
              </p>
            </div>
          </>
        ) : null}

        <div className="spacer" />

        <div className="row" style={{ fontWeight: 700, opacity: 0.85 }}>
          <div style={{ flex: 2 }}>Email</div>
          <div style={{ flex: 1 }}>Status</div>
          <div style={{ flex: 1 }}>Role</div>
          <div style={{ flex: 1 }}>Created</div>
          <div style={{ width: 260, textAlign: "right" }}>Actions</div>
        </div>
        <div className="hr" />

        {users.length === 0 ? (
          <p className="small" style={{ opacity: 0.8 }}>
            No users found for filter: <b>{filter}</b>.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {users.map((u) => (
              <div key={u.id} className="card" style={{ padding: 14 }}>
                <div className="row" style={{ alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 2, fontWeight: 700 }}>{u.email}</div>
                  <div style={{ flex: 1, opacity: 0.9 }}>{u.status}</div>
                  <div style={{ flex: 1, opacity: 0.9 }}>{u.role}</div>
                  <div style={{ flex: 1, opacity: 0.9 }}>
                    {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                  </div>

                  <div style={{ width: 260, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    {u.status === "pending" ? (
                      <>
                        <button className="btn" onClick={() => approve(u.id, "manager")}>
                          Approve (manager)
                        </button>
                        <button className="btn" onClick={() => approve(u.id, "admin")}>
                          Approve (admin)
                        </button>
                        <button className="btn" onClick={() => reject(u.id)} style={{ opacity: 0.85 }}>
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="badge">No actions</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
