// src/app/dashboard/masterlist/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Slot = null | {
  chatterId?: string | number;
  isCover: boolean;
  displayName: string;
  username: string; // may include @, we will sanitize
  source?: "attendance" | "saved";
};

type PageRow = {
  pageKey: string;
  pageLabel: string;
  prime: Slot;
  midshift: Slot;
  closing: Slot;
};

type TierRow = {
  chatterId?: string | number;
  displayName: string;
  username: string;
  totalSales: number;
  tier: number;
};

async function safeJson(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  const text = await r.text();
  try {
    const json = JSON.parse(text);
    if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
    return json;
  } catch {
    throw new Error(text || `HTTP ${r.status}`);
  }
}

function cleanDisplayName(name: string) {
  let s = String(name || "").trim();

  // Remove any @username accidentally embedded in displayName
  s = s.replace(/@\w+/g, "").trim();

  // Collapse multiple spaces
  s = s.replace(/\s+/g, " ");

  return s;
}

function cleanUsername(u: string) {
  const s = String(u || "").trim();
  if (!s) return "";
  const noAt = s.replace(/^@+/, "");
  return noAt.replace(/[^\w]/g, "");
}

function dedupeName(name: string) {
  const s = String(name || "").trim();
  if (!s) return s;

  // If full string repeats twice, remove duplicate
  const mid = Math.floor(s.length / 2);
  const a = s.slice(0, mid).trim();
  const b = s.slice(mid).trim();
  if (a && b && a === b) return a;

  // If name is like "Diana Rose Eugenio Diana Rose Eugenio"
  const parts = s.split(" ");
  const half = Math.floor(parts.length / 2);
  if (half > 0) {
    const left = parts.slice(0, half).join(" ");
    const right = parts.slice(half).join(" ");
    if (left === right) return left;
  }

  return s;
}

function NameLine({ slot }: { slot: Slot }) {
  if (!slot) return <span className="opacity-60">—</span>;

  const realName = dedupeName(cleanDisplayName(slot.displayName));
  const uname = cleanUsername(slot.username);

  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="font-medium max-w-[180px] truncate text-right">{realName || "Unknown"}</span>
      {uname ? <span className="opacity-70 shrink-0">@{uname}</span> : null}
      {slot.isCover ? (
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 shrink-0">#cover</span>
      ) : null}
    </div>
  );
}

export default function MasterlistPage() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [query, setQuery] = useState("");

  const [tiersOpen, setTiersOpen] = useState(false);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [tiersErr, setTiersErr] = useState("");
  const [tierDays, setTierDays] = useState(30);

  async function loadMasterlist() {
    setLoading(true);
    setErr("");
    try {
      const data = await safeJson("/api/dashboard/masterlist");
      setPages((data.pages || []) as PageRow[]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load masterlist");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMasterlist();
  }, []);

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;

    return pages.filter((p) => {
      const hay = `${p.pageKey} ${p.pageLabel}`.toLowerCase();
      return hay.includes(q);
    });
  }, [pages, query]);

  async function openTiers() {
    setTiersOpen(true);

    // Load on open (and reload if tierDays changed)
    setTiersLoading(true);
    setTiersErr("");
    try {
      const data = await safeJson(`/api/dashboard/masterlist/tiers?days=${tierDays}`);
      setTiers((data.tiers || []) as TierRow[]);
    } catch (e: any) {
      setTiersErr(e?.message || "Failed to load tiers");
      setTiers([]);
    } finally {
      setTiersLoading(false);
    }
  }

  async function refreshTiers() {
    setTiersLoading(true);
    setTiersErr("");
    try {
      const data = await safeJson(`/api/dashboard/masterlist/tiers?days=${tierDays}`);
      setTiers((data.tiers || []) as TierRow[]);
    } catch (e: any) {
      setTiersErr(e?.message || "Failed to load tiers");
      setTiers([]);
    } finally {
      setTiersLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>
            Masterlist
          </h1>
          <p className="small">Lineup per page (shows #cover when applicable)</p>
        </div>

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={loadMasterlist} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>

          <button className="btn btnPrimary" onClick={openTiers}>
            Chatters &amp; Tiers
          </button>
        </div>
      </div>

      <div className="spacer" />

      <input
        className="input"
        placeholder="Search page tag or label…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%" }}
      />

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
        <p className="small" style={{ opacity: 0.75 }}>
          Loading…
        </p>
      ) : filteredPages.length === 0 ? (
        <p className="small" style={{ opacity: 0.75 }}>
          No pages found.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))" }}>
          {filteredPages.map((p) => (
            <div key={p.pageKey} className="card" style={{ padding: 14 }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{p.pageLabel}</div>
                  <div className="small" style={{ opacity: 0.65 }}>
                    #{p.pageKey}
                  </div>
                </div>
              </div>

              <div className="spacer" />

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <ShiftRow label="Prime" slot={p.prime} />
                <ShiftRow label="Midshift" slot={p.midshift} />
                <ShiftRow label="Closing" slot={p.closing} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TIERS MODAL */}
      {tiersOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl card" style={{ padding: 16 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Chatters &amp; Tiers</div>
                <div className="small" style={{ opacity: 0.7 }}>
                  Based on chatter sales totals (last {tierDays} days).
                </div>
              </div>

              <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                <select
                  value={tierDays}
                  onChange={(e) => setTierDays(Number(e.target.value))}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(10,10,18,.9)",
                    color: "white",
                    outline: "none",
                    minWidth: 120,
                  }}
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>

                <button className="btn" onClick={refreshTiers} disabled={tiersLoading}>
                  {tiersLoading ? "Refreshing…" : "Refresh"}
                </button>

                <button
                  className="btn"
                  onClick={() => {
                    setTiersOpen(false);
                    setTiersErr("");
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {tiersErr ? (
              <>
                <div className="spacer" />
                <div className="card" style={{ border: "1px solid rgba(255,80,80,.35)" }}>
                  <p className="small" style={{ color: "rgba(255,180,180,.95)" }}>
                    Error: {tiersErr}
                  </p>
                </div>
              </>
            ) : null}

            <div className="spacer" />

            {tiersLoading ? (
              <p className="small" style={{ opacity: 0.75 }}>
                Loading tiers…
              </p>
            ) : tiers.length === 0 ? (
              <p className="small" style={{ opacity: 0.75 }}>
                No tier data found.
              </p>
            ) : (
              <div style={{ overflow: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: "rgba(255,255,255,.04)" }}>
                    <tr>
                      <th style={{ textAlign: "left", padding: 12 }}>Chatter</th>
                      <th style={{ textAlign: "left", padding: 12 }}>@</th>
                      <th style={{ textAlign: "left", padding: 12 }}>Total Sales</th>
                      <th style={{ textAlign: "left", padding: 12 }}>Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((t, idx) => {
                      const uname = cleanUsername(t.username);
                      const nm = dedupeName(cleanDisplayName(t.displayName));
                      return (
                        <tr key={`${uname || nm}-${idx}`} style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
                          <td style={{ padding: 12, fontWeight: 700 }}>{nm || "Unknown"}</td>
                          <td style={{ padding: 12, opacity: 0.8 }}>{uname ? `@${uname}` : "—"}</td>
                          <td style={{ padding: 12 }}>{Number(t.totalSales || 0).toLocaleString()}</td>
                          <td style={{ padding: 12 }}>Tier {t.tier}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ShiftRow({ label, slot }: { label: string; slot: Slot }) {
  return (
    <div
      className="row"
      style={{
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,.08)",
        background: "rgba(255,255,255,.03)",
        gap: 10,
      }}
    >
      <span className="small" style={{ opacity: 0.75 }}>
        {label}
      </span>
      <NameLine slot={slot} />
    </div>
  );
}