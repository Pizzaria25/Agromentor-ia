import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { PLAN_CONFIG, STRIPE_PRICE_MAP, normalizePlan } from "@/lib/plans";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const plan = normalizePlan(body?.plan);
    if (!plan || !(plan in STRIPE_PRICE_MAP)) {
      return NextResponse.json({ error: "Plano inválido para checkout." }, { status: 400 });
    }

    const priceId = STRIPE_PRICE_MAP[plan];
    if (!priceId) return NextResponse.json({ error: `Configure o price do plano ${plan} no ambiente.` }, { status: 500 });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return NextResponse.json({ error: "STRIPE_SECRET_KEY não configurada." }, { status: 500 });
    if (!stripeKey.startsWith("sk_")) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY inválida. Use a chave secreta sk_... e não a pk_..." }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" as never });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const cfg = PLAN_CONFIG[plan];

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userData.user.id,
      customer_email: userData.user.email,
      success_url: `${appUrl}/chat?upgrade=success&plan=${plan}`,
      cancel_url: `${appUrl}/planos?checkout=cancelled`,
      metadata: {
        user_id: userData.user.id,
        user_email: userData.user.email ?? "",
        plan,
        messages_limit: String(cfg.messages_limit),
        laudos_limit: String(cfg.laudos_limit),
        can_use_images: String(cfg.can_use_images),
      },
      subscription_data: {
        metadata: { user_id: userData.user.id, user_email: userData.user.email ?? "", plan },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao iniciar checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
