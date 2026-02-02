"use client";

import { signOut } from "next-auth/react";

export default function DashboardClient({
  email,
  role,
}: {
  email: string;
  role: string;
}) {
  return (
    <div className="container">
      <div className="nav">
        <div className="row" style={{ gap: 10 }}>
          <span className="badge">🍓 Tasty Media</span>
          <span className="badge">Dashboard</span>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <span className="badge">{email}</span>
          <span className="badge">Role: {role}</span>
          <button className="btn" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>

      <div className="spacer" />

      <div className="card">
        <h1 className="h1">Overview</h1>
        <p className="small">
          This is the dashboard shell. Next we’ll load Sales + Attendance from Postgres.
        </p>

        <div className="spacer" />

        <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
          <div className="card" style={{ flex: 1, minWidth: 240 }}>
            <p className="small">Today Sales</p>
            <p className="h2">$0.00</p>
            <p className="small">Next: read from Sales DB.</p>
          </div>

          <div className="card" style={{ flex: 1, minWidth: 240 }}>
            <p className="small">On shift</p>
            <p className="h2">0</p>
            <p className="small">Next: read from Attendance DB.</p>
          </div>

          <div className="card" style={{ flex: 1, minWidth: 240 }}>
            <p className="small">Red pages</p>
            <p className="h2">0</p>
            <p className="small">Next: compute goal progress.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
