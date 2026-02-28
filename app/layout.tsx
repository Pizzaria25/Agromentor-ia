import "./globals.css";

export const metadata = {
  title: "AgroMentor IA",
  description: "Consultor de campo — rápido, prático e direto.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="premium-bg">{children}</body>
    </html>
  );
}