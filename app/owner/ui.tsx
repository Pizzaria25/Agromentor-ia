"use client";

import { useEffect, useMemo, useState } from "react";

type OwnerUser = {
  user_id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  profile_type: string | null;
  profile_name: string | null;
  plan: string;
  messages_used: number;
  messages_limit: number;
  laudos_used: number;
  laudos_limit: number;
  can_use_images: boolean;
  is_owner: boolean;
  is_trial: boolean;
  trial_ends_at: string | null;
  expires_at: string | null;
  updated_at: string | null;
};

type OwnerSummary = {
  total_users: number;
  active_paid: number;
  using_images: number;
  total_messages_used: number;
  total_laudos_used: number;
};

const PLAN_OPTIONS = [
  { value: "estudante", label: "Estudante" },
  { value: "produtor", label: "Produtor" },
  { value: "profissional", label: "Profissional" },
  { value: "escritorio", label: "Escritório" },
  { value: "usina", label: "Usina" },
  { value: "owner", label: "Owner / Deus" },
];

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

export default function OwnerClient() {
  const [users, setUsers] = useState<OwnerUser[]>([]);
  const [summary, setSummary] = useState<OwnerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [grantLoading, setGrantLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ email: "", plan: "profissional", duration_days: "30", messages_limit: "", laudos_limit: "", can_use_images: true });

  async function loadData() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/owner/overview", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar painel owner.");
      setUsers(json.users ?? []);
      setSummary(json.summary ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar painel owner.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => [u.email, u.profile_name, u.profile_type, u.plan].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [users, search]);

  async function submitGrant(e: React.FormEvent) {
    e.preventDefault();
    setGrantLoading(true);
    setMessage(null);
    try {
      const payload = {
        email: form.email,
        plan: form.plan,
        duration_days: form.duration_days ? Number(form.duration_days) : undefined,
        messages_limit: form.messages_limit ? Number(form.messages_limit) : undefined,
        laudos_limit: form.laudos_limit ? Number(form.laudos_limit) : undefined,
        can_use_images: form.can_use_images,
      };
      const res = await fetch("/api/owner/grant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao liberar plano.");
      setMessage(`Plano ${json.plan} liberado para ${json.granted_to}.`);
      setForm((f) => ({ ...f, email: "" }));
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao liberar plano.");
    } finally {
      setGrantLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#071d12] text-white px-4 py-6 max-w-7xl mx-auto space-y-6">
      <section className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-emerald-500/10 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-violet-300 text-sm font-semibold mb-1">PAINEL OWNER</div>
            <h1 className="text-3xl font-bold">Modo Deus do AgroMentor IA</h1>
            <p className="text-white/65 mt-2 max-w-2xl text-sm">Controle manual de planos, visão de usuários ativos, consumo de mensagens e laudos, com acesso exclusivo do owner.</p>
          </div>
          <button onClick={loadData} className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-sm font-semibold">Atualizar painel</button>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[["Usuários totais", String(summary.total_users)], ["Pagantes ativos", String(summary.active_paid)], ["Com imagem liberada", String(summary.using_images)], ["Mensagens consumidas", String(summary.total_messages_used)], ["Laudos consumidos", String(summary.total_laudos_used)]].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-white/50 text-xs uppercase tracking-wide">{label}</div>
              <div className="text-2xl font-bold mt-2">{value}</div>
            </div>
          ))}
        </section>
      )}

      <section className="grid lg:grid-cols-[380px,1fr] gap-6">
        <form onSubmit={submitGrant} className="rounded-3xl border border-white/10 bg-black/20 p-5 space-y-4">
          <div>
            <h2 className="text-xl font-bold">Liberar plano manualmente</h2>
            <p className="text-sm text-white/60 mt-1">Use o e-mail do usuário já cadastrado. Isso permite liberar plano, dias grátis e override manual.</p>
          </div>
          <label className="block"><span className="text-sm text-white/70">E-mail do usuário</span><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none" placeholder="usuario@email.com" required /></label>
          <label className="block"><span className="text-sm text-white/70">Plano</span><select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="mt-1 w-full rounded-xl bg-[#0f2d1b] border border-white/10 px-3 py-2 outline-none">{PLAN_OPTIONS.map((plan) => <option key={plan.value} value={plan.value}>{plan.label}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-sm text-white/70">Duração em dias</span><input value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none" placeholder="30" /></label>
            <label className="block"><span className="text-sm text-white/70">Imagem liberada</span><select value={String(form.can_use_images)} onChange={(e) => setForm({ ...form, can_use_images: e.target.value === "true" })} className="mt-1 w-full rounded-xl bg-[#0f2d1b] border border-white/10 px-3 py-2 outline-none"><option value="true">Sim</option><option value="false">Não</option></select></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-sm text-white/70">Override mensagens</span><input value={form.messages_limit} onChange={(e) => setForm({ ...form, messages_limit: e.target.value })} className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none" placeholder="deixar vazio usa o plano" /></label>
            <label className="block"><span className="text-sm text-white/70">Override laudos</span><input value={form.laudos_limit} onChange={(e) => setForm({ ...form, laudos_limit: e.target.value })} className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none" placeholder="deixar vazio usa o plano" /></label>
          </div>
          <button disabled={grantLoading} className="w-full rounded-xl bg-violet-400 hover:bg-violet-300 text-black font-semibold py-2.5 disabled:opacity-60">{grantLoading ? "Liberando..." : "Liberar plano"}</button>
          {message && <div className="text-sm rounded-xl border border-white/10 bg-white/5 px-3 py-2">{message}</div>}
        </form>

        <section className="rounded-3xl border border-white/10 bg-black/20 p-5 overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
            <div><h2 className="text-xl font-bold">Usuários ativos e consumo</h2><p className="text-sm text-white/60">Veja e-mails, planos ativos, uso e permissões reais do sistema.</p></div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por e-mail, nome, plano..." className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none sm:w-72" />
          </div>
          <div className="overflow-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-white/65"><tr><th className="text-left px-3 py-3">Usuário</th><th className="text-left px-3 py-3">Plano</th><th className="text-left px-3 py-3">Mensagens</th><th className="text-left px-3 py-3">Laudos</th><th className="text-left px-3 py-3">Imagem</th><th className="text-left px-3 py-3">Último acesso</th><th className="text-left px-3 py-3">Expira</th></tr></thead>
              <tbody>
                {loading ? <tr><td className="px-3 py-6 text-white/60" colSpan={7}>Carregando painel...</td></tr> : filteredUsers.length === 0 ? <tr><td className="px-3 py-6 text-white/60" colSpan={7}>Nenhum usuário encontrado.</td></tr> : filteredUsers.map((user) => (
                  <tr key={user.user_id} className="border-t border-white/10 align-top">
                    <td className="px-3 py-3"><div className="font-semibold">{user.email || "sem e-mail"}</div><div className="text-white/50 text-xs mt-1">{user.profile_name || "Sem perfil"} {user.profile_type ? `· ${user.profile_type}` : ""}</div>{user.is_owner && <div className="text-[11px] mt-1 inline-flex rounded-full bg-violet-400/20 text-violet-200 px-2 py-0.5">OWNER</div>}</td>
                    <td className="px-3 py-3 capitalize">{user.plan}</td>
                    <td className="px-3 py-3">{user.messages_used}/{user.messages_limit}</td>
                    <td className="px-3 py-3">{user.laudos_used}/{user.laudos_limit}</td>
                    <td className="px-3 py-3">{user.can_use_images ? "Sim" : "Não"}</td>
                    <td className="px-3 py-3">{fmtDate(user.last_sign_in_at)}</td>
                    <td className="px-3 py-3">{fmtDate(user.expires_at || user.trial_ends_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
