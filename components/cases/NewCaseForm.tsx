"use client";

import { useState } from "react";

export default function NewCaseForm({ onCreated }: { onCreated?: () => void }) {
  const [title, setTitle] = useState("");
  const [culture, setCulture] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [areaHa, setAreaHa] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function createCase(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/casos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          culture: culture || null,
          municipality: municipality || null,
          area_ha: areaHa ? Number(areaHa) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? data?.error ?? "Erro ao criar caso.");
      setTitle("");
      setCulture("");
      setMunicipality("");
      setAreaHa("");
      onCreated?.();
      window.location.href = `/casos/${data.case.id}`;
    } catch (e: any) {
      setErr(e?.message ?? "Erro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={createCase} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
      <div className="text-sm font-medium text-white">Novo caso</div>

      <div>
        <label className="text-xs text-white/60">Título</label>
        <input
          className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/25"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Cana 2º corte - falhas em reboleiras"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/60">Cultura</label>
          <input
            className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/25"
            value={culture}
            onChange={(e) => setCulture(e.target.value)}
            placeholder="Ex: Cana, Soja, Pastagem..."
          />
        </div>
        <div>
          <label className="text-xs text-white/60">Município</label>
          <input
            className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/25"
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            placeholder="Ex: Panorama-SP"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-white/60">Área (ha)</label>
        <input
          className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/25"
          value={areaHa}
          onChange={(e) => setAreaHa(e.target.value)}
          placeholder="Ex: 24.5"
          inputMode="decimal"
        />
      </div>

      {err ? <div className="text-sm text-red-300">{err}</div> : null}

      <button
        disabled={loading}
        className="w-full rounded-xl bg-white px-3 py-2 font-medium text-black hover:bg-white/90 disabled:opacity-60"
      >
        {loading ? "Criando..." : "Criar caso"}
      </button>
    </form>
  );
}
