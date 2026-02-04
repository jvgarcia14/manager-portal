import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/serverAuthOptions";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const s: any = session;

  const email = String(s?.user?.email || "").toLowerCase();
  const role = String(s?.role || "user").toLowerCase();

  if (!session || !email) redirect("/intro");
  if (role !== "admin") redirect("/dashboard"); // ✅ users cannot open /admin

  return <>{children}</>;
}
