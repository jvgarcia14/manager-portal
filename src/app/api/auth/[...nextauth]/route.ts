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

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // Ensure DB + table exist
      await ensureWebsiteSchema();

      // Insert user or update last login
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
        const { rows } = await websitePool.query(
          `
          SELECT role, status
          FROM web_users
          WHERE email = $1
          `,
          [String(token.email).toLowerCase()]
        );

        token.role = rows?.[0]?.role ?? "manager";
        token.status = rows?.[0]?.status ?? "pending";
      }

      return token;
    },

    async session({ session, token }) {
      (session as any).role = token.role;
      (session as any).status = token.status;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
