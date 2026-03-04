"use client";

import { useState } from "react";

export default function DeveloperClient() {
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-soft">
        <h2 className="text-sm font-medium">Adicionar conhecimento (RAG)</h2>
        <p className="mt-1 text-xs text-white/60">
          Grava um “chunk” no Supabase com embedding. Requer OPENAI_API_KEY.
        </p>

        <form
          className="mt-4 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setMsg(null);
            const res = await fetch("/api/knowledge/add", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: fd.get("title"),
                category: fd.get("category"),
                source: fd.get("source"),
                content: fd.get("content"),
              }),
            });
            const j = await res.json().catch(() => ({}));
            setMsg(j?.ok ? "Salvo no RAG ✅" : j?.error || "Erro");
          }}
        >
          <input name="title" placeholder="Título" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none" />
          <div className="grid gap-2 md:grid-cols-2">
            <input name="category" placeholder="Categoria (ex: cana, pecuaria, herbicidas)" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none" />
            <input name="source" placeholder="Fonte (opcional)" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none" />
          </div>
          <textarea name="content" placeholder="Conteúdo (mín 20 caracteres)" rows={8} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none" />
          <button className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-black hover:bg-emerald-400">
            Salvar no RAG
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-soft">
        <h2 className="text-sm font-medium">Teste rápido de previsão</h2>
        <p className="mt-1 text-xs text-white/60">
          Usa Open-Meteo (sem chave). Ex.: “Ribeirão Preto - SP”.
        </p>

        <form
          className="mt-4 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const loc = String(fd.get("location") || "");
            setMsg(null);
            const res = await fetch(`/api/weather?location=${encodeURIComponent(loc)}`);
            const j = await res.json().catch(() => ({}));
            if (j?.daily) setMsg(`OK ✅\n${JSON.stringify(j.daily.slice(0, 5), null, 2)}`);
            else setMsg(j?.error || "Erro");
          }}
        >
          <input
            name="location"
            placeholder="Cidade - UF"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
          />
          <button className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">Testar</button>
        </form>

        {msg && (
          <pre className="mt-4 max-h-56 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/80">
            {msg}
          </pre>
        )}

        <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-white/75">
          <div className="font-medium text-white">Acesso total</div>
          <div className="mt-1">Seu email está em DEV_ADMIN_EMAILS, então você tem acesso a tudo (sem limites) para validar.</div>
        </div>
      </section>
    </div>
  );
}
