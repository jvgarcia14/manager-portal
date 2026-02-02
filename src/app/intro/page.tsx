"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function IntroPage() {
  const { data: session, status } = useSession();

  const s: any = session;
  const role = s?.role as string | undefined;
  const userStatus = s?.status as string | undefined;

  return (
    <div className="container">
      <div className="nav">
        <div>
          <div className="badge">🍓 Tasty Media</div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          {session ? (
            <>
              <span className="badge">{session.user?.email}</span>
              <button className="btn" onClick={() => signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <span className="badge">Internal access only</span>
          )}
        </div>
      </div>

      <div className="spacer" />

      <div className="card">
        <h1 className="h1">Manager Portal</h1>
        <p className="h2">
          Secure internal dashboard for sales + attendance monitoring.
        </p>

        <div className="hr" />

        {status === "loading" && <p className="small">Loading session…</p>}

        {status !== "loading" && !session && (
          <div className="row" style={{ alignItems: "center" }}>
            <button className="btn btnPrimary" onClick={() => signIn("google")}>
              Continue with Google
            </button>
            <p className="small" style={{ maxWidth: 520 }}>
              Use your Google email. If you’re new, your account will be created
              automatically and will require admin approval.
            </p>
          </div>
        )}

        {status !== "loading" && session && (
          <>
            <div className="row" style={{ alignItems: "center" }}>
              <span className="badge">
                Signed in as: <b>{session.user?.email}</b>
              </span>
              <span className="badge">Role: {role ?? "manager"}</span>
              <span className="badge">
                Status:{" "}
                {userStatus === "approved" ? "✅ approved" : "⏳ pending"}
              </span>
            </div>

            <div className="spacer" />

            {userStatus !== "approved" ? (
              <div className="card" style={{ background: "rgba(245,158,11,0.10)", borderColor: "rgba(245,158,11,0.35)" }}>
                <p style={{ margin: 0, fontWeight: 700 }}>
                  ⏳ Your account is awaiting admin approval.
                </p>
                <p className="small" style={{ marginTop: 8 }}>
                  Once approved, you’ll be redirected to the dashboard.
                </p>
                <div className="spacer" />
                <button className="btn" onClick={() => signOut()}>
                  Sign out
                </button>
              </div>
            ) : (
              <div className="row" style={{ alignItems: "center" }}>
                <a className="btn btnPrimary" href="/dashboard">
                  Open Dashboard
                </a>
                <button className="btn" onClick={() => signOut()}>
                  Sign out
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="spacer" />

      <div className="card">
        <div className="grid">
          <div>
            <p className="kpiTitle">What you’ll see</p>
            <p className="kpiValue" style={{ fontSize: 18 }}>
              Sales charts, goal progress, attendance status
            </p>
            <p className="small">
              This portal only reads data from your existing bot databases. No bot
              code changes required.
            </p>
          </div>
          <div className="row">
            <div className="kpi" style={{ flex: 1 }}>
              <p className="kpiTitle">Security</p>
              <p className="kpiValue">Google Login</p>
              <p className="small">Admin approval required.</p>
            </div>
            <div className="kpi" style={{ flex: 1 }}>
              <p className="kpiTitle">Access</p>
              <p className="kpiValue">Internal</p>
              <p className="small">Controlled by you.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
