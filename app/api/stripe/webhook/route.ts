import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_CONFIG, normalizePlan } from "@/lib/plans";

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) return NextResponse.json({ error: "Stripe webhook não configurado." }, { status: 500 });
  if (!stripeKey.startsWith("sk_")) return NextResponse.json({ error: "STRIPE_SECRET_KEY inválida para webhook." }, { status: 500 });

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" as never });
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Assinatura inválida." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const plan = normalizePlan(session.metadata?.plan);
      const userId = session.metadata?.user_id || session.client_reference_id;
      if (plan && userId && PLAN_CONFIG[plan]) {
        const cfg = PLAN_CONFIG[plan];
        const { error } = await admin.from("usage_limits").upsert({
          user_id: userId,
          plan,
          messages_limit: cfg.messages_limit,
          laudos_limit: cfg.laudos_limit,
          can_use_images: cfg.can_use_images,
          is_trial: false,
          trial_ends_at: null,
          expires_at: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (error) throw error;
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      if (userId) {
        const cfg = PLAN_CONFIG.trial;
        const { error } = await admin.from("usage_limits").upsert({
          user_id: userId,
          plan: "trial",
          messages_limit: cfg.messages_limit,
          laudos_limit: cfg.laudos_limit,
          can_use_images: cfg.can_use_images,
          is_trial: true,
          trial_ends_at: new Date(Date.now() + 3 * 86400000).toISOString(),
          expires_at: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (error) throw error;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao processar webhook." }, { status: 500 });
  }
}
