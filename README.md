<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
# AgroMentor IA

Versão organizada para virar SaaS pago: **Chat + Casos (automático) + Laudos (PDF) + Dashboard + RAG**, usando **Supabase** e **Stripe**.

## 1) Setup do Supabase (obrigatório)

1. Crie um projeto no Supabase.
2. No SQL Editor, rode o script: `supabase/schema.sql`
3. Em **Project Settings → API**, copie:
   - Project URL
   - Publishable key (ou Anon key, se ainda não tiver publishable)

> Este projeto usa `@supabase/ssr` com cookies (SSR), recomendado pela Supabase. citeturn1view0

## 2) Variáveis de ambiente

Crie `.env.local` na raiz (use `.env.example` como base):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `OPENAI_API_KEY` (opcional, mas recomendado para laudos automáticos)

Stripe (para cobrança):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MENSAL`
- `STRIPE_PRICE_PRO_ANUAL`
- `STRIPE_PRICE_LAUDO_AVULSO`

Outras:
- `NEXT_PUBLIC_APP_URL` (local: `http://localhost:3000`, produção: URL da Vercel)
- `DEV_ADMIN_EMAILS` (emails com acesso total para testes)

## 3) Rodar local

```bash
npm install
npm run dev
```

Abra: http://localhost:3000

## 4) Fluxo

1. Crie conta em `/register`
2. Entre em `/login`
3. Use o chat em `/chat` → o sistema cria um **Caso automaticamente** e salva o histórico
4. No chat, clique em **Gerar laudo agora** → salva em `reports`
5. Baixe o PDF em `/laudos` (botão **Baixar PDF**)
6. Veja indicadores em `/dashboard`

## 5) RAG (Base de conhecimento)

1) Rode `supabase/schema.sql` (cria `knowledge_chunks` + função `match_knowledge`).
2) Vá em `/developer` (apenas `DEV_ADMIN_EMAILS`).
3) Adicione “chunks” (título, categoria, conteúdo). O app calcula embedding e o chat usa esse contexto.

## 6) Deploy na Vercel (sem PC ligado)

1) Suba o projeto no GitHub.
2) Vercel → Import Project.
3) Em **Settings → Environment Variables**, copie tudo do `.env.local`.

**Importante:**
- `NEXT_PUBLIC_APP_URL` deve ser a URL da Vercel (ex.: `https://seuapp.vercel.app`)

### Stripe Webhook

No Stripe, crie um webhook apontando para:

`https://SEU_APP.vercel.app/api/webhooks/stripe`

Copie o `whsec_...` para `STRIPE_WEBHOOK_SECRET`.

## Observações

- Remova `node_modules` antes de zipar/compartilhar.
- Para subir na Vercel, configure as mesmas variáveis de ambiente no projeto.
>>>>>>> 9363d12 (Deploy inicial AgroMentor IA)
