import { auth } from "~/auth";
import { AIDashboard } from "@/components/dashboard/ai-dashboard";

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "Engineer";

  return <AIDashboard firstName={firstName} />;
}
