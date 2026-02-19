"use client";

import React, { useEffect, useState } from "react";

type Slot = null | {
  chatterId: string | number;
  isCover: boolean;
  displayName: string;
  username: string; // includes @
};

type PageRow = {
  pageKey: string;
  pageLabel: string;
  prime: Slot;
  midshift: Slot;
  closing: Slot;
};

type TierRow = {
  chatterId: string | number;
  displayName: string;
  username: string;
  totalSales: number;
  tier: number;
};

function NameLine({ slot }: { slot: Slot }) {
  if (!slot) return <span className="opacity-60">—</span>;
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">{slot.displayName}</span>
      {slot.username && <span className="opacity-70">{slot.username}</span>}
      {slot.isCover && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">#cover</span>}
    </div>
  );
}

export default function MasterlistPage() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [tiersOpen, setTiersOpen] = useState(false);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [tiersLoading, setTiersLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/dashboard/masterlist", { cache: "no-store" });
      const data = await res.json();
      setPages(data.pages || []);
      setLoading(false);
    })();
  }, []);

  async function openTiers() {
    setTiersOpen(true);
    if (tiers.length) return;
    setTiersLoading(true);
    const res = await fetch("/api/dashboard/masterlist/tiers?days=30", { cache: "no-store" });
    const data = await res.json();
    setTiers(data.tiers || []);
    setTiersLoading(false);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Masterlist</h1>
          <p className="text-sm opacity-70">Lineup per page (shows #cover when applicable)</p>
        </div>

        <button
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10 transition"
          onClick={openTiers}
        >
          Chatters & Tiers
        </button>
      </div>

      {loading ? (
        <div className="opacity-70">Loading…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((p) => (
            <div key={p.pageKey} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-lg font-semibold">{p.pageLabel}</div>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                  <span className="opacity-70">Prime</span>
                  <NameLine slot={p.prime} />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                  <span className="opacity-70">Midshift</span>
                  <NameLine slot={p.midshift} />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                  <span className="opacity-70">Closing</span>
                  <NameLine slot={p.closing} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tiersOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0b0b12] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-semibold">Chatters & Tiers</div>
                <div className="text-sm opacity-70">Based on chatter sales totals (last 30 days).</div>
              </div>
              <button
                className="rounded-xl border border-white/10 px-3 py-1 hover:bg-white/10"
                onClick={() => setTiersOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              {tiersLoading ? (
                <div className="opacity-70">Loading tiers…</div>
              ) : (
                <div className="overflow-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="text-left p-3">Chatter</th>
                        <th className="text-left p-3">@</th>
                        <th className="text-left p-3">Total Sales</th>
                        <th className="text-left p-3">Tier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiers.map((t) => (
                        <tr key={String(t.chatterId)} className="border-t border-white/10">
                          <td className="p-3">{t.displayName}</td>
                          <td className="p-3 opacity-80">{t.username || "—"}</td>
                          <td className="p-3">{t.totalSales.toLocaleString()}</td>
                          <td className="p-3">Tier {t.tier}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}