"use client";

import { signIn, signOut, useSession } from "next-auth/react";

function StatusPill({ status }: { status: string }) {
  const isApproved = status === "approved";
  const isPending = status === "pending";

  const base =
    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border";
  const approved =
    "bg-emerald-50 text-emerald-700 border-emerald-200";
  const pending =
    "bg-amber-50 text-amber-700 border-amber-200";
  const unknown =
    "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span className={`${base} ${isApproved ? approved : isPending ? pending : unknown}`}>
      <span
        className={`h-2 w-2 rounded-full ${
          isApproved ? "bg-emerald-500" : isPending ? "bg-amber-500" : "bg-slate-400"
        }`}
      />
      {isApproved ? "Approved" : isPending ? "Pending approval" : status}
    </span>
  );
}

export default function IntroPage() {
  const { data: session, status } = useSession();

  const role = (session as any)?.role as string | undefined;
  const userStatus = ((session as any)?.status as string | undefined) ?? "pending";
  const email = session?.user?.email ?? "";

  const loading = status === "loading";
  const authed = !!session;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10">
            <span className="text-lg">🍓</span>
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-slate-200">
              Tasty Media
            </div>
            <div className="text-xs text-slate-400">Internal Manager Portal</div>
          </div>
        </div>

        {authed ? (
          <button
            onClick={() => signOut({ callbackUrl: "/intro" })}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 ring-1 ring-white/10 hover:bg-white/15"
          >
            Sign out
          </button>
        ) : (
          <span className="text-xs text-slate-400">Secure access</span>
        )}
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-5xl px-6 pb-14">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: Hero */}
          <section className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
            <h1 className="text-2xl font-bold leading-tight">
              Manager Portal
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Secure internal dashboard for sales + attendance monitoring.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {loading ? (
                <span className="text-sm text-slate-400">Loading session…</span>
              ) : !authed ? (
                <button
                  onClick={() => signIn("google", { callbackUrl: "/intro" })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                >
                  <span className="text-base">G</span>
                  Sign in with Google
                </button>
              ) : (
                <>
                  <StatusPill status={userStatus} />
                  <span className="text-xs text-slate-400">
                    Role: <span className="text-slate-200">{role ?? "manager"}</span>
                  </span>
                </>
              )}
            </div>

            {authed && (
              <div className="mt-6 rounded-xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-slate-400">Signed in as</div>
                <div className="mt-1 break-all text-sm font-semibold text-slate-100">
                  {email}
                </div>

                {userStatus !== "approved" ? (
                  <div className="mt-3 text-sm text-amber-200">
                    ⏳ Your account is awaiting admin approval.
                    <div className="mt-1 text-xs text-slate-400">
                      Once approved, you’ll be redirected to the dashboard.
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-emerald-200">
                    ✅ Approved. You can access the dashboard.
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Right: Info cards */}
          <section className="grid gap-4">
            <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
              <h2 className="text-sm font-semibold text-slate-100">What you’ll see</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-[2px]">📈</span>
                  Sales charts, goal progress, and performance snapshots
                </li>
                <li className="flex gap-2">
                  <span className="mt-[2px]">🕒</span>
                  Attendance and daily activity monitoring
                </li>
                <li className="flex gap-2">
                  <span className="mt-[2px]">🔎</span>
                  Read-only view into your existing bot databases
                </li>
              </ul>
            </div>

            <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
              <h2 className="text-sm font-semibold text-slate-100">Security</h2>
              <p className="mt-3 text-sm text-slate-300">
                Google login + admin approval required. Access is controlled by you.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10">
                  Google OAuth
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10">
                  Admin approval
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10">
                  Internal only
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
              <h2 className="text-sm font-semibold text-slate-100">Next step</h2>
              <p className="mt-3 text-sm text-slate-300">
                Build the admin page so you can approve users and unlock the dashboard.
              </p>
            </div>
          </section>
        </div>

        <footer className="mt-10 text-xs text-slate-500">
          © {new Date().getFullYear()} Tasty Media — Internal use only.
        </footer>
      </main>
    </div>
  );
}
