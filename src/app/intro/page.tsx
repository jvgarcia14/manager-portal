"use client";

import { signIn, useSession } from "next-auth/react";

export default function IntroPage() {
  const { data: session, status } = useSession();

  return (
    <main style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Tasty Media</h1>
      <p style={{ marginTop: 0, marginBottom: 24 }}>Internal manager portal.</p>

      {status === "loading" && <p>Loading...</p>}

      {status !== "loading" && !session && (
        <button
          onClick={() => signIn("google")}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Sign in with Google
        </button>
      )}

      {session && (
        <div style={{ marginTop: 16 }}>
          <p>
            Signed in as: <b>{session.user?.email}</b>
          </p>

          {(session as any).status !== "approved" && (
            <p>⏳ Your account is awaiting admin approval.</p>
          )}

          {(session as any).status === "approved" && (
            <a href="/dashboard">Go to dashboard</a>
          )}
        </div>
      )}
    </main>
  );
}
