// src/lib/serverAuthOptions.ts
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { websiteDb } from "@/lib/db";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      const email = (user.email || "").toLowerCase().trim();
      if (!email) return false;

      const db = websiteDb();
      const isAdmin = ADMIN_EMAILS.includes(email);

      await db.query(
        `
        INSERT INTO web_users (email, name, role, status)
        VALUES ($1, $2, $3, 'pending')
        ON CONFLICT (email)
        DO UPDATE SET
          name = COALESCE(EXCLUDED.name, web_users.name),
          role = CASE
            WHEN web_users.role = 'admin' THEN 'admin'
            ELSE EXCLUDED.role
          END
        `,
        [email, user.name || null, isAdmin ? "admin" : "user"]
      );

      return true;
    },
    async jwt({ token }) {
      const email = (token.email || "").toLowerCase().trim();
      if (!email) return token;

      const db = websiteDb();
      const res = await db.query(
        `SELECT role, status FROM web_users WHERE email=$1 LIMIT 1`,
        [email]
      );

      (token as any).role = res.rows[0]?.role || "user";
      (token as any).status = res.rows[0]?.status || "pending";
      return token;
    },
    async session({ session, token }) {
      (session as any).role = (token as any).role || "user";
      (session as any).status = (token as any).status || "pending";
      return session;
    },
  },
};
