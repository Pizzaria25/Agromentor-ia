import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LaudosPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: reports } = await supabase
    .from("reports")
    .select("id,title,content,created_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-[#0a2e1a] text-white px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Meus Laudos</h1>
          <p className="text-sm text-white/50 mt-0.5">Documentos gerados nas suas consultas</p>
        </div>
        <Link href="/chat" className="text-sm px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-all">
          + Novo Chat
        </Link>
      </div>

      {!reports?.length ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📄</div>
          <h2 className="font-semibold mb-2">Nenhum laudo ainda</h2>
          <p className="text-white/50 text-sm mb-6">Inicie um chat, descreva o problema e clique em "Gerar Laudo".</p>
          <Link href="/chat" className="inline-block px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all">
            Iniciar consulta
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const content = r.content as any;
            const riskColor =
              content?.risk_level === "ALTO" ? "text-red-400 bg-red-500/10 border-red-400/20" :
              content?.risk_level === "MEDIO" ? "text-amber-400 bg-amber-500/10 border-amber-400/20" :
              "text-emerald-400 bg-emerald-500/10 border-emerald-400/20";
            const docTypeLabel =
              content?.document_type === "RELATORIO_CAMPO" ? "Relatório de Campo" :
              content?.document_type === "LAUDO_ESTUDO" ? "Laudo de Estudo" : "Laudo Técnico";

            return (
              <div key={r.id} className="bg-black/30 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider">{docTypeLabel}</span>
                      {content?.risk_level && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${riskColor}`}>
                          {content.risk_level}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm truncate">{r.title}</h3>
                    <p className="text-xs text-white/50 mt-1">
                      {new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {content?.context?.culture && (
                      <p className="text-xs text-emerald-400/70 mt-1">🌱 {content.context.culture}</p>
                    )}
                  </div>
                  <a
                    href={`/api/laudos/${r.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-400/20 transition-all text-xs text-white/70 hover:text-emerald-300 font-medium"
                  >
                    ↓ PDF
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
