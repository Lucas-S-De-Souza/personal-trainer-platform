import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { constructWebhookEvent } from "@/services/stripeService";
import { handleStripeWebhookEvent } from "@/controllers/webhookController";
import { logger } from "@/utils/logger";

export const runtime = "nodejs"; // precisa do Prisma e do SDK Node da Stripe

/**
 * POST /api/webhooks/stripe
 *
 * Esta rota NÃO tem proteção de CSRF nem de rate limiting por usuário —
 * de propósito. Quem chama este endpoint não é o navegador do cliente,
 * é o servidor da Stripe. A segurança aqui vem inteiramente da
 * verificação de assinatura abaixo (`constructWebhookEvent`), que
 * confirma que a requisição foi realmente assinada com o segredo do
 * nosso webhook — qualquer requisição sem assinatura válida é rejeitada
 * antes de tocar em qualquer lógica de negócio.
 *
 * IMPORTANTE: usamos `request.text()` (corpo cru) em vez de
 * `request.json()`, porque a verificação de assinatura da Stripe
 * precisa dos bytes exatos do corpo — parsear e serializar de volta
 * para JSON mudaria a string e invalidaria a assinatura.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    logger.warn("Webhook recebido sem header stripe-signature");
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (error) {
    logger.warn("Falha na verificação de assinatura do webhook", {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  try {
    await handleStripeWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    // Retornamos 500 de propósito: isso faz a Stripe tentar reenviar o
    // evento automaticamente mais tarde (retry com backoff), o que é
    // o comportamento desejado em caso de erro transitório nosso
    // (ex: banco de dados momentaneamente indisponível).
    logger.error("Erro ao processar evento de webhook", {
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return NextResponse.json({ error: "Erro ao processar evento." }, { status: 500 });
  }
}
