# Thais Santana — Checkout de Planos

Landing page + checkout seguro para os planos de personal trainer, com pagamento
processado pela **Stripe** (nunca por um sistema de pagamento próprio).

## Stack

Next.js 15 (App Router) · TypeScript · Prisma + PostgreSQL · Tailwind CSS · Stripe · Resend

> **Nota de segurança:** o projeto foi migrado do Next.js 14 para o **15.5.21**
> em ago/2026, porque uma vulnerabilidade de DoS (CVE-2026-23864, disclosed em
> 26/jan/2026) não recebeu correção retroativa para a linha 14.x — o Next 14
> está em fim de vida. Se você clonar este projeto no futuro, rode
> `npm audit` logo após o `npm install` e confira se não há uma versão do
> Next.js/React mais nova recomendada.

> **Já tinha o projeto rodando antes?** O banco de dados ganhou tabelas novas
> nessa leva. Depois de substituir os arquivos, rode de novo:
> ```bash
> npx prisma migrate dev --name customer-portal
> ```
> Só isso — não precisa mexer em dado nenhum que já existia.

## Arquitetura

```
src/
  app/                    → Rotas (Next.js App Router)
    page.tsx              → Landing page (seção de planos)
    checkout/[planId]/    → Página de checkout de um plano específico
    checkout/success/     → Página de confirmação (consulta o status real no servidor)
    api/
      csrf/                → Emite o token CSRF
      checkout/            → Cria o pedido + PaymentIntent na Stripe
      orders/[id]/         → Consulta o status de um pedido (usado pela página de sucesso)
      webhooks/stripe/     → Recebe a confirmação oficial de pagamento da Stripe

  components/             → Componentes de UI (React)
  controllers/            → Orquestram validação + serviços (chamados pelas rotas)
  services/                → Integrações externas (Stripe, Resend) e regras de dados (Order)
  middleware/              → CSRF e rate limiting (usados dentro das rotas Node.js)
  database/                → Cliente Prisma (singleton)
  utils/                   → Validação (Zod), sanitização, logger, variáveis de ambiente
  types/                   → Tipos compartilhados
  config/plans.ts          → Fonte única de verdade dos planos e preços

middleware.ts              → Middleware de borda (Edge Runtime) — checagens leves antes de tudo
prisma/schema.prisma        → Modelo do banco de dados
```

## Por que Stripe (e não um sistema de pagamento próprio)

Este projeto **não implementa** processamento de pagamento, armazenamento de cartão,
nem antifraude. Toda essa responsabilidade fica com a Stripe, que é PCI-DSS
compliant. O que este projeto faz é:

- Coletar nome/e-mail/telefone no nosso próprio checkout — isso **é** o
  cadastro do aluno, não existe uma tabela de usuários/login separada;
- Criar uma **assinatura recorrente de verdade** (`Subscription`) na Stripe,
  com o **valor definido no servidor** (`src/config/plans.ts`) — o valor
  nunca é confiado a partir do que o navegador envia;
- Renderizar o campo de cartão via **Stripe Payment Element**, que roda dentro
  de um iframe da própria Stripe — o número do cartão nunca passa pelo nosso
  backend;
- Confirmar cada cobrança (a primeira e todas as renovações seguintes)
  oficialmente via **webhook assinado**, não via redirect do navegador (que
  pode ser manipulado/revisitado manualmente).

### Mensal e trimestral

Cada plano (`Start`, `Premium`, `Elite`) tem um preço mensal-base em
`src/config/plans.ts`. O valor trimestral é **calculado automaticamente**
a partir dele (3x o mensal, com desconto configurável em
`BILLING_INTERVALS.quarterly.discountPercent`) — não existe um segundo
preço pra manter atualizado manualmente. O aluno escolhe o ciclo na própria
página de checkout.

### Status da assinatura

O status de cada aluno (`ACTIVE`, `PAST_DUE`, `CANCELED`, `UNPAID`) é
sincronizado automaticamente pelos webhooks (`invoice.payment_succeeded`,
`invoice.payment_failed`, `customer.subscription.updated/deleted`) — é
esse status, salvo em `Subscription.status` no banco, que futuramente vai
alimentar o painel da Thais (ainda não construído, veja "Limitações" abaixo).

## Como rodar localmente

### 1. Pré-requisitos

- Node.js 18.18+ (recomendado 20+)
- Um banco PostgreSQL (local, ou gratuito em [Neon](https://neon.tech) / [Supabase](https://supabase.com))
- Uma conta [Stripe](https://dashboard.stripe.com/register) (o modo de teste já é suficiente)
- Uma conta [Resend](https://resend.com) para o envio de e-mail (tem plano gratuito)
- Uma conta [Meta for Developers](https://developers.facebook.com) com um app
  configurado para WhatsApp Cloud API (veja o passo 3.1 abaixo)

### 2. Instalar dependências

```bash
npm install
```

> Se aparecer aviso de *peer dependency* envolvendo `react`/`react-dom`
> (comum logo após uma migração de major version, enquanto alguma
> dependência ainda não publicou suporte oficial ao React 19), rode
> `npm install --legacy-peer-deps`. Isso não é uma falha de segurança,
> só o npm sendo rígido sobre versões declaradas.

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o `.env` com:

- `DATABASE_URL` — string de conexão do Postgres
- `STRIPE_SECRET_KEY` e `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — em
  Stripe Dashboard → Developers → API keys (use as chaves de **teste**, que
  começam com `sk_test_` / `pk_test_`, enquanto estiver desenvolvendo)
- `STRIPE_WEBHOOK_SECRET` — veja o passo 5 abaixo
- `RESEND_API_KEY` e `EMAIL_FROM` — em resend.com/api-keys (o domínio de envio
  precisa estar verificado no Resend antes de ir para produção)
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` — veja o passo 3.1 abaixo
- `WHATSAPP_TEMPLATE_NAME` — precisa bater com o nome exato do template
  aprovado (veja 3.1); o padrão já configurado é `pagamento_confirmado`
- `CSRF_SECRET` — qualquer string aleatória forte, ex: `openssl rand -base64 32`
- `ADMIN_PASSWORD` — a senha que a Thais vai usar pra entrar em `/admin`
- `ADMIN_EMAIL` — e-mail da Thais, usado só para receber o link de "esqueci minha senha"
- `ADMIN_SESSION_SECRET` — outra string aleatória forte (diferente do `CSRF_SECRET`)

#### 3.1 Configurar o WhatsApp Cloud API (Meta)

> **Essa parte é opcional pra começar.** Se você ainda não tem a conta da
> Meta pronta, pode deixar `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`
> em branco no `.env` (`WHATSAPP_ACCESS_TOKEN=""`) — o checkout, o e-mail e o
> painel administrativo funcionam normalmente sem isso. Só a mensagem de
> WhatsApp fica desativada (o app avisa no terminal quando isso acontece,
> não quebra nada) até você preencher essas duas variáveis.

1. Acesse [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Criar app** → tipo **Negócios**.
2. Dentro do app, adicione o produto **WhatsApp**.
3. Na aba **API Setup**, você já ganha um número de teste da própria Meta
   (funciona só pra enviar mensagem para números cadastrados como
   destinatário de teste — ótimo pra desenvolvimento). Copie ali:
   - **Temporary access token** → `WHATSAPP_ACCESS_TOKEN` (expira em 24h em
     modo teste; pra produção, gere um token permanente em
     System Users → Generate Token)
   - **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
4. Cadastre seu próprio número como destinatário de teste em
   **API Setup → To → Manage phone number list**.
5. Crie o template de mensagem em **WhatsApp Manager → Message Templates → Create Template**:
   - **Nome**: `pagamento_confirmado` (precisa ser exatamente esse valor, ou
     o que você colocar em `WHATSAPP_TEMPLATE_NAME`)
   - **Categoria**: Utility (transacional — aprova mais rápido que Marketing)
   - **Idioma**: Portuguese (BR)
   - **Corpo**, com 2 variáveis:
     ```
     Olá, {{1}}! Seu pagamento do plano {{2}} foi confirmado. Seja muito bem-vindo(a)! Em breve entraremos em contato para iniciar seu acompanhamento.
     ```
   - Envie para aprovação. Em modo desenvolvimento costuma aprovar em minutos;
     produção pode levar até 24h na primeira vez.

O código em `src/services/whatsappService.ts` já envia `{{1}}` = primeiro
nome do aluno e `{{2}}` = nome do plano, nessa ordem — se você mudar o texto
do template, mantenha essas duas variáveis (ou ajuste o `templateParams` na
chamada em `webhookController.ts`).

### 4. Preparar o banco de dados

```bash
npx prisma migrate dev --name subscriptions
```

Isso cria as tabelas `Subscription` e `ProcessedWebhookEvent` a partir de
`prisma/schema.prisma`.

### 5. Escutar webhooks da Stripe localmente

Em desenvolvimento, use a [Stripe CLI](https://stripe.com/docs/stripe-cli) para
encaminhar eventos da Stripe para sua máquina:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

O comando acima imprime um `whsec_...` — copie esse valor para
`STRIPE_WEBHOOK_SECRET` no `.env`. Repare que este comando escuta **todos**
os eventos por padrão, o que já cobre os que usamos aqui
(`invoice.payment_succeeded`, `invoice.payment_failed`,
`customer.subscription.updated`, `customer.subscription.deleted`).

### 6. Adicionar a foto da seção "Sobre"

Coloque o arquivo `foto_perfil.png` (a foto real da Thais, a mesma usada no
site estático) dentro da pasta `public/` deste projeto. A landing page já
está referenciando `/foto_perfil.png` — sem esse arquivo, essa imagem
específica não carrega (o resto da página funciona normalmente).

### 7. Rodar a aplicação

```bash
npm run dev
```

Acesse `http://localhost:3000`, escolha um plano, escolha o ciclo (mensal ou
trimestral) e use um [cartão de teste da Stripe](https://stripe.com/docs/testing)
(ex: `4242 4242 4242 4242`, qualquer data futura, qualquer CVC) para simular
uma assinatura completa. Se tudo estiver configurado, você deve receber a
confirmação por e-mail **e** por WhatsApp.

## Painel administrativo

Acesse `http://localhost:3000/admin` e entre com a senha definida em
`ADMIN_PASSWORD`. O painel funciona **independente** de o WhatsApp estar
configurado — só depende do banco de dados (`DATABASE_URL`), então dá pra
testar já, mesmo sem ter feito a parte 3.1.

O painel tem duas abas:

**Aba "Alunos"**
- Cards de resumo: alunos ativos, receita mensal recorrente (MRR — soma dos
  planos ativos, com o trimestral já convertido pra equivalente mensal),
  quantos precisam de atenção (pagamento atrasado ou ainda não confirmado) e
  quantos cancelaram.
- Uma tabela com todos os alunos, com busca por nome/e-mail/telefone e
  filtro por status.
- O status de cada aluno vem **direto do banco**, que é atualizado
  automaticamente pelos webhooks — não precisa apertar nenhum botão de
  "atualizar", nem checar a Stripe manualmente.

**Aba "Receita"**
- KPIs: MRR atual, variação vs. mês passado (%), novos assinantes e
  cancelamentos no mês.
- Gráfico de área com o MRR dos últimos 12 meses.
- Gráfico de barras comparando novos assinantes vs. cancelamentos por mês.
- Gráfico de barras com a receita atual por plano (Start/Premium/Elite).
- Tabela detalhada mês a mês: MRR, variação %, novos, cancelados e saldo
  líquido — pra comparar qualquer par de meses rapidamente.

> **Como os números são calculados**: a partir do status de cada assinatura
> salvo no nosso banco (`createdAt`, `canceledAt`, `status`, `amount`), não
> direto do histórico de faturas da Stripe — é preciso o suficiente pro
> volume de uma personal trainer e evita chamadas extras à API a cada
> carregamento do painel. Detalhes em `src/utils/analytics.ts`.

**Trocar de plano**: se um aluno já tem uma assinatura em vigor (ativa,
atrasada, ou aguardando 1º pagamento) e tenta comprar de novo — o mesmo
plano ou outro — o checkout mostra um aviso **antes** de fazer qualquer
coisa: qual plano ele já tem, até quando é válido, e pergunta se ele quer
mesmo trocar. Só depois de confirmar é que a assinatura anterior é
cancelada e a nova é criada. Isso evita trocas acidentais e explica pro
aluno por que o plano antigo vai aparecer como "Cancelado" no histórico —
ele decide, em vez do sistema decidir por ele. A checagem acontece em
`GET /api/checkout/existing-subscription`, chamada pelo formulário assim
que a pessoa preenche o e-mail (`src/components/CheckoutForm.tsx`).

A autenticação é por senha única (não é um sistema de contas/cadastro — só
a Thais acessa). A sessão fica em um cookie assinado (`httpOnly`, então nem
o JavaScript do navegador consegue ler) e expira sozinha depois de 8 horas.

**Esqueci minha senha**: na tela de login tem um link "Esqueci minha
senha". Ele manda um e-mail (via Resend) pro endereço fixo configurado em
`ADMIN_EMAIL` no `.env`, com um link de redefinição que expira em 1 hora e
só funciona uma vez. Não existe campo de e-mail nesse fluxo — como só
existe uma senha de painel, o destinatário já é conhecido, então não tem o
que perguntar (e isso evita que a tela vire uma forma de "descobrir"
e-mails válidos). A senha, uma vez redefinida, passa a ficar guardada
(com hash, nunca em texto puro) no banco de dados em vez do `.env` — até a
primeira redefinição, o login continua funcionando com o `ADMIN_PASSWORD`
do `.env` normalmente.

## Área do aluno — "Minha assinatura"

Como o site **não tem sistema de contas/login pro aluno** (de propósito —
era um requisito), o jeito de deixar ele ver a próxima cobrança, trocar de
plano, cancelar ou atualizar o cartão é através do
[Stripe Customer Portal](https://docs.stripe.com/customer-management),
com um link mágico por e-mail no lugar de senha:

1. O aluno acessa `/minha-assinatura` (tem um link no rodapé do site, e
   também aparece logo depois de uma compra bem-sucedida) e digita o
   e-mail que usou na assinatura.
2. Se aquele e-mail tiver uma assinatura conosco, chega um e-mail com um
   link de acesso — válido por 30 minutos, uso único.
3. Ao clicar, a pessoa é redirecionada automaticamente pro Customer
   Portal de verdade da Stripe, já autenticada — lá ela vê a fatura
   atual, próxima cobrança, histórico, pode trocar de plano, cancelar ou
   trocar o cartão, tudo pela própria interface da Stripe (não construímos
   nada disso na mão).

Assim como no "esqueci minha senha" do painel, a resposta da API é sempre
a mesma independente de o e-mail existir ou não — evita que a tela vire
uma forma de descobrir quem já assinou algum plano.

> ⚠️ **Passo manual obrigatório antes de usar**: entre no Dashboard da
> Stripe → **Settings → Billing → Customer portal** e configure/ative o
> portal (defina se permite cancelamento, quais trocas de plano são
> permitidas, etc.). Sem isso, a Stripe usa uma configuração padrão bem
> limitada (às vezes nem libera cancelamento). Esse passo é feito uma
> vez só, direto no Dashboard — não tem como pular via código.

## Checklist de segurança implementada

| Item | Onde |
|---|---|
| Nunca armazenamos dados de cartão | Stripe Payment Element (iframe da Stripe) |
| HTTPS obrigatório | `Strict-Transport-Security` em `next.config.mjs`; force HTTPS no seu provedor de deploy |
| Validação de dados (cliente e servidor) | Zod no formulário (client) e em `src/utils/validation.ts` (server, sempre reexecutada) |
| Proteção contra SQL Injection | Prisma ORM (queries parametrizadas — nunca SQL concatenado) |
| Proteção contra XSS | `src/utils/sanitize.ts` (escape de HTML nos e-mails); React escapa JSX por padrão |
| Proteção contra CSRF | Cookie + header assinados com HMAC (`src/middleware/csrf.ts`) |
| Rate limiting | `src/middleware/rateLimit.ts`, aplicado em `/api/checkout` e `/api/subscriptions/:id` |
| Sessões/cookies seguros | Cookie CSRF com `Secure` (produção) e `SameSite=Lax` |
| Cabeçalhos de segurança | `next.config.mjs` (`headers()`) — CSP\*, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| Variáveis de ambiente para segredos | `src/utils/env.ts` (validação com Zod, fail-fast) |
| Chaves privadas nunca no front-end | Apenas `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pública, por design) chega ao navegador |
| Verificação de assinatura de Webhook | `stripe.webhooks.constructEvent` em `src/services/stripeService.ts` |
| Logs sem dados sensíveis | `src/utils/logger.ts` redige campos sensíveis automaticamente |
| Erros tratados sem vazar detalhes internos | Toda rota de API devolve mensagens genéricas ao cliente e loga o detalhe real só no servidor |
| Idempotência de webhook | Tabela `ProcessedWebhookEvent` — reenvios da Stripe não duplicam efeitos |
| Autenticação do painel administrativo | Senha comparada em tempo constante + sessão assinada por HMAC, cookie `httpOnly` (`src/middleware/adminAuth.ts`), rate limiting agressivo no login (`src/app/api/admin/login/route.ts`) |
| Redefinição de senha do painel | Senha nunca salva em texto puro (hash scrypt), token de redefinição de uso único com expiração de 1h, e-mail sempre vai pro destinatário fixo do servidor (nunca informado pelo cliente) — `src/services/adminCredentialService.ts` |

\* Uma Content-Security-Policy real e restritiva costuma exigir ajuste fino
por domínio de terceiro (Stripe.js, fontes do Google, etc.) — o esqueleto está
em `next.config.mjs`; recomendamos usar o
[gerador de CSP da própria Stripe](https://stripe.com/docs/security/guide#content-security-policy)
como ponto de partida antes de habilitar em produção com `report-only` primeiro.

## Solução de problemas

**E-mail de boas-vindas não chega**: o motivo mais comum é o modo de teste
do Resend — enquanto você não verificar um domínio próprio lá
(resend.com/domains), o remetente `onboarding@resend.dev` só consegue
entregar e-mail para o **endereço cadastrado na sua própria conta Resend**,
nenhum outro. Se você testou o checkout com um e-mail diferente desse,
o envio falha silenciosamente (não quebra o checkout, só o e-mail não sai).
Pra confirmar: olha o terminal do `npm run dev` logo depois de uma compra —
se aparecer `"Enviando mensagens de boas-vindas..."` seguido de
`"Falha ao enviar e-mail de boas-vindas"`, é exatamente isso. Duas opções:
use o mesmo e-mail da sua conta Resend pra testar, ou verifique um domínio
próprio (aí funciona pra qualquer destinatário).

## Limitações conhecidas / próximos passos para produção

- **Rate limiting em memória**: funciona para uma única instância. Em
  produção com múltiplas instâncias (ex: várias funções serverless
  simultâneas), troque `src/middleware/rateLimit.ts` por um limitador
  compartilhado (ex: Upstash Redis + `@upstash/ratelimit`), mantendo a mesma
  assinatura de função.
- **CSP**: incluída de forma mínima; vale revisar antes de produção (ver nota
  acima).
- **Painel administrativo**: já mostra todos os alunos com status
  automático, MRR e filtros. O que ainda falta: um botão para cancelar a
  assinatura de um aluno direto pelo painel (hoje isso se faz pelo
  Dashboard da Stripe — veja a nota mais abaixo).
- **Aviso automático pra Thais em caso de cancelamento/atraso**: ainda não
  implementado. Hoje o webhook já detecta esses eventos
  (`customer.subscription.deleted`, `invoice.payment_failed`) e atualiza o
  banco (por isso já aparecem certinho no painel) — só falta disparar uma
  notificação proativa pra ela quando isso acontecer, em vez de depender
  dela abrir o painel pra ver.
- **Token do WhatsApp em modo teste expira em 24h**: o token temporário do
  Meta for Developers expira. Antes de ir pra produção, gere um token
  permanente (System Users → Generate Token, com a permissão
  `whatsapp_business_messaging`).
- **Desconto trimestral**: hoje é uma porcentagem fixa (10%) em
  `src/config/plans.ts` (`BILLING_INTERVALS.quarterly.discountPercent`).
  Ajuste esse número livremente.
- **Reembolsos/disputas/cancelamento pelo aluno**: não há uma tela para o
  aluno cancelar a própria assinatura — hoje isso se resolve pelo Dashboard
  da Stripe (Customers → assinatura → Cancel) ou chamando
  `cancelSubscription()` de `src/services/stripeService.ts` a partir de uma
  rota futura do painel.

## Deploy

Este projeto está pronto para deploy na [Vercel](https://vercel.com) (autor do
Next.js) ou qualquer provedor com suporte a Node.js. Lembre-se de:

1. Configurar todas as variáveis de `.env.example` no provedor de deploy;
2. Trocar as chaves da Stripe de teste (`sk_test_`/`pk_test_`) para produção
   (`sk_live_`/`pk_live_`) só depois de validar o fluxo completo em teste;
3. Cadastrar o endpoint de produção (`https://seudominio.com/api/webhooks/stripe`)
   no Dashboard da Stripe → Developers → Webhooks, e usar o `whsec_` gerado
   ali (é diferente do usado com a Stripe CLI em desenvolvimento). Selecione
   pelo menos estes eventos: `invoice.payment_succeeded`,
   `invoice.payment_failed`, `customer.subscription.updated`,
   `customer.subscription.deleted`;
4. Gerar um token permanente do WhatsApp Cloud API (veja a nota em
   "Limitações conhecidas" acima) e confirmar que o template está
   aprovado em produção, não só em modo teste.
