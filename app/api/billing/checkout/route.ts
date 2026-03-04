import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  product: z.enum(["pro_mensal", "pro_anual", "laudo_avulso"]),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  if (!stripeKey) return NextResponse.json({ error: "Sem STRIPE_SECRET_KEY no .env.local" }, { status: 400 });

  const priceId =
    parsed.data.product === "pro_mensal"
      ? process.env.STRIPE_PRICE_PRO_MENSAL
      : parsed.data.product === "pro_anual"
        ? process.env.STRIPE_PRICE_PRO_ANUAL
        : process.env.STRIPE_PRICE_LAUDO_AVULSO;

  if (!priceId) return NextResponse.json({ error: "Preço Stripe não configurado (STRIPE_PRICE_...)" }, { status: 400 });

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" as any });

  const session = await stripe.checkout.sessions.create({
    mode: parsed.data.product === "laudo_avulso" ? "payment" : "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email ?? undefined,
    ...(parsed.data.product === "laudo_avulso"
      ? {}
      : {
          subscription_data: {
            metadata: {
              user_id: user.id,
              product: parsed.data.product,
            },
          },
        }),
    success_url: `${appUrl}/planos?success=1`,
    cancel_url: `${appUrl}/planos?canceled=1`,
    metadata: {
      user_id: user.id,
      product: parsed.data.product,
    },
  });

  return NextResponse.json({ url: session.url });
}
