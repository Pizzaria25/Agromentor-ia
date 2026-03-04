import "./globals.css";
<<<<<<< HEAD

export const metadata = {
  title: "AgroMentor IA",
  description: "Consultor de campo — rápido, prático e direto.",
=======
import NavBar from "@/components/NavBar";

export const metadata = {
  title: "AgroMentor",
  description: "Super IA do Agro: diagnóstico, casos, laudos e gestão — Brasil.",
>>>>>>> 9363d12 (Deploy inicial AgroMentor IA)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
<<<<<<< HEAD
      <body className="premium-bg">{children}</body>
    </html>
  );
}
=======
      <body className="premium-bg">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
>>>>>>> 9363d12 (Deploy inicial AgroMentor IA)
