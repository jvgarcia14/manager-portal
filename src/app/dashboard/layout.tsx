"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const s: any = session;
  const role = String(s?.role || "user");
  const isAdmin = role.toLowerCase() === "admin";

  const tabStyle = (active: boolean) => ({
    borderRadius: 999,
    padding: "10px 14px",
    opacity: active ? 1 : 0.75,
    border: active ? "1px solid rgba(120,120,255,.8)" : "1px solid rgba(255,255,255,.08)",
    background: "transparent",
  });

  // ✅ active if exact OR subpages
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="container">
      <div className="nav">
        <div className="row" style={{ gap: 10 }}>
          <span className="badge">🍓 Tasty Media</span>
          <span className="badge">Dashboard</span>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <span className="badge">{session?.user?.email || "—"}</span>
          <span className="badge">Role: {role}</span>
          <button className="btn" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>

      <div className="spacer" />

      {/* Tabs */}
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <Link href="/dashboard" className="btn" style={tabStyle(isActive("/dashboard")) as any}>
          Sales
        </Link>

        <Link
          href="/dashboard/attendance"
          className="btn"
          style={tabStyle(isActive("/dashboard/attendance")) as any}
        >
          Attendance
        </Link>

        {/* ✅ Everyone can access roster (editable by any approved user) */}
        <Link
          href="/dashboard/roster"
          className="btn"
          style={tabStyle(isActive("/dashboard/roster")) as any}
        >
          Roster
        </Link>

        {/* ✅ Admin page shortcut (admin only) */}
        {isAdmin ? (
          <Link href="/admin" className="btn" style={tabStyle(isActive("/admin")) as any}>
            Admin
          </Link>
        ) : null}
      </div>

      <div className="spacer" />

      {children}
    </div>
  );
}
