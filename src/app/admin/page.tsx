"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signIn } from "next-auth/react";

type UserRow = {
  id: number;
  email: string;
  name: string | null;
  role: "admin" | "manager";
  status: "approved" | "pending" | "rejected";
  created_at: string;
  last_login_at: string | null;
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const myEmail = session?.user?.email?.toLowerCase() ?? "";

  const pendingCount = useMemo(
    () => users.filter((u) => u.status === "pending").length,
    [users]
  );

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to load");
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e: any) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(id: number, patch: Partial<Pick<UserRow, "status" | "role">>) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error || "Update failed");
      return;
    }

    const data = await res.json();
    const updated: UserRow = data.user;

    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status]);

  if (status === "loading") {
    return <div className="min-h-screen bg-[#050816] text-white p-8">Loading…</div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#050816] text-white p-8 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-xl font-semibold">Admin</h1>
          <p className="text-white/70 mt-2">Please sign in to continue.</p>
          <button
            onClick={() => signIn("google")}
            className="mt-5 w-full rounded-xl bg-white text-black font-medium py-2"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Admin approvals</h1>
            <p className="text-white/60 mt-1">
              Signed in as <span className="text-white/90">{myEmail}</span>
            </p>
            <div className="mt-3 flex gap-2">
              <Badge>{pendingCount} pending</Badge>
              <Badge>{users.length} total</Badge>
            </div>
          </div>

          <button
            onClick={load}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="text-sm text-white/70">Users</div>
            {err ? <div className="text-sm text-red-300">{err}</div> : null}
          </div>

          {loading ? (
            <div className="p-6 text-white/70">Loading users…</div>
          ) : (
            <div className="divide-y divide-white/10">
              {users.map((u) => (
                <div key={u.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="font-medium">{u.email}</div>
                    <div className="text-sm text-white/60">
                      {u.name || "—"} · role: <span className="text-white/80">{u.role}</span> · status:{" "}
                      <span className="text-white/80">{u.status}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateUser(u.id, { status: "approved" })}
                      className="rounded-xl bg-emerald-400/15 border border-emerald-400/30 px-3 py-2 text-sm hover:bg-emerald-400/20"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateUser(u.id, { status: "rejected" })}
                      className="rounded-xl bg-red-400/15 border border-red-400/30 px-3 py-2 text-sm hover:bg-red-400/20"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => updateUser(u.id, { status: "pending" })}
                      className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
                    >
                      Set pending
                    </button>

                    <div className="w-px bg-white/10 mx-1" />

                    <button
                      onClick={() => updateUser(u.id, { role: "admin", status: "approved" })}
                      className="rounded-xl bg-indigo-400/15 border border-indigo-400/30 px-3 py-2 text-sm hover:bg-indigo-400/20"
                    >
                      Make admin
                    </button>
                    <button
                      onClick={() => updateUser(u.id, { role: "manager" })}
                      className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
                    >
                      Make manager
                    </button>
                  </div>
                </div>
              ))}

              {users.length === 0 ? (
                <div className="p-6 text-white/70">No users yet.</div>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-white/50">
          Tip: tell your teammates to visit <span className="text-white/70">/intro</span> once — they’ll appear here as pending.
        </div>
      </div>
    </div>
  );
}
