import { redirect } from "next/navigation";
import { auth } from "~/auth";
import { isAdmin } from "@/lib/admin";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
