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

  // ✅ Ticket badge (open tickets count) - safe even if API fails
  const [ticketBadge, setTicketBadge] = React.useState<number>(0);

  React.useEffect(() => {
    // only fetch if user is logged in (optional safety)
    if (!session) return;

    fetch("/api/tickets", { cache: "no-store" as any })
      .then((r) => r.json())
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        const openCount = rows.filter((t: any) => String(t?.status || "").toLowerCase() === "open").length;
        setTicketBadge(openCount);
      })
      .catch(() => {
        // fail silently so it never breaks layout
      });
  }, [session]);

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

        {/* ✅ NEW: Masterlist (everyone can access, same as roster) */}
        <Link
          href="/dashboard/masterlist"
          className="btn"
          style={tabStyle(isActive("/dashboard/masterlist")) as any}
        >
          Masterlist
        </Link>

        {/* ✅ Everyone can access roster (editable by any approved user) */}
        <Link href="/dashboard/roster" className="btn" style={tabStyle(isActive("/dashboard/roster")) as any}>
          Roster
        </Link>

        {/* ✅ NEW: Tickets (everyone can access) */}
        <Link
          href="/dashboard/tickets"
          className="btn"
          style={{
            ...(tabStyle(isActive("/dashboard/tickets")) as any),
            position: "relative",
            paddingRight: ticketBadge > 0 ? "34px" : (tabStyle(isActive("/dashboard/tickets")) as any).padding,
          }}
        >
          Tickets
          {ticketBadge > 0 ? (
            <span
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                borderRadius: 999,
                padding: "2px 8px",
                fontSize: 12,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(120,120,255,.18)",
              }}
            >
              {ticketBadge}
            </span>
          ) : null}
        </Link>

        {/* ✅ Admin page shortcut (admin only) */}
        {isAdmin ? (
          <Link href="/admin" className="btn" style={tabStyle(isActive("/admin")) as any}>
            Admin
          </Link>
        ) : null}

        {/* ✅ Pages manager (admin only) */}
        {isAdmin ? (
          <Link href="/dashboard/pages" className="btn" style={tabStyle(isActive("/dashboard/pages")) as any}>
            Pages
          </Link>
        ) : null}
      </div>

      <div className="spacer" />

      {children}
    </div>
  );
}