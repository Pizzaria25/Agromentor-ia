import { requireUser, isDevAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import DeveloperClient from "./DeveloperClient";

export default async function DeveloperPage() {
  const user = await requireUser();
  if (!isDevAdmin(user.email)) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Developer</h1>
      <p className="mt-1 text-white/70">
        Área interna para testes: RAG, previsões e validação do funil.
      </p>
      <DeveloperClient />
    </main>
  );
}
