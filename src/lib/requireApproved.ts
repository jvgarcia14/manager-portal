import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/serverAuthOptions";

export async function requireApprovedSession() {
  const session = await getServerSession(authOptions);

  const email = String((session as any)?.user?.email || "").toLowerCase();
  const status = String((session as any)?.status || "signed_out").toLowerCase();
  const role = String((session as any)?.role || "user").toLowerCase();

  if (!session || !email) {
    return { ok: false as const, status: "signed_out" as const, role: "user" as const, error: "Not signed in" };
  }

  if (status !== "approved") {
    return { ok: false as const, status: status as any, role: role as any, error: "Awaiting approval" };
  }

  return { ok: true as const, status: "approved" as const, role: role as any, email };
}
