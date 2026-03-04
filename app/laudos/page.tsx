import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function LaudosPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select("id, title, case_id, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 text-white">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Laudos</h1>
          <p className="text-white/70">Baixe PDF e compartilhe com gestão/cliente.</p>
        </div>
        <Link href="/casos" className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
          Ver casos
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {(reports ?? []).length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
            Nenhum laudo ainda. Abra um caso e gere o primeiro.
          </div>
        ) : (
          (reports ?? []).map((r: any) => (
            <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="mt-1 text-sm text-white/60">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/casos/${r.case_id}`}
                    className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
                  >
                    Abrir caso
                  </Link>
                  <a
                    href={`/api/laudos/${r.id}/pdf`}
                    className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-black hover:bg-white/90"
                  >
                    Baixar PDF
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
