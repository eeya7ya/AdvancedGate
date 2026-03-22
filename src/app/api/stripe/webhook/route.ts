import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe webhook] signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("[stripe] checkout.session.completed:", session.id, "userId:", session.metadata?.userId);
      // TODO: Activate premium access for session.metadata.userId
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("[stripe] subscription event:", event.type, subscription.id, "status:", subscription.status);
      // TODO: Update user subscription status in DB
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("[stripe] subscription cancelled:", subscription.id);
      // TODO: Revoke premium access for this subscription's user
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log("[stripe] payment failed for invoice:", invoice.id);
      // TODO: Notify user of failed payment
      break;
    }

    default:
      console.log("[stripe] unhandled event type:", event.type);
  }

  return NextResponse.json({ received: true });
}
