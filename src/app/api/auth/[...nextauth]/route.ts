// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { ensureWebsiteSchema, websitePool } from "@/lib/websiteDb";

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  // Supports: "a@x.com,b@y.com" OR "a@x.com; b@y.com" OR newline separated
  const emails = raw
    .split(/[,;\n]/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return new Set(emails);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },

  callbacks: {
    /**
     * Runs on every sign-in.
     * - Ensures website schema exists
     * - Upserts user into web_users
     * - If email is in ADMIN_EMAILS => auto role=admin and status=approved
     */
    async signIn({ user }) {
      if (!user?.email) return false;

      const email = user.email.toLowerCase();
      const adminEmails = getAdminEmails();
      const isAdmin = adminEmails.has(email);

      // Create table if missing (safe to call multiple times)
      await ensureWebsiteSchema();

      await websitePool.query(
        `
        INSERT INTO web_users (email, name, role, status, last_login_at)
        VALUES ($1, $2, $3, $4, now())
        ON CONFLICT (email)
        DO UPDATE SET
          name = EXCLUDED.name,
          role = CASE
            WHEN $5 = true THEN 'admin'
            ELSE web_users.role
          END,
          status = CASE
            WHEN $5 = true THEN 'approved'
            ELSE web_users.status
          END,
          last_login_at = now()
        `,
        [
          email,
          user.name ?? null,
          // insert defaults:
          isAdmin ? "admin" : "manager",
          isAdmin ? "approved" : "pending",
          isAdmin,
        ]
      );

      return true;
    },

    /**
     * Put role/status into the JWT so the client can read it.
     */
    async jwt({ token }) {
      const email = token.email ? String(token.email).toLowerCase() : null;
      if (!email) return token;

      await ensureWebsiteSchema();

      const { rows } = await websitePool.query(
        `SELECT role, status FROM web_users WHERE email = $1`,
        [email]
      );

      if (rows?.length) {
        token.role = rows[0].role;
        token.status = rows[0].status;
      } else {
        token.role = "manager";
        token.status = "pending";
      }

      return token;
    },

    /**
     * Expose role/status on session.user
     */
    async session({ session, token }) {
      (session as any).role = token.role;
      (session as any).status = token.status;

      // (optional) also attach to session.user for convenience
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).status = token.status;
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
