// src/app/dashboard/masterlist/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Slot = null | {
  chatterId?: string | number;
  isCover: boolean;
  displayName: string;
  username: string; // includes @
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

function NameLine({ slot }: { slot: Slot }) {
  if (!slot) return <span className="opacity-60">—</span>;

  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="font-medium">{slot.displayName}</span>

      {slot.username ? <span className="opacity-70">{slot.username}</span> : null}

      {slot.isCover ? (
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">#cover</span>
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
    if (tiers.length) return;

    setTiersLoading(true);
    setTiersErr("");
    try {
      const data = await safeJson(`/api/dashboard/masterlist/tiers?days=${tierDays}`);
      setTiers((data.tiers || []) as TierRow[]);
    } catch (e: any) {
      setTiersErr(e?.message || "Failed to load tiers");
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
            Chatters & Tiers
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
                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,.08)",
                    background: "rgba(255,255,255,.03)",
                  }}
                >
                  <span className="small" style={{ opacity: 0.75 }}>
                    Prime
                  </span>
                  <NameLine slot={p.prime} />
                </div>

                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,.08)",
                    background: "rgba(255,255,255,.03)",
                  }}
                >
                  <span className="small" style={{ opacity: 0.75 }}>
                    Midshift
                  </span>
                  <NameLine slot={p.midshift} />
                </div>

                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,.08)",
                    background: "rgba(255,255,255,.03)",
                  }}
                >
                  <span className="small" style={{ opacity: 0.75 }}>
                    Closing
                  </span>
                  <NameLine slot={p.closing} />
                </div>
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
                <div style={{ fontSize: 18, fontWeight: 800 }}>Chatters & Tiers</div>
                <div className="small" style={{ opacity: 0.7 }}>
                  Based on chatter sales totals (last {tierDays} days).
                </div>
              </div>

              <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                <select
                  className="input"
                  value={tierDays}
                  onChange={(e) => setTierDays(Number(e.target.value))}
                  style={{ padding: "10px 12px" }}
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

                <button className="btn" onClick={() => setTiersOpen(false)}>
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
                    {tiers.map((t, idx) => (
                      <tr key={`${t.username}-${idx}`} style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
                        <td style={{ padding: 12, fontWeight: 700 }}>{t.displayName}</td>
                        <td style={{ padding: 12, opacity: 0.8 }}>{t.username || "—"}</td>
                        <td style={{ padding: 12 }}>{Number(t.totalSales || 0).toLocaleString()}</td>
                        <td style={{ padding: 12 }}>Tier {t.tier}</td>
                      </tr>
                    ))}
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