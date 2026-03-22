import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "~/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { priceId, successUrl, cancelUrl } = body as {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  };

  if (!priceId) {
    return NextResponse.json({ error: "priceId is required" }, { status: 400 });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: session.user.email ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl ?? `${process.env.NEXTAUTH_URL}/dashboard?payment=success`,
    cancel_url: cancelUrl ?? `${process.env.NEXTAUTH_URL}/dashboard?payment=cancelled`,
    metadata: {
      userId: session.user.id ?? "",
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
