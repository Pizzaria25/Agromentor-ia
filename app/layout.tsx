import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth";

export const metadata: Metadata = {
  title: "AgroMentor IA",
  description: "Plataforma Agronômica Inteligente — Diagnóstico, Laudos e Consultoria com IA",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0a2e1a",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isLoggedIn = !!data.user;
  const isOwner = isOwnerEmail(data.user?.email);

  return (
    <html lang="pt-BR">
      <body className="bg-[#0a2e1a] text-white antialiased">
        {isLoggedIn && <NavBar isOwner={isOwner} />}
        <div className={isLoggedIn ? "pb-16 sm:pb-0 sm:pt-0" : ""}>{children}</div>
      </body>
    </html>
  );
}
