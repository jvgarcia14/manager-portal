"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  email: string;
  name?: string | null;
  status?: string | null;
  role?: string | null;
  created_at?: string | null;
};

type Tab = "pending" | "approved" | "all";

function Badge({
  tone,
  children,
}: {
  tone: "green" | "yellow" | "blue" | "red" | "gray";
  children: React.ReactNode;
}) {
  const tones: Record<string, { bg: string; bd: string; tx: string }> = {
    green: { bg: "rgba(46,229,157,0.14)", bd: "rgba(46,229,157,0.38)", tx: "#2EE59D" },
    yellow: { bg: "rgba(255,209,102,0.14)", bd: "rgba(255,209,102,0.38)", tx: "#FFD166" },
    blue: { bg: "rgba(77,163,255,0.14)", bd: "rgba(77,163,255,0.38)", tx: "#4DA3FF" },
    red: { bg: "rgba(255,77,77,0.12)", bd: "rgba(255,77,77,0.32)", tx: "#FF7A7A" },
    gray: { bg: "rgba(255,255,255,0.08)", bd: "rgba(255,255,255,0.14)", tx: "rgba(234,240,255,0.85)" },
  };

  const t = tones[tone] || tones.gray;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        color: t.tx,
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Btn({
  variant,
  children,
  disabled,
  onClick,
}: {
  variant: "primary" | "ghost" | "danger";
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const common: React.CSSProperties = {
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 900,
    fontSize: 13,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#EAF0FF",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "transform 0.05s ease, background 0.15s ease, border-color 0.15s ease",
    userSelect: "none",
  };

  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: "linear-gradient(135deg, rgba(77,163,255,0.95), rgba(109,40,217,0.95))",
      border: "1px solid rgba(120,180,255,0.45)",
      color: "#071025",
    },
    ghost: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.14)",
      color: "#EAF0FF",
    },
    danger: {
      background: "rgba(255,77,77,0.14)",
      border: "1px solid rgba(255,77,77,0.28)",
      color: "#FFD5D5",
    },
  };

  return (
    <button
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{ ...common, ...(styles[variant] || styles.ghost) }}
      onMouseDown={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.99)";
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      {children}
    </button>
  );
}

export default function AdminUsersPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load(which: Tab = tab) {
    setLoading(true);
    setErr(null);

    try {
      const url = `/api/admin/users?status=${which}&t=${Date.now()}`;
      const res = await fetch(url, { method: "GET" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

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
      const data = await res.json().catch(() => ({}));
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

  const headerTitle = useMemo(() => {
    if (tab === "pending") return "Pending approvals";
    if (tab === "approved") return "Approved users";
    return "All users";
  }, [tab]);

  const subtitle = useMemo(() => {
    if (tab === "pending") return "Approve accounts to unlock dashboard access.";
    if (tab === "approved") return "These users already have access.";
    return "Full list of accounts in your internal portal.";
  }, [tab]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(109,40,217,0.22), transparent 60%)," +
          "radial-gradient(1000px 700px at 70% 50%, rgba(77,163,255,0.18), transparent 55%)," +
          "linear-gradient(180deg, #060A12, #050814)",
        color: "#EAF0FF",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Top header card */}
        <div
          style={{
            borderRadius: 22,
            padding: 18,
            background: "rgba(15,26,46,0.62)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "rgba(77,163,255,0.14)",
                border: "1px solid rgba(77,163,255,0.30)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              ✅
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: 0.2 }}>
                User approvals
              </div>
              <div style={{ marginTop: 6, color: "rgba(234,240,255,0.70)" }}>
                {subtitle}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Badge tone={tab === "pending" ? "yellow" : tab === "approved" ? "green" : "blue"}>
                {tab.toUpperCase()}
              </Badge>

              <Btn variant="ghost" disabled={loading} onClick={() => load(tab)}>
                {loading ? "Refreshing…" : "Refresh"}
              </Btn>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <TabPill active={tab === "pending"} onClick={() => setTab("pending")} disabled={loading}>
              Pending
            </TabPill>
            <TabPill active={tab === "approved"} onClick={() => setTab("approved")} disabled={loading}>
              Approved
            </TabPill>
            <TabPill active={tab === "all"} onClick={() => setTab("all")} disabled={loading}>
              All
            </TabPill>

            <div style={{ flex: 1 }} />

            <Badge tone="gray">
              {headerTitle} • {rows.length}
            </Badge>
          </div>

          {err ? (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 14,
                background: "rgba(255,77,77,0.12)",
                border: "1px solid rgba(255,77,77,0.22)",
                color: "#FFD5D5",
                fontWeight: 850,
              }}
            >
              {err}
            </div>
          ) : null}
        </div>

        {/* Table card */}
        <div
          style={{
            marginTop: 14,
            borderRadius: 22,
            overflow: "hidden",
            background: "rgba(11,18,32,0.70)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 18px 55px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  <Th>Email</Th>
                  <Th>Name</Th>
                  <Th>Status</Th>
                  <Th>Role</Th>
                  <Th>Created</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 18, color: "rgba(234,240,255,0.70)" }}>
                      {loading ? "Loading users…" : `No users found for filter: ${tab}.`}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const status = (r.status || "pending").toLowerCase();
                    const role = (r.role || "user").toLowerCase();

                    const statusTone =
                      status === "approved" ? "green" : status === "pending" ? "yellow" : "gray";

                    const roleTone = role === "admin" ? "blue" : "gray";

                    return (
                      <tr key={r.email}>
                        <Td>
                          <div style={{ fontWeight: 900 }}>{r.email}</div>
                        </Td>
                        <Td style={{ color: "rgba(234,240,255,0.80)" }}>
                          {r.name || <span style={{ opacity: 0.6 }}>—</span>}
                        </Td>
                        <Td>
                          <Badge tone={statusTone as any}>{status}</Badge>
                        </Td>
                        <Td>
                          <Badge tone={roleTone as any}>{role}</Badge>
                        </Td>
                        <Td style={{ color: "rgba(234,240,255,0.80)", whiteSpace: "nowrap" }}>
                          {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                        </Td>
                        <Td align="right">
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <Btn
                              variant="primary"
                              disabled={loading || status === "approved"}
                              onClick={() => action(r.email, "approve")}
                            >
                              {status === "approved" ? "Approved" : "Approve"}
                            </Btn>

                            <Btn
                              variant="danger"
                              disabled={loading}
                              onClick={() => {
                                const ok = confirm(`Reject ${r.email}? This removes them from web_users.`);
                                if (ok) action(r.email, "reject");
                              }}
                            >
                              Reject
                            </Btn>
                          </div>
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
              padding: 14,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(234,240,255,0.65)",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <div>Internal manager portal • approvals</div>
            <div>{loading ? "Working…" : "Up to date"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** UI helpers */
function TabPill({
  active,
  children,
  onClick,
  disabled,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        padding: "9px 12px",
        borderRadius: 999,
        fontWeight: 950,
        fontSize: 13,
        border: active ? "1px solid rgba(77,163,255,0.55)" : "1px solid rgba(255,255,255,0.12)",
        background: active ? "rgba(77,163,255,0.18)" : "rgba(255,255,255,0.06)",
        color: "#EAF0FF",
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  return (
    <th
      style={{
        textAlign: align || "left",
        padding: 14,
        fontSize: 12,
        letterSpacing: 0.4,
        color: "rgba(234,240,255,0.65)",
        fontWeight: 900,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(15,26,46,0.45)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  style,
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        textAlign: align || "left",
        padding: 14,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        verticalAlign: "middle",
        ...style,
      }}
    >
      {children}
    </td>
  );
}
