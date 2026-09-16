import Stripe from "stripe";
import { getEnv } from "@/utils/env";
import { BILLING_INTERVALS } from "@/config/plans";
import type { Plan } from "@/types";
import type { BillingIntervalKey } from "@/types";

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;

  const { STRIPE_SECRET_KEY } = getEnv();
  stripeClient = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
    typescript: true,
  });
  return stripeClient;
}

/**
 * Busca um Customer existente pelo e-mail ou cria um novo.
 * Evita criar um Customer duplicado na Stripe toda vez que a mesma
 * pessoa assina (ou tenta assinar de novo) um plano.
 */
export async function findOrCreateCustomer(params: {
  email: string;
  name: string;
  phone: string;
}): Promise<Stripe.Customer> {
  const stripe = getStripeClient();

  const existing = await stripe.customers.list({ email: params.email, limit: 1 });
  if (existing.data[0]) {
    return stripe.customers.update(existing.data[0].id, {
      name: params.name,
      phone: params.phone,
    });
  }

  return stripe.customers.create({
    email: params.email,
    name: params.name,
    phone: params.phone,
  });
}

/**
 * Busca um Product existente pelo `metadata.planId` ou cria um novo.
 *
 * IMPORTANTE: ao contrário da API de Checkout Sessions, a API de
 * Subscriptions NÃO aceita criar um produto "na hora" via `product_data`
 * dentro de `price_data` — ela exige o ID de um Product que já existe
 * (é isso que o erro "Did you mean product?" da Stripe está dizendo).
 * Por isso resolvemos/criamos o Product aqui, uma vez por plano, e
 * reaproveitamos o mesmo Product em todas as assinaturas daquele plano
 * (mensal ou trimestral) — só o Price varia a cada assinatura.
 */
async function findOrCreateProduct(plan: Plan): Promise<string> {
  const stripe = getStripeClient();

  const products = await stripe.products.list({ active: true, limit: 100 });
  const existing = products.data.find((product) => product.metadata.planId === plan.id);
  if (existing) return existing.id;

  const created = await stripe.products.create({
    name: `Plano ${plan.name}`,
    metadata: { planId: plan.id },
  });
  return created.id;
}

interface CreateSubscriptionParams {
  customerId: string;
  plan: Plan;
  interval: BillingIntervalKey;
  cycleAmount: number; // valor total do ciclo, em centavos — sempre calculado no servidor
}

/**
 * Cria a assinatura na Stripe usando `price_data` inline em vez de um
 * Price ID pré-cadastrado no Dashboard — assim o preço continua vindo
 * 100% do nosso config/plans.ts (fonte única de verdade), sem precisar
 * manter preços duplicados manualmente no Dashboard da Stripe. O Product
 * (não o Price) é reaproveitado entre assinaturas do mesmo plano — veja
 * `findOrCreateProduct` acima.
 *
 * `payment_behavior: "default_incomplete"` + `expand: ["latest_invoice.payment_intent"]`
 * é o padrão oficial da Stripe para coletar o método de pagamento no
 * mesmo passo em que a assinatura é criada, usando Stripe Elements no
 * front-end — é por isso que o restante do fluxo de pagamento
 * (CheckoutForm.tsx) não precisa mudar quase nada em relação à versão
 * anterior com PaymentIntent avulso.
 *
 * Não recebe o id do nosso registro local porque ele ainda não existe
 * nesse ponto (é criado logo depois, já com o id desta assinatura da
 * Stripe) — a conciliação nos webhooks usa o `stripeSubscriptionId`
 * como chave, então isso não é um problema.
 */
export async function createSubscription(params: CreateSubscriptionParams) {
  const stripe = getStripeClient();
  const intervalConfig = BILLING_INTERVALS[params.interval];
  const productId = await findOrCreateProduct(params.plan);

  const subscription = await stripe.subscriptions.create({
    customer: params.customerId,
    items: [
      {
        price_data: {
          currency: params.plan.currency,
          product: productId,
          unit_amount: params.cycleAmount,
          recurring: {
            interval: intervalConfig.stripeInterval,
            interval_count: intervalConfig.intervalCount,
          },
        },
      },
    ],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent"],
    metadata: {
      planId: params.plan.id,
      interval: params.interval,
    },
  });

  return subscription;
}

export async function cancelSubscription(stripeSubscriptionId: string) {
  const stripe = getStripeClient();
  return stripe.subscriptions.cancel(stripeSubscriptionId);
}

export async function retrieveSubscription(stripeSubscriptionId: string) {
  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(stripeSubscriptionId);
}

/**
 * Extrai a data de "próxima cobrança" (fim do período atual) de uma
 * assinatura, de um jeito que funciona tanto em contas Stripe antigas
 * quanto em contas já na versão "Basil" (31/mar/2025) da API.
 *
 * A Stripe removeu `current_period_end` do nível da assinatura nessa
 * versão e passou a expor isso por ITEM da assinatura
 * (`items.data[].current_period_end`) — mesmo fixando uma apiVersion
 * antiga no cliente (veja getStripeClient acima), decidimos ler dos dois
 * lugares por segurança, já que esse é um dos bugs mais comuns e
 * documentados dessa migração. Como cada assinatura nossa tem só 1 item
 * (veja createSubscription), pegar o primeiro item é suficiente.
 */
export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const legacyPeriodEnd = (subscription as unknown as { current_period_end?: number | null })
    .current_period_end;
  const itemPeriodEnd = (
    subscription.items?.data?.[0] as unknown as { current_period_end?: number | null } | undefined
  )?.current_period_end;

  const unixSeconds = itemPeriodEnd ?? legacyPeriodEnd;
  return unixSeconds ? new Date(unixSeconds * 1000) : null;
}

/**
 * Verifica a assinatura do webhook, garantindo que o evento realmente
 * veio da Stripe (e não de um terceiro forjando a requisição).
 * `rawBody` precisa ser o corpo cru da requisição — por isso a rota
 * de webhook não pode usar `request.json()` antes de chamar isto.
 */
export function constructWebhookEvent(rawBody: string, signature: string): Stripe.Event {
  const stripe = getStripeClient();
  const { STRIPE_WEBHOOK_SECRET } = getEnv();
  return stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
}

/**
 * Cria uma sessão do Stripe Customer Portal — é essa URL que dá pro
 * aluno ver a próxima cobrança, trocar de plano, cancelar e atualizar o
 * cartão, sem a gente precisar construir nada disso na mão.
 *
 * IMPORTANTE: antes de usar em produção, configure o portal uma vez no
 * Dashboard da Stripe (Settings → Billing → Customer portal) — lá você
 * escolhe se permite cancelamento, troca de plano, etc. Sem configurar,
 * a Stripe usa uma configuração padrão bem limitada.
 */
export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  const stripe = getStripeClient();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
