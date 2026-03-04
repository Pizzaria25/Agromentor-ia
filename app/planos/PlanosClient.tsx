"use client";

type Product = "pro_mensal" | "pro_anual" | "laudo_avulso";

function Card(props: {
  title: string;
  price: string;
  badge?: string;
  items: string[];
  cta: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{props.title}</div>
          <div className="text-2xl font-bold text-emerald-300">{props.price}</div>
        </div>
        {props.badge ? (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            {props.badge}
          </span>
        ) : null}
      </div>

      <ul className="mt-4 space-y-2 text-sm text-white/70">
        {props.items.map((it) => (
          <li key={it}>• {it}</li>
        ))}
      </ul>

      <button
        className="mt-5 w-full rounded-xl bg-emerald-500/90 px-4 py-2.5 font-semibold text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={props.disabled}
        onClick={props.onClick}
      >
        {props.cta}
      </button>
    </div>
  );
}

export default function PlanosClient({ dev }: { dev?: boolean }) {
  async function goCheckout(product: Product) {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product }),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.url) window.location.href = data.url;
    else alert(data?.error || "Falha ao iniciar checkout.");
  }

  if (dev) {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-emerald-100">
        <div className="text-lg font-semibold">PRO liberado (DEV)</div>
        <div className="mt-1 text-sm text-emerald-100/80">
          Seu e-mail está na lista DEV_ADMIN_EMAILS, então tudo fica liberado para teste.
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card
        title="PRO Mensal"
        price="R$ 49 / mês"
        badge="Recomendado"
        items={["Consultas ilimitadas", "3 laudos/mês", "Dashboard + Casos"]}
        cta="Assinar mensal"
        onClick={() => goCheckout("pro_mensal")}
      />
      <Card
        title="PRO Anual"
        price="R$ 497 / ano"
        items={["Consultas ilimitadas", "5 laudos/mês", "Dashboard + Casos"]}
        cta="Assinar anual"
        onClick={() => goCheckout("pro_anual")}
      />
      <Card
        title="Laudo avulso"
        price="R$ 19"
        items={["PDF completo", "Equipamento recomendado", "Checklist de campo"]}
        cta="Comprar laudo"
        onClick={() => goCheckout("laudo_avulso")}
      />
    </div>
  );
}
