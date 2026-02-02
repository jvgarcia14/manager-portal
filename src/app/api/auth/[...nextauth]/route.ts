import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getApprovalStatus } from "@/lib/requireApproved";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token }) {
      // Attach approval status/role into token on every request
      if (token?.email) {
        const { status, role } = await getApprovalStatus(String(token.email));
        (token as any).status = status;
        (token as any).role = role;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).status = (token as any).status ?? "pending";
      (session as any).role = (token as any).role ?? "user";
      return session;
    },
  },
  pages: {
    signIn: "/intro",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
