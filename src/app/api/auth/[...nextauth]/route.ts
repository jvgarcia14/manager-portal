import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { websiteDb } from "@/lib/db";

function parseAdminEmails(v?: string) {
  return (v || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// ✅ Export this so requireApproved.ts can import it
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      // keep email on token
      if (profile?.email) token.email = profile.email;
      return token;
    },
    async session({ session, token }) {
      const email = String(token.email || session.user?.email || "").toLowerCase();
      (session.user as any).email = email;

      // default
      (session as any).status = "pending";
      (session as any).role = "user";

      // ✅ Admin override via env var
      const admins = parseAdminEmails(process.env.ADMIN_EMAILS);
      if (admins.includes(email)) {
        (session as any).status = "approved";
        (session as any).role = "admin";
        return session;
      }

      // ✅ Otherwise check approval from WEBSITE DB
      // Expected table: portal_users(email text unique, status text)
      // If your table name differs, update here.
      try {
        const db = websiteDb();
        const r = await db.query(
          `SELECT status FROM portal_users WHERE lower(email)=lower($1) LIMIT 1`,
          [email]
        );
        const status = String(r.rows?.[0]?.status || "pending").toLowerCase();
        (session as any).status = status; // "pending" | "approved"
      } catch {
        // if DB not ready, keep pending (safe)
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
