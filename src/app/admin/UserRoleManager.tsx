"use client";

import React from "react";
import { useRouter } from "next/navigation";

type Row = {
  email: string;
  name: string | null;
  status: string | null;
  role: string | null;
  created_at: string | null;
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

export default function UserRoleManager() {
  const router = useRouter();

  const [filter, setFilter] = React.useState<"pending" | "approved" | "all">("pending");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await safeJson(`/api/admin/users?status=${filter}`);
      setRows(data?.rows || []);
    } catch (e: any) {
      setErr(e.message || "Failed to load users");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function approve(email: string, role?: string) {
    setErr("");
    try {
      await safeJson("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "approve", role: role || undefined }),
      });
      await load();
    } catch (e: any) {
      setErr(e.message || "Approve failed");
    }
  }

  async function reject(email: string) {
    setErr("");
    try {
      await safeJson("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "reject" }),
      });
      await load();
    } catch (e: any) {
      setErr(e.message || "Reject failed");
    }
  }

  async function setRole(email: string, role: string) {
    setErr("");
    try {
      await safeJson("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "set_role", role }),
      });
      await load();
    } catch (e: any) {
      setErr(e.message || "Role update failed");
    }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 className="h2" style={{ marginBottom: 4 }}>User approvals</h2>
          <p className="small" style={{ marginTop: 0, opacity: 0.8 }}>
            Approve accounts and assign roles (coach / manager / admin).
          </p>
        </div>

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => router.back()}>← Back</button>
          <button className="btn" onClick={() => setFilter("pending")}>Pending</button>
          <button className="btn" onClick={() => setFilter("approved")}>Approved</button>
          <button className="btn" onClick={() => setFilter("all")}>All</button>
          <button className="btn" onClick={load}>Refresh</button>
        </div>
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

      {loading ? (
        <p className="small">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="small">No users found for filter: {filter}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((u) => {
            const st = String(u.status || "pending").toLowerCase();
            const role = String(u.role || "user").toLowerCase();

            return (
              <div key={u.email} className="card" style={{ padding: 14 }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{u.email}</div>
                    <div className="small" style={{ opacity: 0.8 }}>{u.name || "—"}</div>
                    <div className="small" style={{ opacity: 0.7 }}>
                      Status: {st} • Role: {role}
                    </div>
                  </div>

                  <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <select
                      value={role}
                      onChange={(e) => setRole(u.email, e.target.value)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "rgba(0,0,0,.15)",
                        border: "1px solid rgba(255,255,255,.10)",
                        color: "inherit",
                      }}
                    >
                      <option value="user">user</option>
                      <option value="coach">coach</option>
                      <option value="manager">manager</option>
                      <option value="admin">admin</option>
                    </select>

                    {st !== "approved" ? (
                      <button className="btn" onClick={() => approve(u.email, role)}>
                        Approve
                      </button>
                    ) : (
                      <span className="badge">Approved</span>
                    )}

                    <button className="btn" onClick={() => reject(u.email)}>
                      Remove
                    </button>
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