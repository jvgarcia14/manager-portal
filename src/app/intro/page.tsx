"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function IntroPage() {
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

  // NOT SIGNED IN
  if (!session) {
    return (
      <div className="container">
        <div className="nav">
          <div className="row" style={{ gap: 10 }}>
            <span className="badge">🍓 Tasty Media</span>
            <span className="badge">Internal Manager Portal</span>
          </div>
        </div>

        <div className="spacer" />

        <div className="grid2">
          <div className="card">
            <h1 className="h1">Manager Portal</h1>
            <p className="small">
              Secure internal dashboard for sales + attendance monitoring.
            </p>

            <div className="spacer" />

            <button className="btn btnPrimary" onClick={() => signIn("google")}>
              Sign in with Google
            </button>
          </div>

          <div className="card">
            <p className="h2">What you’ll see</p>
            <div className="spacer" />
            <div className="list">
              <div className="row" style={{ gap: 10 }}>
                <span>📈</span>
                <span className="small">
                  Sales charts, goal progress, and performance snapshots
                </span>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <span>🕒</span>
                <span className="small">Attendance and daily activity monitoring</span>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <span>🔎</span>
                <span className="small">
                  Read-only view into your existing bot databases
                </span>
              </div>
            </div>

            <div className="spacer" />
            <div className="hr" />
            <div className="spacer" />

            <p className="h2">Security</p>
            <p className="small">
              Google login + admin approval required. Access is controlled by you.
            </p>

            <div className="spacer" />
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <span className="badge">Google OAuth</span>
              <span className="badge">Admin approval</span>
              <span className="badge">Internal only</span>
            </div>
          </div>
        </div>

        <div className="spacer" />
        <p className="small" style={{ opacity: 0.7 }}>
          © 2026 Tasty Media — Internal use only.
        </p>
      </div>
    );
  }

  // SIGNED IN but NOT APPROVED
  if (userStatus !== "approved") {
    return (
      <div className="container">
        <div className="nav">
          <div className="row" style={{ gap: 10 }}>
            <span className="badge">🍓 Tasty Media</span>
            <span className="badge">Internal Manager Portal</span>
          </div>
          <button className="btn" onClick={() => signOut()}>
            Sign out
          </button>
        </div>

        <div className="spacer" />

        <div className="card">
          <h1 className="h1">Awaiting approval</h1>
          <p className="small">
            Signed in as <b>{session.user?.email}</b>
          </p>
          <div className="spacer" />
          <p className="small">
            Your account is pending admin approval. You can’t access the dashboard
            yet.
          </p>

          <div className="spacer" />
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <a className="btn" href="/admin">
              Admin page
            </a>
            <button className="btn" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ APPROVED (THIS IS WHERE WE ADD THE BUTTON)
  return (
    <div className="container">
      <div className="nav">
        <div className="row" style={{ gap: 10 }}>
          <span className="badge">🍓 Tasty Media</span>
          <span className="badge">Internal Manager Portal</span>
        </div>
        <button className="btn" onClick={() => signOut()}>
          Sign out
        </button>
      </div>

      <div className="spacer" />

      <div className="grid2">
        <div className="card">
          <h1 className="h1">Manager Portal</h1>
          <p className="small">
            Secure internal dashboard for sales + attendance monitoring.
          </p>

          <div className="spacer" />

          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <span className="badge">✅ Approved</span>
            <span className="badge">Role: {s?.role ?? "admin"}</span>
          </div>

          <div className="spacer" />

          <div className="card">
            <p className="small" style={{ opacity: 0.8 }}>
              Signed in as
            </p>
            <p className="h2">{session.user?.email}</p>
            <div className="spacer" />
            <p className="small">✅ Approved. You can access the dashboard.</p>

            <div className="spacer" />

            {/* ✅ HERE IS THE BUTTON YOU ASKED FOR */}
            <a className="btn btnPrimary" href="/dashboard">
              Go to Dashboard →
            </a>
          </div>
        </div>

        <div className="card">
          <p className="h2">What you’ll see</p>
          <div className="spacer" />
          <div className="list">
            <div className="row" style={{ gap: 10 }}>
              <span>📈</span>
              <span className="small">
                Sales charts, goal progress, and performance snapshots
              </span>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <span>🕒</span>
              <span className="small">Attendance and daily activity monitoring</span>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <span>🔎</span>
              <span className="small">
                Read-only view into your existing bot databases
              </span>
            </div>
          </div>

          <div className="spacer" />
          <div className="hr" />
          <div className="spacer" />

          <p className="h2">Next step</p>
          <p className="small">
            Click “Go to Dashboard” to see your sales and attendance overview.
          </p>

          <div className="spacer" />
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <a className="btn" href="/admin">
              Admin page
            </a>
            <a className="btn" href="/dashboard">
              Dashboard
            </a>
          </div>
        </div>
      </div>

      <div className="spacer" />
      <p className="small" style={{ opacity: 0.7 }}>
        © 2026 Tasty Media — Internal use only.
      </p>
    </div>
  );
}
