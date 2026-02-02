"use client";

import { useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function IntroPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const s: any = session;
  const userStatus = s?.status; // "approved" | "pending" etc

  useEffect(() => {
    if (status !== "authenticated") return;
    if (userStatus === "approved") {
      router.replace("/dashboard");
    }
  }, [status, userStatus, router]);

  if (status === "loading") {
    return (
      <div className="container">
        <div className="card">Loading…</div>
      </div>
    );
  }

  // Not signed in
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

        <div className="card">
          <h1 className="h1">Manager Portal</h1>
          <p className="small">
            Sign in with Google. Admin approval is required.
          </p>

          <div className="spacer" />

          <button className="btn btnPrimary" onClick={() => signIn("google")}>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Signed in (pending)
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
            Your account is pending admin approval. Once approved, you’ll be
            redirected automatically.
          </p>
        </div>
      </div>
    );
  }

  // Approved (brief screen while redirect happens)
  return (
    <div className="container">
      <div className="card">Approved — redirecting to dashboard…</div>
    </div>
  );
}
