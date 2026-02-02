import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { ensureWebsiteSchema, websitePool } from "@/lib/websiteDb";

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
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
    async signIn({ user }) {
      if (!user.email) return false;

      await ensureWebsiteSchema();

      const email = user.email.toLowerCase();
      const admins = parseAdminEmails();
      const isAdmin = admins.includes(email);

      await websitePool.query(
        `
        INSERT INTO web_users (email, name, status, role, last_login_at)
        VALUES ($1, $2, $3, $4, now())
        ON CONFLICT (email)
        DO UPDATE SET
          name = EXCLUDED.name,
          last_login_at = now()
        `,
        [
          email,
          user.name ?? null,
          isAdmin ? "approved" : "pending",
          isAdmin ? "admin" : "manager",
        ]
      );

      return true;
    },

    async jwt({ token }) {
      if (!token.email) return token;

      await ensureWebsiteSchema();

      const email = String(token.email).toLowerCase();
      const { rows } = await websitePool.query(
        `SELECT role, status FROM web_users WHERE email=$1`,
        [email]
      );

      const row = rows?.[0];
      (token as any).role = row?.role ?? "manager";
      (token as any).status = row?.status ?? "pending";

      return token;
    },

    async session({ session, token }) {
      (session as any).role = (token as any).role;
      (session as any).status = (token as any).status;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
