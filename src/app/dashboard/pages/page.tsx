"use client";

import React, { useEffect, useMemo, useState } from "react";

type PageRow = {
  tag: string;
  label: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

function fmt(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

export default function PagesManager() {
  const [rows, setRows] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  // modal
  const [showAdd, setShowAdd] = useState(false);
  const [tag, setTag] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/pages", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load pages");
      setRows(data.rows || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === "active" && !r.is_active) return false;
      if (status === "inactive" && r.is_active) return false;
      if (!qq) return true;
      return (
        r.tag.toLowerCase().includes(qq) ||
        r.label.toLowerCase().includes(qq) ||
        ("#" + r.tag).toLowerCase().includes(qq)
      );
    });
  }, [rows, q, status]);

  async function addPage() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add page");

      setTag("");
      setLabel("");
      setShowAdd(false);
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r: PageRow) {
    setErr(null);
    const next = !r.is_active;
    // optimistic
    setRows((prev) => prev.map((x) => (x.tag === r.tag ? { ...x, is_active: next } : x)));

    try {
      const res = await fetch("/api/pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: r.tag, is_active: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update");
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
      // revert on fail
      setRows((prev) => prev.map((x) => (x.tag === r.tag ? { ...x, is_active: r.is_active } : x)));
    }
  }

  async function copyTag(t: string) {
    try {
      await navigator.clipboard.writeText("#" + t);
    } catch {
      // ignore
    }
  }

  return (
    <div className="card" style={{ padding: 18, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>Pages (Allowed Tags)</div>
          <div style={{ opacity: 0.8, marginTop: 6 }}>
            Manage allowed page tags used by Telegram bots + website.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" onClick={() => load()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button className="btn" onClick={() => setShowAdd(true)}>
            + Add Page
          </button>
        </div>
      </div>

      <div className="spacer" />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="Search tag or label…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 220 }}
        />

        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="all">All</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </div>

      {err ? (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,100,100,.35)" }}>
          <b style={{ color: "rgba(255,150,150,.95)" }}>Error:</b> {err}
        </div>
      ) : null}

      <div className="spacer" />

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr style={{ textAlign: "left", opacity: 0.85 }}>
              <th style={{ padding: "10px 8px" }}>TAG</th>
              <th style={{ padding: "10px 8px" }}>LABEL</th>
              <th style={{ padding: "10px 8px" }}>ACTIVE</th>
              <th style={{ padding: "10px 8px" }}>UPDATED</th>
              <th style={{ padding: "10px 8px" }} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.tag} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
                <td style={{ padding: "12px 8px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  #{r.tag}
                </td>
                <td style={{ padding: "12px 8px" }}>{r.label}</td>
                <td style={{ padding: "12px 8px" }}>
                  <button className="btn" onClick={() => toggleActive(r)} style={{ borderRadius: 999 }}>
                    {r.is_active ? "ON" : "OFF"}
                  </button>
                </td>
                <td style={{ padding: "12px 8px", opacity: 0.8 }}>{fmt(r.updated_at)}</td>
                <td style={{ padding: "12px 8px", textAlign: "right" }}>
                  <button className="btn" onClick={() => copyTag(r.tag)} style={{ borderRadius: 999 }}>
                    Copy
                  </button>
                </td>
              </tr>
            ))}

            {!loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 16, opacity: 0.75 }}>
                  No pages found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Add modal */}
      {showAdd ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => (!saving ? setShowAdd(false) : null)}
        >
          <div
            className="card"
            style={{ width: "min(520px, 96vw)", padding: 16, borderRadius: 18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 800 }}>Add Page</div>
            <div style={{ opacity: 0.8, marginTop: 6 }}>
              Tag is saved without <b>#</b>. We will auto-normalize it.
            </div>

            <div className="spacer" />

            <div style={{ display: "grid", gap: 10 }}>
              <input
                className="input"
                placeholder='Tag (example: "islafree" or "#islafree")'
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                disabled={saving}
              />
              <input
                className="input"
                placeholder='Label (example: "Isla Free")'
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="spacer" />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn" onClick={() => setShowAdd(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn" onClick={addPage} disabled={saving || !tag.trim() || !label.trim()}>
                {saving ? "Saving…" : "Save Page"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}