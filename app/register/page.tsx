"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setMsg("Conta criada! Agora faça login.");
    } catch (err: any) {
      setMsg(err?.message ?? "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 text-white">
      <h1 className="text-2xl font-semibold">Criar conta</h1>
      <p className="mt-1 text-white/70">Para usar Casos, Laudos e Dashboard.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div>
          <label className="text-sm text-white/70">Email</label>
          <input
            className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/25"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label className="text-sm text-white/70">Senha</label>
          <input
            className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/25"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            placeholder="mínimo recomendado: 8+"
          />
        </div>

        {msg ? <div className="text-sm text-white/80">{msg}</div> : null}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-white px-3 py-2 font-medium text-black hover:bg-white/90 disabled:opacity-60"
        >
          {loading ? "Criando..." : "Criar conta"}
        </button>

        <div className="text-sm text-white/70">
          Já tem conta?{" "}
          <Link className="text-white underline" href="/login">
            Entrar
          </Link>
        </div>
      </form>
    </main>
  );
}
