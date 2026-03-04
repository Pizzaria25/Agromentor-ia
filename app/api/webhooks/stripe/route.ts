import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" as any });
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  return createSupabaseServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: Request) {
  try {
    const whsec = process.env.STRIPE_WEBHOOK_SECRET;
    if (!whsec) return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 400 });

    const stripe = getStripe();
    const sig = req.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

    const rawBody = await req.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, whsec);
    } catch (err: any) {
      return NextResponse.json({ error: `Webhook signature verification failed: ${err?.message ?? ""}` }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Helper: atualizar subscription
    async function setPlan(userId: string, plan: "free" | "pro_mensal" | "pro_anual", active: boolean) {
      await supabase.from("subscriptions").upsert({
        user_id: userId,
        plan,
        is_active: active,
        updated_at: new Date().toISOString(),
      });
    }

    // Helper: adicionar créditos avulsos
    async function addCredits(userId: string, delta: number) {
      const { data } = await supabase.from("report_credits").select("credits").eq("user_id", userId).single();
      const cur = data?.credits ?? 0;
      await supabase.from("report_credits").upsert({
        user_id: userId,
        credits: Math.max(0, cur + delta),
        updated_at: new Date().toISOString(),
      });
    }

    // 1) Checkout finalizado: usa metadata para identificar usuário e produto
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = (session.metadata?.user_id as string) || "";
      const product = (session.metadata?.product as string) || "";
      if (userId) {
        if (product === "pro_mensal") await setPlan(userId, "pro_mensal", true);
        if (product === "pro_anual") await setPlan(userId, "pro_anual", true);
        if (product === "laudo_avulso") await addCredits(userId, 1);
      }
    }

    // 2) Subscription cancelada/deletada
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = (sub.metadata?.user_id as string) || "";
      if (userId) await setPlan(userId, "free", false);
    }

    // 3) Subscription atualizada (opcional: manter ativo)
    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = (sub.metadata?.user_id as string) || "";
      const product = (sub.metadata?.product as string) || "";
      if (userId) {
        const active = sub.status === "active" || sub.status === "trialing";
        if (product === "pro_mensal") await setPlan(userId, "pro_mensal", active);
        if (product === "pro_anual") await setPlan(userId, "pro_anual", active);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("STRIPE WEBHOOK ERROR >>>", e);
    return NextResponse.json({ error: e?.message ?? "Webhook error" }, { status: 500 });
  }
}
