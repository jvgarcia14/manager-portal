"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";

type UserRow = { email: string; status: string; role: string; created_at: string };

export default function AdminPage() {
  const { data: session, status } = useSession();
  const s: any = session;
  const userStatus = s?.status;
  const role = s?.role;

  const [rows, setRows] = useState<UserRow[]>([]);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data?.error || "Failed");
      setRows(data.rows || []);
    } catch {
      setErr(text.slice(0, 250));
    }
  };

  useEffect(() => {
    if (userStatus === "approved" && role === "admin") load();
  }, [userStatus, role]);

  if (status === "loading") return <div className="container"><div className="card">Loading…</div></div>;
  if (!session) return <div className="container"><div className="card">Not signed in. <a className="btn" href="/intro">Go to Intro</a></div></div>;

  if (userStatus !== "approved") {
    return (
      <div className="container">
        <div className="card">
          <h1 className="h1">Awaiting approval</h1>
          <p className="small">You can’t access admin tools until approved.</p>
          <div className="spacer" />
          <a className="btn" href="/intro">Back</a>
          <button className="btn" onClick={() => signOut()}>Sign out</button>
        </div>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="container">
        <div className="card">
          <h1 className="h1">Admin only</h1>
          <p className="small">Your account is approved but not an admin.</p>
          <div className="spacer" />
          <a className="btn" href="/dashboard">Go to Dashboard</a>
        </div>
      </div>
    );
  }

  const approve = async (email: string) => {
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, status: "approved" }),
    });
    load();
  };

  return (
    <div className="container">
      <div className="nav">
        <div className="row">
          <span className="badge">🍓 Tasty Media</span>
          <span className="badge">Admin</span>
        </div>
        <div className="row">
          <span className="badge">{session.user?.email}</span>
          <button className="btn" onClick={() => signOut()}>Sign out</button>
        </div>
      </div>

      <div className="spacer" />

      <div className="card">
        <h1 className="h1" style={{ marginBottom: 6 }}>User approvals</h1>
        <p className="small">Approve accounts to unlock dashboard access.</p>

        <div className="spacer" />

        {err ? <div className="errorBox"><div className="small">{err}</div></div> : null}

        <div className="spacer" />

        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th>Role</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email}>
                <td>{r.email}</td>
                <td>{r.status}</td>
                <td>{r.role}</td>
                <td>{r.created_at}</td>
                <td>
                  {r.status !== "approved" ? (
                    <button className="btn btnPrimary" onClick={() => approve(r.email)}>Approve</button>
                  ) : (
                    <span className="badge">Approved</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="spacer" />
        <a className="btn" href="/dashboard">Back to Dashboard</a>
      </div>
    </div>
  );
}
