import { auth } from "~/auth";
import { PricingClient } from "@/components/payment/pricing-client";

export default async function PricingPage() {
  const session = await auth();
  const userEmail = session?.user?.email ?? null;

  return <PricingClient userEmail={userEmail} />;
}
