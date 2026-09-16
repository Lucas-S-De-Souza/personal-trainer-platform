import { prisma } from "@/database/prisma";
import { getPlanById, getCycleAmount } from "@/config/plans";
import { logger } from "@/utils/logger";
import type { SubscriptionStatus, BillingInterval } from "@prisma/client";
import type { BillingIntervalKey } from "@/types";

const INTERVAL_TO_DB: Record<BillingIntervalKey, BillingInterval> = {
  monthly: "MONTHLY",
  quarterly: "QUARTERLY",
};
const DB_TO_INTERVAL: Record<BillingInterval, BillingIntervalKey> = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
};

interface CreateSubscriptionRecordParams {
  planId: string;
  interval: BillingIntervalKey;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}

/**
 * Cria o registro local de assinatura com status INCOMPLETE, já com os
 * IDs reais da Stripe (a assinatura é criada na Stripe primeiro — veja
 * checkoutController — então quando chegamos aqui já sabemos esses IDs,
 * sem precisar de nenhum valor temporário/placeholder).
 *
 * O preço é sempre lido do catálogo de planos no servidor (config/plans.ts),
 * nunca do que o cliente enviou — assim, mesmo que alguém adultere a
 * requisição no navegador, o valor cobrado permanece correto.
 */
export async function createSubscriptionRecord(params: CreateSubscriptionRecordParams) {
  const plan = getPlanById(params.planId);
  if (!plan) {
    throw new Error(`Plano inexistente: ${params.planId}`);
  }

  const amount = getCycleAmount(plan, params.interval);

  const subscription = await prisma.subscription.create({
    data: {
      planId: plan.id,
      planName: plan.name,
      interval: INTERVAL_TO_DB[params.interval],
      amount,
      currency: plan.currency,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      status: "INCOMPLETE",
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
    },
  });

  logger.info("Assinatura criada (pendente)", { subscriptionId: subscription.id, planId: plan.id });
  return subscription;
}

export async function getSubscriptionById(id: string) {
  return prisma.subscription.findUnique({ where: { id } });
}

/** Usado pelo painel administrativo — lista todas as assinaturas, mais recentes primeiro. */
export async function getAllSubscriptions() {
  return prisma.subscription.findMany({ orderBy: { createdAt: "desc" } });
}

export async function findByStripeSubscriptionId(stripeSubscriptionId: string) {
  return prisma.subscription.findUnique({ where: { stripeSubscriptionId } });
}

/**
 * Assinaturas "em vigor" (ativa, atrasada ou aguardando 1º pagamento) do
 * mesmo e-mail. Usado no checkout para cancelar automaticamente qualquer
 * assinatura anterior quando a pessoa compra de novo (mesmo plano ou
 * outro) — evita ficar com duas assinaturas "ativas" simultâneas pro
 * mesmo aluno no painel.
 */
export async function findActiveSubscriptionsByEmail(email: string) {
  return prisma.subscription.findMany({
    where: {
      customerEmail: email,
      status: { in: ["ACTIVE", "PAST_DUE", "INCOMPLETE"] },
    },
  });
}

/**
 * Atualiza o status a partir dos webhooks da Stripe. Idempotente: se o
 * status já for o mesmo, não faz nada além de atualizar os metadados —
 * importante porque a Stripe pode reenviar o mesmo evento mais de uma vez.
 */
export async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  status: SubscriptionStatus,
  extra?: { currentPeriodEnd?: Date | null; canceledAt?: Date | null }
) {
  const subscription = await prisma.subscription.findUnique({ where: { stripeSubscriptionId } });
  if (!subscription) {
    logger.warn("Webhook para assinatura não encontrada", { stripeSubscriptionId });
    return null;
  }

  return prisma.subscription.update({
    where: { stripeSubscriptionId },
    data: {
      status,
      currentPeriodEnd: extra?.currentPeriodEnd ?? subscription.currentPeriodEnd,
      canceledAt: extra?.canceledAt ?? subscription.canceledAt,
    },
  });
}

export async function markWelcomeEmailSent(id: string) {
  return prisma.subscription.update({ where: { id }, data: { welcomeEmailSentAt: new Date() } });
}

export async function markWelcomeWhatsappSent(id: string) {
  return prisma.subscription.update({ where: { id }, data: { welcomeWhatsappSentAt: new Date() } });
}

export async function markCancellationEmailSent(id: string) {
  return prisma.subscription.update({ where: { id }, data: { cancellationEmailSentAt: new Date() } });
}

export function toIntervalKey(interval: BillingInterval): BillingIntervalKey {
  return DB_TO_INTERVAL[interval];
}

/** Registra um evento de webhook como processado (proteção contra reprocessamento). */
export async function isWebhookEventProcessed(eventId: string): Promise<boolean> {
  const existing = await prisma.processedWebhookEvent.findUnique({ where: { id: eventId } });
  return existing !== null;
}

export async function markWebhookEventProcessed(eventId: string, type: string) {
  await prisma.processedWebhookEvent.create({ data: { id: eventId, type } });
}
