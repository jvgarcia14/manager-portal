import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { ensureWebsiteSchema, websitePool } from "@/lib/websiteDb";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // ✅ auto-create table if missing
      await ensureWebsiteSchema();

      await websitePool.query(
        `
        INSERT INTO web_users (email, name, status)
        VALUES ($1, $2, 'pending')
        ON CONFLICT (email)
        DO UPDATE SET last_login_at = now()
        `,
        [user.email.toLowerCase(), user.name ?? null]
      );

      return true;
    },

    async jwt({ token }) {
      if (token.email) {
        // ✅ auto-create table if missing (safe)
        await ensureWebsiteSchema();

        const { rows } = await websitePool.query(
          `SELECT role, status FROM web_users WHERE email = $1`,
          [String(token.email).toLowerCase()]
        );

        // ✅ avoid crash if user row missing for any reason
        const role = rows?.[0]?.role ?? "manager";
        const status = rows?.[0]?.status ?? "pending";

        (token as any).role = role;
        (token as any).status = status;
      }
      return token;
    },

    async session({ session, token }) {
      (session as any).role = (token as any).role ?? "manager";
      (session as any).status = (token as any).status ?? "pending";
      return session;
    },
  },
});

export { handler as GET, handler as POST };
