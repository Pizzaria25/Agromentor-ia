import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import GenerateLaudoForm from "@/components/laudos/GenerateLaudoForm";

export default async function CasoDetalhePage({ params }: { params: { id: string } }) {
  await requireUser();
  const supabase = await createClient();

  const { data: c, error } = await supabase
    .from("cases")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !c) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          Caso não encontrado.
          <div className="mt-4">
            <Link className="underline" href="/casos">
              Voltar
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{c.title}</h1>
          <div className="mt-2 text-sm text-white/70">
            {c.culture ? `Cultura: ${c.culture}` : "Cultura: —"} •{" "}
            {c.municipality ? `Município: ${c.municipality}` : "Município: —"} •{" "}
            {c.area_ha ? `Área: ${c.area_ha} ha` : "Área: —"} •{" "}
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{c.status}</span>
          </div>
        </div>
        <Link href="/casos" className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
          Voltar
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-medium">Use o Chat com contexto</h2>
          <p className="mt-2 text-sm text-white/70">
            Dica: volte no Chat e descreva o caso com detalhes. Depois cole aqui no gerador de laudo.
          </p>

          <div className="mt-5 flex gap-3">
            <Link href="/" className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-black hover:bg-white/90">
              Abrir Chat
            </Link>
            <Link href="/laudos" className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
              Ver laudos
            </Link>
          </div>
        </div>

        <div>
          <GenerateLaudoForm caseId={c.id} />
        </div>
      </div>
    </main>
  );
}
