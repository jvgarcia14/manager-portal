"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function IntroPage() {
  const { data: session, status } = useSession();
  const s: any = session;
  const userStatus = s?.status;
  const role = s?.role ?? "user";

  return (
    <div className="container">
      <div className="nav">
        <div className="row">
          <span className="badge">🍓 Tasty Media</span>
          <span className="badge">Internal Manager Portal</span>
        </div>
        <div className="row">
          {session ? (
            <button className="btn" onClick={() => signOut()}>
              Sign out
            </button>
          ) : null}
        </div>
      </div>

      <div className="spacer" />

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 14 }}>
        <div className="card">
          <h1 className="h1">Manager Portal</h1>
          <p className="h2">Secure internal dashboard for sales + attendance monitoring.</p>

          <div className="spacer" />

          {status === "loading" ? (
            <div className="cardSoft">Loading session…</div>
          ) : !session ? (
            <div className="cardSoft">
              <p className="small" style={{ marginTop: 0 }}>
                Sign in with Google. New accounts require admin approval before access.
              </p>
              <div className="spacer" />
              <button className="btn btnPrimary" onClick={() => signIn("google")}>
                Sign in with Google
              </button>
            </div>
          ) : (
            <div className="cardSoft">
              <div className="row">
                <span className="badge">{userStatus === "approved" ? "✅ Approved" : "⏳ Pending"}</span>
                <span className="badge">Role: {role}</span>
              </div>
              <div className="spacer" />
              <div className="small">Signed in as</div>
              <div style={{ fontWeight: 700, marginTop: 6 }}>{session.user?.email}</div>

              <div className="spacer" />

              {userStatus === "approved" ? (
                <>
                  <div className="small">✅ Approved. You can access the dashboard.</div>
                  <div className="spacer" />
                  <div className="row">
                    <a className="btn btnPrimary" href="/dashboard">
                      Go to Dashboard →
                    </a>
                    {role === "admin" ? (
                      <a className="btn" href="/admin">
                        Admin page
                      </a>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="small">
                    ⏳ Your account is pending admin approval. You can’t access the dashboard yet.
                  </div>
                  <div className="spacer" />
                  <button className="btn" onClick={() => signOut()}>
                    Sign out
                  </button>
                </>
              )}
            </div>
          )}

          <div className="spacer" />
          <div className="small">© 2026 Tasty Media — Internal use only.</div>
        </div>

        <div className="card">
          <h2 style={{ margin: 0, fontSize: 18 }}>What you’ll see</h2>
          <div className="spacer" />
          <div className="small">📈 Sales charts, goal progress, and performance snapshots</div>
          <div className="small">🕒 Attendance and daily activity monitoring</div>
          <div className="small">🔎 Read-only view into your existing bot databases</div>

          <div className="hr" />

          <h2 style={{ margin: 0, fontSize: 18 }}>Security</h2>
          <div className="spacer" />
          <div className="small">Google login + admin approval required. Access is controlled by you.</div>
          <div className="spacer" />
          <div className="row">
            <span className="badge">Google OAuth</span>
            <span className="badge">Admin approval</span>
            <span className="badge">Internal only</span>
          </div>

          <div className="hr" />

          <h2 style={{ margin: 0, fontSize: 18 }}>Next step</h2>
          <div className="spacer" />
          <div className="small">Click “Go to Dashboard” to view teams, sales, and attendance overview.</div>
        </div>
      </div>
    </div>
  );
}
