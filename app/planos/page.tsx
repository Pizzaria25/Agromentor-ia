import { requireUser, isDevAdmin, getUser } from "@/lib/auth";
import PlanosClient from "./PlanosClient";

export default async function PlanosPage() {
  await requireUser();
  const user = await getUser();
  const dev = isDevAdmin(user?.email);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Planos</h1>
      <p className="mt-2 text-white/70">
        Assine para liberar laudos e recursos avançados.
      </p>
      <div className="mt-6">
        <PlanosClient dev={dev} />
      </div>
    </main>
  );
}
