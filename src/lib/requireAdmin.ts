// src/lib/requireAdmin.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/serverAuthOptions";

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);

  const email = String((session as any)?.user?.email || "").toLowerCase();
  const role = String((session as any)?.role || "user").toLowerCase();

  if (!session || !email) return { ok: false as const, error: "Not signed in" };
  if (role !== "admin") return { ok: false as const, error: "Not admin" };

  return { ok: true as const, session };
}
