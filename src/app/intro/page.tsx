"use client";

import { signIn, useSession } from "next-auth/react";

export default function IntroPage() {
  const { data: session } = useSession();

  return (
    <main style={{ padding: 40 }}>
      <h1>Tasty Media</h1>
      <p>Internal manager portal.</p>

      {!session && (
        <button onClick={() => signIn("google")}>
          Sign in with Google
        </button>
      )}

      {session && (session as any).status !== "approved" && (
        <p>⏳ Your account is awaiting admin approval.</p>
      )}

      {session && (session as any).status === "approved" && (
        <a href="/dashboard">Go to dashboard</a>
      )}
    </main>
  );
}
