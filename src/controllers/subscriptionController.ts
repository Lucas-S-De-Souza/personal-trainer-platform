import { z } from "zod";
import * as subscriptionService from "@/services/subscriptionService";
import type { SubscriptionStatusResponse, ExistingSubscriptionResponse } from "@/types";

export class SubscriptionNotFoundError extends Error {
  constructor() {
    super("Assinatura não encontrada");
    this.name = "SubscriptionNotFoundError";
  }
}

export class InvalidEmailError extends Error {
  constructor() {
    super("E-mail inválido");
    this.name = "InvalidEmailError";
  }
}

/**
 * Retorna apenas os campos seguros para exibição pública na página de
 * sucesso — nunca o e-mail/telefone completos ou IDs internos da Stripe.
 */
export async function handleGetSubscriptionStatus(id: string): Promise<SubscriptionStatusResponse> {
  const subscription = await subscriptionService.getSubscriptionById(id);
  if (!subscription) throw new SubscriptionNotFoundError();

  return {
    id: subscription.id,
    status: subscription.status,
    planName: subscription.planName,
    interval: subscriptionService.toIntervalKey(subscription.interval),
    amount: subscription.amount,
    currency: subscription.currency,
    customerName: subscription.customerName,
    currentPeriodEnd: subscription.currentPeriodEnd ? subscription.currentPeriodEnd.toISOString() : null,
  };
}

const emailSchema = z.string().trim().toLowerCase().email();

/**
 * Verifica se um e-mail já tem uma assinatura "em vigor" (ativa, atrasada
 * ou aguardando 1º pagamento) — usado pelo checkout para avisar a pessoa
 * ANTES de criar uma nova assinatura, em vez de trocar o plano dela em
 * silêncio. Só devolve informação mínima (nome do plano e data), nunca
 * IDs internos.
 */
export async function handleCheckExistingSubscription(rawEmail: string): Promise<ExistingSubscriptionResponse> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) throw new InvalidEmailError();

  const existing = await subscriptionService.findActiveSubscriptionsByEmail(parsed.data);
  if (existing.length === 0) {
    return { hasActiveSubscription: false };
  }

  // Normalmente só existe uma (o próprio checkout garante isso ao cancelar
  // a anterior quando a pessoa troca de plano), mas por segurança pega a
  // mais recente caso exista mais de uma por algum motivo.
  const mostRecent = existing.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  return {
    hasActiveSubscription: true,
    planName: mostRecent.planName,
    interval: subscriptionService.toIntervalKey(mostRecent.interval),
    currentPeriodEnd: mostRecent.currentPeriodEnd ? mostRecent.currentPeriodEnd.toISOString() : null,
  };
}
