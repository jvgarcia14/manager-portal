import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { websiteDb } from "@/lib/db";

function parseAdminEmails(v?: string) {
  return (v || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" as const },
  callbacks: {
    async jwt({ token }: any) {
      const email = String(token?.email || "").toLowerCase();
      if (!email) return token;

      // ADMIN override
      const admins = parseAdminEmails(process.env.ADMIN_EMAILS);
      if (admins.includes(email)) {
        token.role = "admin";
        token.status = "approved";
        return token;
      }

      // normal user -> check WEBSITE DB
      try {
        const db = websiteDb();
        const res = await db.query(
          `SELECT status, COALESCE(role,'user') as role
           FROM users
           WHERE lower(email)=lower($1)
           LIMIT 1`,
          [email]
        );

        const row = res.rows[0];
        token.role = row?.role || "user";
        token.status = row?.status || "pending";
      } catch {
        token.role = "user";
        token.status = "pending";
      }

      return token;
    },

    async session({ session, token }: any) {
      session.role = token.role || "user";
      session.status = token.status || "pending";
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
