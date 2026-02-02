"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";

type WebUser = {
  id: number;
  email: string;
  name: string | null;
  role: "admin" | "manager";
  status: "pending" | "approved" | "rejected";
  created_at: string;
  last_login_at: string | null;
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const myEmail = (session?.user?.email || "").toLowerCase();
  const myRole = (session as any)?.role;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [users, setUsers] = useState<WebUser[]>([]);

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
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to load users");
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(id: number, patch: Partial<Pick<WebUser, "status" | "role">>) {
    setErr(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Update failed");
      }
      await load();
    } catch (e: any) {
      setErr(e?.message || "Error");
    }
  }

  useEffect(() => {
    if (status === "authenticated" && myRole === "admin") load();
  }, [status, myRole]);

  if (status === "loading") return <div className="min-h-screen bg-[#050816] text-white p-10">Loading…</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-[#050816] text-white p-10">
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-white/70 mt-2">Please sign in first.</p>
        </div>
      </div>
    );
  }

  if (myRole !== "admin") {
    return (
      <div className="min-h-screen bg-[#050816] text-white p-10">
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-semibold">Access denied</h1>
          <p className="text-white/70 mt-2">Only admins can view this page.</p>
          <button
            onClick={() => signOut({ callbackUrl: "/intro" })}
            className="mt-4 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Admin approvals</h1>
            <p className="text-white/60 mt-1">
              Signed in as <span className="text-white/90">{myEmail}</span>
            </p>
            <div className="mt-3 flex gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
                Pending: <b className="text-white">{pendingCount}</b>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
                Total: <b className="text-white">{users.length}</b>
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={load}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              Refresh
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/intro" })}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="text-sm text-white/70">Users</div>
            {err ? <div className="text-sm text-red-300">{err}</div> : null}
          </div>

          {loading ? (
            <div className="p-6 text-white/70">Loading users…</div>
          ) : (
            <div className="divide-y divide-white/10">
              {users.map((u) => (
                <div key={u.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                  <div className="flex-1">
                    <div className="font-medium">{u.email}</div>
                    <div className="text-xs text-white/60">
                      {u.name || "—"} • created {new Date(u.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60">Role</span>
                    <select
                      value={u.role}
                      onChange={(e) => updateUser(u.id, { role: e.target.value as any })}
                      className="rounded-lg border border-white/10 bg-[#050816] px-2 py-1 text-sm"
                    >
                      <option value="manager">manager</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60">Status</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs border ${
                        u.status === "approved"
                          ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                          : u.status === "rejected"
                          ? "border-red-300/30 bg-red-400/10 text-red-200"
                          : "border-amber-300/30 bg-amber-400/10 text-amber-200"
                      }`}
                    >
                      {u.status}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => updateUser(u.id, { status: "approved" })}
                      className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateUser(u.id, { status: "rejected" })}
                      className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => updateUser(u.id, { status: "pending" })}
                      className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
                    >
                      Pending
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
      </div>
    </div>
  );
}
