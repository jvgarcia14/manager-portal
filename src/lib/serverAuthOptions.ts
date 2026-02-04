// src/lib/serverAuthOptions.ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { websiteDb } from "@/lib/db";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function normEmail(email?: string | null) {
  return String(email || "").toLowerCase().trim();
}

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
      const email = normEmail(user.email);
      if (!email) return false;

      const isAdmin = ADMIN_EMAILS.includes(email);

      try {
        const db = websiteDb();

        // Ensure web_users row exists (default pending)
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

        console.log("[auth] signIn ok:", email, isAdmin ? "admin" : "user");
        return true;
      } catch (err) {
        console.error("[auth] signIn DB error:", err);
        // If you return true here, user can login but won't appear in admin.
        // Better to fail so you notice immediately.
        return false;
      }
    },

    async jwt({ token, user }) {
      // ✅ IMPORTANT: ensure token.email exists on first sign-in
      if (user?.email) token.email = user.email;

      const email = normEmail(token.email as string);
      if (!email) return token;

      try {
        const db = websiteDb();
        const res = await db.query(
          `SELECT role, status FROM web_users WHERE email = $1 LIMIT 1`,
          [email]
        );

        (token as any).role = res.rows[0]?.role || "user";
        (token as any).status = res.rows[0]?.status || "pending";
      } catch (err) {
        console.error("[auth] jwt DB error:", err);
        (token as any).role = (token as any).role || "user";
        (token as any).status = (token as any).status || "pending";
      }

      return token;
    },

    async session({ session, token }) {
      (session as any).role = (token as any).role || "user";
      (session as any).status = (token as any).status || "pending";
      return session;
    },
  },
};
