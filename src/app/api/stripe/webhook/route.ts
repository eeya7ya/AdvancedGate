import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

const sql = neon(process.env.DATABASE_URL!);

/** Ensure the subscription columns exist on user_stats */
async function ensureSubscriptionColumns() {
  try {
    await sql`
      ALTER TABLE user_stats
        ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
        ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
        ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
        ADD COLUMN IF NOT EXISTS subscription_status TEXT,
        ADD COLUMN IF NOT EXISTS quota_extra INTEGER NOT NULL DEFAULT 0;
    `;
  } catch {
    // ignore — column may already exist in a different form
  }
}

/** Map a Stripe Price ID to a plan name */
function planFromPriceId(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) return "enterprise";
  if (priceId === process.env.STRIPE_PRICE_QUOTA_TOPUP) return "quota_topup";
  return "pro"; // default upgrade to pro if unknown price
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

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

  await ensureSubscriptionColumns();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      console.log("[stripe] checkout.session.completed:", session.id, "userId:", userId);

      if (userId) {
        // Determine if this is a quota top-up or a subscription
        const lineItems = session.line_items?.data ?? [];
        const priceId = lineItems[0]?.price?.id ?? "";
        if (priceId === process.env.STRIPE_PRICE_QUOTA_TOPUP) {
          // Add 50 quota sessions
          try {
            await sql`
              UPDATE user_stats
              SET quota_extra = quota_extra + 50
              WHERE user_id = ${userId}
            `;
            console.log("[stripe] added 50 quota sessions to user:", userId);
          } catch (err) {
            console.error("[stripe] quota update failed:", err);
          }
        } else {
          // Subscription checkout — plan will be updated via subscription.created event
          try {
            await sql`
              UPDATE user_stats
              SET stripe_customer_id = ${session.customer as string ?? null}
              WHERE user_id = ${userId}
            `;
          } catch (err) {
            console.error("[stripe] customer ID update failed:", err);
          }
        }
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("[stripe] subscription event:", event.type, subscription.id, "status:", subscription.status);

      const priceId = subscription.items.data[0]?.price?.id ?? "";
      const plan = planFromPriceId(priceId);
      const customerId = subscription.customer as string;

      try {
        await sql`
          UPDATE user_stats
          SET
            plan = ${plan},
            stripe_subscription_id = ${subscription.id},
            subscription_status = ${subscription.status}
          WHERE stripe_customer_id = ${customerId}
        `;
        console.log("[stripe] updated plan to", plan, "for customer:", customerId);
      } catch (err) {
        console.error("[stripe] subscription update failed:", err);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      console.log("[stripe] subscription cancelled:", subscription.id, "customer:", customerId);

      try {
        await sql`
          UPDATE user_stats
          SET
            plan = 'free',
            stripe_subscription_id = NULL,
            subscription_status = 'cancelled'
          WHERE stripe_customer_id = ${customerId}
        `;
        console.log("[stripe] reverted plan to free for customer:", customerId);
      } catch (err) {
        console.error("[stripe] plan revocation failed:", err);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      console.log("[stripe] payment failed for invoice:", invoice.id, "customer:", customerId);

      try {
        // Mark subscription as past_due
        await sql`
          UPDATE user_stats
          SET subscription_status = 'past_due'
          WHERE stripe_customer_id = ${customerId}
        `;
        console.log("[stripe] marked subscription as past_due for customer:", customerId);
        // Note: Email notification can be added here via /api/email/reminder
      } catch (err) {
        console.error("[stripe] past_due update failed:", err);
      }
      break;
    }

    default:
      console.log("[stripe] unhandled event type:", event.type);
  }

  return NextResponse.json({ received: true });
}
