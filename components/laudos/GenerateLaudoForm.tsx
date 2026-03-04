"use client";

import { useState } from "react";

export default function GenerateLaudoForm({ caseId }: { caseId: string }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function gen(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/laudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erro ao gerar laudo.");
      window.location.href = "/laudos";
    } catch (e: any) {
      setErr(e?.message ?? "Erro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={gen} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
      <div className="text-sm font-medium">Gerar laudo (PDF)</div>

      <textarea
        className="min-h-[110px] w-full resize-y rounded-xl bg-black/40 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-white/25"
        placeholder="Coloque o histórico: idade da cultura, sintomas, clima, última aplicação, fotos (descrição), etc."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {err ? <div className="text-sm text-red-300">{err}</div> : null}

      <button
        disabled={loading}
        className="w-full rounded-xl bg-white px-3 py-2 font-medium text-black hover:bg-white/90 disabled:opacity-60"
      >
        {loading ? "Gerando..." : "Gerar laudo"}
      </button>

      <div className="text-xs text-white/60">
        O laudo fica salvo no histórico e você pode baixar PDF e compartilhar.
      </div>
    </form>
  );
}
