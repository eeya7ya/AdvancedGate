import { auth } from "~/auth";
import { listQuotations, listClients } from "@/lib/db";
import { QuotationsClient } from "./quotations-client";
import { redirect } from "next/navigation";

export default async function QuotationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [quotations, clients] = await Promise.all([
    listQuotations(),
    listClients(),
  ]);

  return <QuotationsClient initialQuotations={quotations} initialClients={clients} />;
}
