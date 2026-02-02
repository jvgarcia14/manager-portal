import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { websiteDb } from "@/lib/db";

export const runtime = "nodejs";

function parseAdminEmails(v?: string) {
  return (v || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function ensureUserRow(email: string) {
  const db = websiteDb();

  // Create table if not exists (safe for demo)
  await db.query(`
    CREATE TABLE IF NOT EXISTS portal_users (
      email TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      role   TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const existing = await db.query(
    `SELECT email, status, role FROM portal_users WHERE email=$1 LIMIT 1`,
    [email]
  );

  if (existing.rows.length === 0) {
    await db.query(
      `INSERT INTO portal_users (email, status, role) VALUES ($1, 'pending', 'user')`,
      [email]
    );
    return { status: "pending", role: "user" };
  }

  return {
    status: String(existing.rows[0].status || "pending"),
    role: String(existing.rows[0].role || "user"),
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, user }) {
      // persist email into token
      if (user?.email) token.email = user.email;
      return token;
    },

    async session({ session, token }) {
      const email = String(token.email || session.user?.email || "").toLowerCase();
      const admins = parseAdminEmails(process.env.ADMIN_EMAILS);

      // Default
      (session as any).status = "pending";
      (session as any).role = "user";

      if (!email) return session;

      // Admin override from Railway ENV
      if (admins.includes(email)) {
        (session as any).status = "approved";
        (session as any).role = "admin";
        return session;
      }

      // Otherwise read approval from website DB
      try {
        const row = await ensureUserRow(email);
        (session as any).status = row.status;
        (session as any).role = row.role;
      } catch {
        // If DB down, stay pending (safe)
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
