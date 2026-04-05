import { auth } from "~/auth";
import { AIDashboard } from "@/components/dashboard/ai-dashboard";

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "Engineer";
  const userId = session?.user?.id ?? "guest";

  return <AIDashboard firstName={firstName} userId={userId} />;
}
