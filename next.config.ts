import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Garante que variáveis de ambiente do servidor não vazem pro cliente
  serverExternalPackages: ["@anthropic-ai/sdk"],

  // Evita erros de build por tipos strict do Vercel
  typescript: {
    ignoreBuildErrors: false,
  },

  // Headers de segurança e CORS corretos para produção
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_APP_URL || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
