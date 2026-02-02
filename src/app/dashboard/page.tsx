import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardClient from "./ui";

export default async function DashboardPage() {
  const session: any = await getServerSession(authOptions);

  // not signed in
  if (!session) redirect("/intro");

  // approved/pending status may be stored in session.status or session.user.status
  const userStatus = session?.status ?? session?.user?.status ?? "pending";

  // not approved
  if (userStatus !== "approved") redirect("/intro");

  return (
    <DashboardClient
      email={session?.user?.email ?? ""}
      role={session?.role ?? session?.user?.role ?? "admin"}
    />
  );
}
