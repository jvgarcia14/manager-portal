import NextAuth from "next-auth";
import { authOptions } from "@/lib/serverAuthOptions";

export const runtime = "nodejs";            // ✅ IMPORTANT (pg needs Node)
export const dynamic = "force-dynamic";     // ✅ prevent caching issues

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
