import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function requireApprovedSession() {
  const session: any = await getServerSession(authOptions);

  if (!session) {
    return { ok: false as const, status: 401, error: "Not signed in" };
  }
  if (session?.status !== "approved") {
    return { ok: false as const, status: 403, error: "Not approved" };
  }

  return { ok: true as const, session };
}
