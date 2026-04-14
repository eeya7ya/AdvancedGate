import { auth } from "~/auth";
import { getQuotation, listClients } from "@/lib/db";
import { QuotationDetailClient } from "./quotation-detail-client";
import { notFound, redirect } from "next/navigation";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const qid = parseInt(id, 10);
  if (!Number.isFinite(qid)) notFound();

  const [quotation, clients] = await Promise.all([
    getQuotation(qid),
    listClients(),
  ]);

  if (!quotation) notFound();

  return <QuotationDetailClient initialQuotation={quotation} clients={clients} />;
}
