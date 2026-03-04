import Link from "next/link";
import Image from "next/image";
import { getUser, isDevAdmin } from "@/lib/auth";

export default async function NavBar() {
  const user = await getUser();
  const admin = isDevAdmin(user?.email);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/40 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Image
            src="/logo-agromentor.png"
            alt="AgroMentor IA"
            width={36}
            height={36}
            priority
            className="rounded-xl"
          />
          <span>
            AgroMentor <span className="text-white/60">IA</span>
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm text-white/80">
          {user && (
            <>
              <Link className="hover:text-white" href="/chat">IA</Link>
              <Link className="hover:text-white" href="/casos">Casos</Link>
              <Link className="hover:text-white" href="/laudos">Laudos</Link>
              <Link className="hover:text-white" href="/dashboard">Dashboard</Link>
              <Link className="hover:text-white" href="/planos">Planos</Link>
              {admin && <Link className="hover:text-white" href="/developer">Developer</Link>}
              <div className="h-4 w-px bg-white/15" />
            </>
          )}

          {user ? (
            <form action="/api/auth/signout" method="post">
              <button className="rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/15">
                Sair
              </button>
            </form>
          ) : (
            <Link className="rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/15" href="/login">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
