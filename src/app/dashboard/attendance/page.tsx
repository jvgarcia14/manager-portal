"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";

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

export default function AttendancePage() {
  const { data: session, status } = useSession();
  const s: any = session;
  const userStatus = s?.status;

  const [attSummary, setAttSummary] = useState<{ attendanceDay: string; clockedIn: number; covers: number } | null>(
    null
  );
  const [attRows, setAttRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

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

  // UI states (same behavior as dashboard page)
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

      <div className="card" style={{ padding: 14 }}>
        <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
          <span className="badge">Attendance day: {attSummary?.attendanceDay || "—"}</span>
          <span className="badge">Clocked in: {attSummary?.clockedIn || 0}</span>
          <span className="badge">Covers: {attSummary?.covers || 0}</span>
        </div>

        <div className="spacer" />

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
