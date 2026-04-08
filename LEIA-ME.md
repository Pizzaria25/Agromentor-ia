# AgroMentor IA v2 🌱

## Deploy na Vercel (passo a passo)

### 1. Subir para o GitHub
```bash
git add .
git commit -m "fix: configurações para deploy Vercel"
git push
```

### 2. Configurar variáveis na Vercel
Acesse: **Vercel → seu projeto → Settings → Environment Variables**

Adicione TODAS as variáveis do `.env.example`. As mais críticas:

| Variável | Onde pegar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → API → **anon / public key** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → **service_role key** |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → seu endpoint → Signing secret |
| `STRIPE_PRICE_ESTUDANTE` | Stripe → Products → Estudante → Price ID |
| `STRIPE_PRICE_PRODUTOR` | Stripe → Products → Produtor → Price ID |
| `STRIPE_PRICE_PROFISSIONAL` | Stripe → Products → Profissional → Price ID |
| `STRIPE_PRICE_ESCRITORIO` | Stripe → Products → Escritório → Price ID |
| `STRIPE_PRICE_USINA` | Stripe → Products → Usina → Price ID |
| `OWNER_EMAILS` | seu email (ex: `seu@email.com`) |
| `NEXT_PUBLIC_APP_URL` | URL do seu app (ex: `https://agromentor-ia.vercel.app`) |

### 3. Configurar o Webhook do Stripe
No Stripe Dashboard → Webhooks → Add endpoint:
- URL: `https://SEU-DOMINIO.vercel.app/api/stripe/webhook`
- Eventos: `checkout.session.completed`, `customer.subscription.deleted`
- Copie o **Signing secret** para `STRIPE_WEBHOOK_SECRET`

### 4. Executar migration no Supabase
- Acesse Supabase Dashboard → SQL Editor
- Cole e execute o conteúdo de `supabase_migration.sql`

### 5. Verificar se tudo está funcionando
Acesse `https://SEU-DOMINIO/api/owner/health` logado com seu email de owner.
O retorno deve mostrar todas as variáveis como `true`.

---

## Rodar localmente

```bash
cp .env.example .env.local
# Preencha os valores no .env.local
npm install
npm run dev
```

---

## Estrutura do projeto

```
app/
  chat/           → Chat principal com IA
  laudos/         → Lista de laudos gerados
  planos/         → Planos e assinaturas
  assinar/[token] → Co-assinatura pública (sem login)
  owner/          → Painel administrativo (modo deus)
  api/
    chat/         → Claude IA + onboarding + threads
    laudos/       → Geração de laudo + HTML para PDF
    assinar/      → Co-assinatura via token público
    billing/      → Stripe checkout
    stripe/       → Webhook Stripe
    usage/        → Status de uso e perfil
    owner/        → Health check, logs, overview, grant
```

## Planos configurados

| Plano | Mensagens | Laudos | Imagens |
|---|---|---|---|
| Trial | 20 | 1 | ❌ |
| Estudante | 100 | 3 | ❌ |
| Produtor | 200 | 5 | ✅ |
| Profissional | ilimitado | 15 | ✅ |
| Escritório | ilimitado | 50 | ✅ |
| Usina | ilimitado | ilimitado | ✅ |
| Owner (modo deus) | ilimitado | ilimitado | ✅ |
