import type Stripe from "stripe";
import * as subscriptionService from "@/services/subscriptionService";
import * as stripeService from "@/services/stripeService";
import { sendWelcomeEmail, sendRenewalEmail, sendCancellationEmail } from "@/services/emailService";
import { sendWhatsappTemplate } from "@/services/whatsappService";
import { logger } from "@/utils/logger";
import type { SubscriptionStatus } from "@prisma/client";

/**
 * Processa um evento de webhook JÁ VERIFICADO (assinatura confirmada
 * em stripeService.constructWebhookEvent, chamado pela Route Handler
 * antes desta função).
 */
export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  // Proteção contra reprocessamento: a Stripe pode reenviar o mesmo
  // evento (rede instável, timeout, etc.) — a documentação oficial
  // recomenda que o receptor seja idempotente.
  const alreadyProcessed = await subscriptionService.isWebhookEventProcessed(event.id);
  if (alreadyProcessed) {
    logger.info("Evento de webhook já processado anteriormente — ignorando", { eventId: event.id });
    return;
  }

  switch (event.type) {
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    default:
      // Outros eventos (ex: customer.subscription.created, que chega antes
      // do pagamento ser confirmado) não exigem ação própria aqui.
      logger.info("Evento de webhook recebido sem handler específico", { type: event.type });
  }

  await subscriptionService.markWebhookEventProcessed(event.id, event.type);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!stripeSubscriptionId) return;

  // Busca a data de renovação direto do objeto da assinatura na Stripe —
  // mais confiável do que tentar extrair de `invoice.lines`, que pode vir
  // ausente/estruturada de forma diferente dependendo do tipo de fatura
  // (ex: cobrança com múltiplos itens, proração, etc.).
  let currentPeriodEnd: Date | null = null;
  try {
    const stripeSubscription = await stripeService.retrieveSubscription(stripeSubscriptionId);
    currentPeriodEnd = stripeService.getSubscriptionPeriodEnd(stripeSubscription);
  } catch (error) {
    logger.warn("Não foi possível buscar a data de renovação da assinatura na Stripe", {
      stripeSubscriptionId,
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
  }

  const updated = await subscriptionService.updateSubscriptionStatus(stripeSubscriptionId, "ACTIVE", {
    currentPeriodEnd,
  });

  if (!updated) {
    logger.error("Fatura paga para assinatura não encontrada", { stripeSubscriptionId });
    return;
  }

  logger.info("Assinatura ativada/renovada", { subscriptionId: updated.id });

  // Mensagem de boas-vindas só no PRIMEIRO pagamento (não a cada renovação
  // mensal/trimestral) — por isso o guard em cima de welcome*SentAt.
  const isFirstPayment = !updated.welcomeEmailSentAt && !updated.welcomeWhatsappSentAt;

  if (!isFirstPayment) {
    // Todo pagamento que não é o primeiro é uma renovação — avisa por e-mail.
    logger.info("Enviando e-mail de renovação", { subscriptionId: updated.id, email: updated.customerEmail });
    await sendRenewalEmail({
      toEmail: updated.customerEmail,
      toName: updated.customerName,
      planName: updated.planName,
      nextBillingDate: currentPeriodEnd,
    });
    return;
  }

  const firstName = updated.customerName.split(" ")[0] ?? updated.customerName;

  logger.info("Enviando mensagens de boas-vindas (primeiro pagamento confirmado)", {
    subscriptionId: updated.id,
    email: updated.customerEmail,
  });

  const emailResult = await sendWelcomeEmail({ toEmail: updated.customerEmail, toName: updated.customerName });
  if (emailResult.sent) {
    await subscriptionService.markWelcomeEmailSent(updated.id);
  }

  const whatsappResult = await sendWhatsappTemplate({
    toPhone: updated.customerPhone,
    templateParams: [firstName, updated.planName],
  });
  if (whatsappResult.sent) {
    await subscriptionService.markWelcomeWhatsappSent(updated.id);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!stripeSubscriptionId) return;

  const updated = await subscriptionService.updateSubscriptionStatus(stripeSubscriptionId, "PAST_DUE");
  if (updated) {
    logger.info("Cobrança falhou — assinatura marcada como atrasada", { subscriptionId: updated.id });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const status = mapStripeStatus(subscription.status);
  const currentPeriodEnd = stripeService.getSubscriptionPeriodEnd(subscription);
  const canceledAt = subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null;

  const updated = await subscriptionService.updateSubscriptionStatus(subscription.id, status, {
    currentPeriodEnd,
    canceledAt,
  });
  if (updated) {
    logger.info("Status da assinatura sincronizado", { subscriptionId: updated.id, status });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const updated = await subscriptionService.updateSubscriptionStatus(subscription.id, "CANCELED", {
    canceledAt: new Date(),
  });
  if (!updated) return;

  logger.info("Assinatura cancelada", { subscriptionId: updated.id });

  if (updated.cancellationEmailSentAt) return; // já avisamos essa assinatura antes

  const emailResult = await sendCancellationEmail({
    toEmail: updated.customerEmail,
    toName: updated.customerName,
    planName: updated.planName,
  });
  if (emailResult.sent) {
    await subscriptionService.markCancellationEmailSent(updated.id);
  }
}

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    case "incomplete":
    case "incomplete_expired":
    default:
      return "INCOMPLETE";
  }
}
