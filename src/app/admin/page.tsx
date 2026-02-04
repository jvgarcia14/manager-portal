"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  email: string;
  name?: string | null;
  status?: string | null;
  role?: string | null;
  created_at?: string | null;
};

export default function AdminUsersPage() {
  const [tab, setTab] = useState<"pending" | "approved" | "all">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load(which = tab) {
    setLoading(true);
    setErr(null);
    try {
      // cache-bust so you always see latest DB rows
      const url = `/api/admin/users?status=${which}&t=${Date.now()}`;
      const res = await fetch(url, { method: "GET" });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      // ✅ IMPORTANT: API returns { rows: [...] }
      const list = Array.isArray(data?.rows) ? data.rows : [];
      setRows(list);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function action(email: string, act: "approve" | "reject") {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: act }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      await load(tab);
    } catch (e: any) {
      setErr(e?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const title = useMemo(() => {
    if (tab === "pending") return "Pending";
    if (tab === "approved") return "Approved";
    return "All";
  }, [tab]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>User approvals</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Approve accounts to unlock dashboard access.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={() => setTab("pending")} disabled={loading}>
          pending
        </button>
        <button onClick={() => setTab("approved")} disabled={loading}>
          approved
        </button>
        <button onClick={() => setTab("all")} disabled={loading}>
          all
        </button>

        <div style={{ flex: 1 }} />

        <button onClick={() => load(tab)} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {err ? (
        <div style={{ marginTop: 12, color: "crimson", fontWeight: 700 }}>
          {err}
        </div>
      ) : null}

      <h2 style={{ marginTop: 18, fontSize: 18, fontWeight: 800 }}>
        {title} users ({rows.length})
      </h2>

      <div style={{ marginTop: 10, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: 12 }}>Email</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }}>Role</th>
              <th style={{ padding: 12 }}>Created</th>
              <th style={{ padding: 12 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td style={{ padding: 12, opacity: 0.7 }} colSpan={5}>
                  No users found for filter: {tab}.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.email} style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                  <td style={{ padding: 12 }}>{r.email}</td>
                  <td style={{ padding: 12 }}>{r.status || "pending"}</td>
                  <td style={{ padding: 12 }}>{r.role || "user"}</td>
                  <td style={{ padding: 12 }}>
                    {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
                  </td>
                  <td style={{ padding: 12, display: "flex", gap: 8 }}>
                    <button
                      onClick={() => action(r.email, "approve")}
                      disabled={loading}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => action(r.email, "reject")}
                      disabled={loading}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
