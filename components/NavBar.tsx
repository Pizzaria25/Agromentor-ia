"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NavBar({ isOwner = false }: { isOwner?: boolean }) {
  const pathname = usePathname();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a2e1a]/95 backdrop-blur-xl border-t border-white/10 flex justify-around items-center px-2 py-2 sm:relative sm:bottom-auto sm:flex-row sm:px-6 sm:py-3 sm:border-b sm:border-t-0">
      <div className="hidden sm:flex items-center gap-2 mr-6">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-base">🌱</div>
        <span className="font-bold text-sm">Agro<span className="text-emerald-400">Mentor</span> IA</span>
      </div>

      <Link href="/chat" className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-4 py-2 rounded-xl transition-all text-xs sm:text-sm font-medium ${isActive("/chat") ? "bg-emerald-500/15 text-emerald-400 border border-emerald-400/20" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
        <span className="text-lg sm:text-base">💬</span>
        <span>Chat</span>
      </Link>

      <Link href="/laudos" className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-4 py-2 rounded-xl transition-all text-xs sm:text-sm font-medium ${isActive("/laudos") ? "bg-emerald-500/15 text-emerald-400 border border-emerald-400/20" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
        <span className="text-lg sm:text-base">📄</span>
        <span>Laudos</span>
      </Link>

      {isOwner && (
        <Link href="/owner" className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-4 py-2 rounded-xl transition-all text-xs sm:text-sm font-medium ${isActive("/owner") ? "bg-violet-500/15 text-violet-300 border border-violet-400/20" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
          <span className="text-lg sm:text-base">👑</span>
          <span>Owner</span>
        </Link>
      )}

      <Link href="/planos" className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-4 py-2 rounded-xl transition-all text-xs sm:text-sm font-medium ${isActive("/planos") ? "bg-amber-500/15 text-amber-400 border border-amber-400/20" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
        <span className="text-lg sm:text-base">⭐</span>
        <span>Planos</span>
      </Link>

      <button onClick={signOut} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-4 py-2 rounded-xl transition-all text-xs sm:text-sm font-medium text-white/60 hover:text-red-400 hover:bg-red-500/5">
        <span className="text-lg sm:text-base">↩</span>
        <span>Sair</span>
      </button>
    </nav>
  );
}
