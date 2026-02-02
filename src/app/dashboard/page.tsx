"use client";

import { useSession, signOut } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const s: any = session;
  const userStatus = s?.status;

  if (status === "loading") {
    return (
      <div className="container">
        <div className="card">Loading…</div>
      </div>
    );
  }

  // Not logged in -> tell them to go intro
  if (!session) {
    return (
      <div className="container">
        <div className="card">
          <h1 className="h1">Not signed in</h1>
          <p className="small">Go to /intro and sign in with Google.</p>
          <div className="spacer" />
          <a className="btn btnPrimary" href="/intro">
            Go to Intro
          </a>
        </div>
      </div>
    );
  }

  // Logged in but not approved
  if (userStatus !== "approved") {
    return (
      <div className="container">
        <div className="card">
          <h1 className="h1">Awaiting approval</h1>
          <p className="small">
            Your account is pending admin approval. You can’t access the
            dashboard yet.
          </p>
          <div className="spacer" />
          <a className="btn" href="/intro">
            Back to Intro
          </a>
          <button className="btn" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // Approved
  return (
    <div className="container">
      <div className="nav">
        <div className="row" style={{ gap: 10 }}>
          <span className="badge">🍓 Tasty Media</span>
          <span className="badge">Dashboard</span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span className="badge">{session.user?.email}</span>
          <button className="btn" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>

      <div className="spacer" />

      <div className="card">
        <h1 className="h1">Overview</h1>
        <p className="h2">This is your starting dashboard UI.</p>

        <div className="spacer" />

        <div className="row">
          <div className="kpi" style={{ flex: 1 }}>
            <p className="kpiTitle">Today Sales</p>
            <p className="kpiValue">$0.00</p>
            <p className="small">Next: connect Sales DB queries.</p>
          </div>
          <div className="kpi" style={{ flex: 1 }}>
            <p className="kpiTitle">On shift</p>
            <p className="kpiValue">0</p>
            <p className="small">Next: connect Attendance DB queries.</p>
          </div>
          <div className="kpi" style={{ flex: 1 }}>
            <p className="kpiTitle">Red pages</p>
            <p className="kpiValue">0</p>
            <p className="small">Next: compute goal progress.</p>
          </div>
        </div>

        <div className="hr" />

        <p className="small">
          Next step: I’ll add API routes that **read your existing salescheck
          Postgres** and **attendance Postgres** and display charts here.
        </p>
      </div>
    </div>
  );
}
