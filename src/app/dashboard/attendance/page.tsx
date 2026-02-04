"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { EXPECTED_PAGES } from "@/lib/expectedPages";

type AttendanceRow = { pageKey: string; shift: string; clockedIn: number; covers: number };

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

type ShiftFilter = "all" | "prime" | "midshift" | "closing";

export default function AttendancePage() {
  const { data: session, status } = useSession();
  const s: any = session;
  const userStatus = s?.status;

  const [attSummary, setAttSummary] = useState<{ attendanceDay: string; clockedIn: number; covers: number } | null>(
    null
  );
  const [attRows, setAttRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ✅ new
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>("all");
  const [missingSearch, setMissingSearch] = useState("");

  useEffect(() => {
    if (!session) return;
    if (userStatus !== "approved") return;

    setLoading(true);
    setErr("");

    (async () => {
      try {
        const [as, ap] = await Promise.all([
          safeJson(`/api/dashboard/attendance/summary`),
          safeJson(`/api/dashboard/attendance/pages`),
        ]);

        setAttSummary({
          attendanceDay: String(as?.attendanceDay || ""),
          clockedIn: Number(as?.clockedIn || 0),
          covers: Number(as?.covers || 0),
        });

        setAttRows(ap?.rows || []);
      } catch (e: any) {
        setErr(e.message || "Failed to load attendance data");
      } finally {
        setLoading(false);
      }
    })();
  }, [session, userStatus]);

  // ✅ compute expected vs clocked
  const expectedKeys = useMemo(() => Object.keys(EXPECTED_PAGES), []);

  const clockedSet = useMemo(() => {
    const set = new Set<string>();
    for (const r of attRows) {
      const shift = String(r.shift || "").toLowerCase();
      const key = String(r.pageKey || "").toLowerCase();
      const isClocked = (Number(r.clockedIn) || 0) > 0 || (Number(r.covers) || 0) > 0;

      if (!isClocked) continue;

      if (shiftFilter === "all" || shiftFilter === shift) {
        set.add(key);
      }
    }
    return set;
  }, [attRows, shiftFilter]);

  const missingList = useMemo(() => {
    const q = missingSearch.trim().toLowerCase();
    const miss = expectedKeys
      .filter((k) => !clockedSet.has(k))
      .map((k) => ({ pageKey: k, pageLabel: EXPECTED_PAGES[k] }));

    if (!q) return miss;

    return miss.filter(
      (x) =>
        x.pageKey.toLowerCase().includes(q) ||
        (x.pageLabel || "").toLowerCase().includes(q)
    );
  }, [expectedKeys, clockedSet, missingSearch]);

  const expectedCount = expectedKeys.length;
  const clockedCount = clockedSet.size;
  const missingCount = expectedCount - clockedCount;

  // UI states
  if (status === "loading") return <div className="card">Loading…</div>;

  if (!session) {
    return (
      <div className="card">
        <h1 className="h1">Not signed in</h1>
        <p className="small">Go to /intro and sign in with Google.</p>
        <div className="spacer" />
        <a className="btn btnPrimary" href="/intro">
          Go to Intro
        </a>
      </div>
    );
  }

  if (userStatus !== "approved") {
    return (
      <div className="card">
        <h1 className="h1">Awaiting approval</h1>
        <p className="small">Your account is pending admin approval.</p>
        <div className="spacer" />
        <a className="btn" href="/intro">
          Back to Intro
        </a>
        <button className="btn" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <h1 className="h1" style={{ marginBottom: 6 }}>
            Attendance Today
          </h1>
          <p className="small">
            Attendance day starts at <b>6:00 AM PH</b>. (Attendance is global unless your bot stores team.)
          </p>
        </div>
        <span className="badge">{loading ? "Refreshing…" : "Live"}</span>
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

      {/* ✅ Shift filter pills */}
      <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
        {(["all", "prime", "midshift", "closing"] as const).map((s) => (
          <button
            key={s}
            className="btn"
            onClick={() => setShiftFilter(s)}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              opacity: shiftFilter === s ? 1 : 0.75,
              border: shiftFilter === s ? "1px solid rgba(120,120,255,.8)" : "1px solid rgba(255,255,255,.08)",
            }}
          >
            {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="spacer" />

      {/* ✅ Status counts */}
      <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span className="badge">Attendance day: {attSummary?.attendanceDay || "—"}</span>
        <span className="badge">Expected: {expectedCount}</span>
        <span className="badge">Clocked in: {clockedCount}</span>
        <span className="badge">Missing: {missingCount}</span>
      </div>

      <div className="hr" />

      {/* ✅ Missing list */}
      <h2 className="h2">Not Clocked In ({shiftFilter})</h2>
      <p className="small">Based on your RAW_PAGES roster.</p>

      <div className="spacer" />

      <input
        placeholder="Search missing pages…"
        value={missingSearch}
        onChange={(e) => setMissingSearch(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 12,
          background: "rgba(255,255,255,.06)",
          border: "1px solid rgba(255,255,255,.10)",
          color: "white",
          outline: "none",
        }}
      />

      <div className="spacer" />

      {missingList.length === 0 ? (
        <p className="small">✅ No missing pages for this filter.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {missingList.map((x) => (
            <div key={x.pageKey} className="card" style={{ padding: 14 }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{x.pageLabel}</div>
                  <div className="small" style={{ opacity: 0.75 }}>#{x.pageKey}</div>
                </div>
                <span className="badge" style={{ border: "1px solid rgba(255,120,120,.35)" }}>
                  Missing
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="hr" />

      {/* Existing attendance table (who clocked in) */}
      <h2 className="h2">Clocked In List</h2>

      <div className="spacer" />

      <div className="card" style={{ padding: 14 }}>
        <div className="row" style={{ fontWeight: 700, opacity: 0.85 }}>
          <div style={{ flex: 1 }}>Shift</div>
          <div style={{ flex: 2 }}>Page</div>
          <div style={{ width: 120, textAlign: "right" }}>Clocked</div>
          <div style={{ width: 120, textAlign: "right" }}>Covers</div>
        </div>
        <div className="hr" />

        {attRows.length === 0 ? (
          <p className="small">No attendance rows found for today yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {attRows.map((r, idx) => (
              <div key={`${r.pageKey}-${r.shift}-${idx}`} className="row" style={{ opacity: 0.95 }}>
                <div style={{ flex: 1 }}>{r.shift}</div>
                <div style={{ flex: 2 }}>{r.pageKey}</div>
                <div style={{ width: 120, textAlign: "right" }}>{r.clockedIn}</div>
                <div style={{ width: 120, textAlign: "right" }}>{r.covers}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
