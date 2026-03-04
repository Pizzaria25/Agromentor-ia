import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function groupCount(arr: any[], key: string) {
  const m = new Map<string, number>();
  for (const it of arr) {
    const k = String(it?.[key] ?? "—");
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

export default async function DashboardPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: cases } = await supabase.from("cases").select("culture,status,municipality,area_ha,created_at");

  const total = (cases ?? []).length;
  const byCulture = groupCount(cases ?? [], "culture");
  const byStatus = groupCount(cases ?? [], "status");
  const byMunicipality = groupCount(cases ?? [], "municipality");

  const areaTotal = (cases ?? []).reduce((acc: number, c: any) => acc + (Number(c.area_ha) || 0), 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 text-white">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-white/70">Visão rápida da operação (estilo BI).</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs text-white/60">Casos</div>
          <div className="mt-1 text-3xl font-semibold">{total}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs text-white/60">Área monitorada (ha)</div>
          <div className="mt-1 text-3xl font-semibold">{areaTotal.toFixed(1)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs text-white/60">Municípios</div>
          <div className="mt-1 text-3xl font-semibold">{new Set((cases ?? []).map((c: any) => c.municipality).filter(Boolean)).size}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="font-medium">Por cultura</div>
          <div className="mt-3 space-y-2 text-sm">
            {byCulture.length ? byCulture.slice(0, 8).map(([k, v]) => (
              <div key={k} className="flex justify-between text-white/80">
                <span>{k}</span><span className="text-white/60">{v}</span>
              </div>
            )) : <div className="text-white/60">Sem dados.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="font-medium">Por status</div>
          <div className="mt-3 space-y-2 text-sm">
            {byStatus.length ? byStatus.map(([k, v]) => (
              <div key={k} className="flex justify-between text-white/80">
                <span>{k}</span><span className="text-white/60">{v}</span>
              </div>
            )) : <div className="text-white/60">Sem dados.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="font-medium">Top municípios</div>
          <div className="mt-3 space-y-2 text-sm">
            {byMunicipality.length ? byMunicipality.slice(0, 8).map(([k, v]) => (
              <div key={k} className="flex justify-between text-white/80">
                <span>{k}</span><span className="text-white/60">{v}</span>
              </div>
            )) : <div className="text-white/60">Sem dados.</div>}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/60">
        Próximo upgrade: gráficos (Recharts) + filtro por período + export mensal.
      </div>
    </main>
  );
}
