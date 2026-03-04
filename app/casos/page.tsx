import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import NewCaseForm from "@/components/cases/NewCaseForm";

export default async function CasosPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: cases } = await supabase
    .from("cases")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 text-white">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Casos</h1>
          <p className="text-white/70">Organize por cliente/talhão e gere laudo em 1 clique.</p>
        </div>
        <Link href="/" className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
          Voltar ao Chat
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {(cases ?? []).length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
              Nenhum caso ainda. Crie o primeiro ao lado.
            </div>
          ) : (
            (cases ?? []).map((c: any) => (
              <Link
                key={c.id}
                href={`/casos/${c.id}`}
                className="block rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{c.title}</div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                    {c.status}
                  </span>
                </div>
                <div className="mt-2 text-sm text-white/70">
                  {c.culture ? `Cultura: ${c.culture}` : "Cultura: —"} •{" "}
                  {c.municipality ? `Município: ${c.municipality}` : "Município: —"} •{" "}
                  {c.area_ha ? `Área: ${c.area_ha} ha` : "Área: —"}
                </div>
              </Link>
            ))
          )}
        </div>

        <div>
          <NewCaseForm />
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/60">
            Dica: use títulos padronizados (cultura + talhão + sintoma). Isso melhora seus relatórios e o dashboard.
          </div>
        </div>
      </div>
    </main>
  );
}
