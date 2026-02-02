import { redirect } from "next/navigation";

export default function HomePage() {
  // Entry point of the Manager Portal
  // All users go through the Intro (login + approval gate)
  redirect("/intro");
}
