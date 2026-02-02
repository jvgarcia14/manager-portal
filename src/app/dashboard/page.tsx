"use client";

import { useSession, signOut } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  const userStatus =
    (session as any)?.status ??
    (session as any)?.user?.status ??
    "pending";

  if (status === "loading") {
    return (
      <div className="container">
        <div className="card">Loading…</div>
      </div>
    );
  }

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

  if (userStatus !== "approved") {
    return (
      <div className="container">
        <div className="card">
          <h1 className="h1">Awaiting approval</h1>
          <p className="small">
            Your account is pending admin approval. You can’t access the dashboard yet.
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
        <p className="small">Sales + attendance monitoring will show here.</p>

        <div className="spacer" />

        <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
          <div className="card" style={{ flex: 1, minWidth: 220 }}>
            <p className="small">Today Sales</p>
            <p className="h2">$0.00</p>
            <p className="small">Next: connect Sales DB queries.</p>
          </div>

          <div className="card" style={{ flex: 1, minWidth: 220 }}>
            <p className="small">On shift</p>
            <p className="h2">0</p>
            <p className="small">Next: connect Attendance DB queries.</p>
          </div>

          <div className="card" style={{ flex: 1, minWidth: 220 }}>
            <p className="small">Red pages</p>
            <p className="h2">0</p>
            <p className="small">Next: compute goal progress.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
