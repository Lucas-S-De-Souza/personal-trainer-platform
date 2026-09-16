import Stripe from "stripe";
import { checkoutSchema, normalizePhone } from "@/utils/validation";
import { cleanText } from "@/utils/sanitize";
import { getPlanById, getCycleAmount } from "@/config/plans";
import { getEnv } from "@/utils/env";
import { logger } from "@/utils/logger";
import * as subscriptionService from "@/services/subscriptionService";
import * as stripeService from "@/services/stripeService";
import type { CreateCheckoutResult } from "@/types";

export class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutValidationError";
  }
}

/**
 * Orquestra a criação de uma assinatura:
 * 1. valida e sanitiza a entrada (inclui o ciclo de cobrança escolhido),
 * 2. confere o plano no catálogo do servidor e calcula o valor do ciclo,
 * 3. cria/reaproveita o Customer na Stripe,
 * 4. cria a Subscription na Stripe (com o cartão ainda pendente de confirmação),
 * 5. espelha isso no nosso banco (status INCOMPLETE),
 * 6. devolve o client_secret da primeira fatura para o front-end confirmar o pagamento.
 */
export async function handleCreateCheckout(rawInput: unknown): Promise<CreateCheckoutResult> {
  const parsed = checkoutSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new CheckoutValidationError(firstIssue?.message ?? "Dados inválidos");
  }

  const input = parsed.data;

  const plan = getPlanById(input.planId);
  if (!plan) {
    throw new CheckoutValidationError("Plano selecionado não existe");
  }

  const customerName = cleanText(input.customerName);
  const customerPhone = normalizePhone(input.customerPhone);
  const cycleAmount = getCycleAmount(plan, input.interval);

  // Se essa pessoa já tem uma assinatura em vigor (do mesmo plano ou de
  // outro), cancela ela antes de criar a nova — assim ela troca de plano
  // em vez de ficar com duas assinaturas "ativas" ao mesmo tempo (o que
  // apareceria como duas cobranças e dois alunos duplicados no painel).
  const previousSubscriptions = await subscriptionService.findActiveSubscriptionsByEmail(input.customerEmail);
  for (const previous of previousSubscriptions) {
    try {
      await stripeService.cancelSubscription(previous.stripeSubscriptionId);
    } catch (error) {
      // Pode já estar cancelada do lado da Stripe (ex: dupla submissão) —
      // segue o fluxo normalmente, só registra pra investigar se persistir.
      logger.warn("Falha ao cancelar assinatura anterior na Stripe (pode já estar cancelada)", {
        stripeSubscriptionId: previous.stripeSubscriptionId,
        error: error instanceof Error ? error.message : "erro desconhecido",
      });
    }
    await subscriptionService.updateSubscriptionStatus(previous.stripeSubscriptionId, "CANCELED", {
      canceledAt: new Date(),
    });
  }

  const stripeCustomer = await stripeService.findOrCreateCustomer({
    email: input.customerEmail,
    name: customerName,
    phone: customerPhone,
  });

  const stripeSubscription = await stripeService.createSubscription({
    customerId: stripeCustomer.id,
    plan,
    interval: input.interval,
    cycleAmount,
  });

  const subscriptionRecord = await subscriptionService.createSubscriptionRecord({
    planId: plan.id,
    interval: input.interval,
    customerName,
    customerEmail: input.customerEmail,
    customerPhone,
    stripeCustomerId: stripeCustomer.id,
    stripeSubscriptionId: stripeSubscription.id,
  });

  const latestInvoice = stripeSubscription.latest_invoice as Stripe.Invoice | null;
  const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent | null | undefined;

  if (!paymentIntent?.client_secret) {
    logger.error("Stripe não retornou client_secret para a assinatura", {
      subscriptionId: subscriptionRecord.id,
      stripeSubscriptionId: stripeSubscription.id,
    });
    throw new Error("Não foi possível iniciar o pagamento. Tente novamente.");
  }

  const { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY } = getEnv();

  return {
    subscriptionId: subscriptionRecord.id,
    clientSecret: paymentIntent.client_secret,
    publishableKey: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  };
}
