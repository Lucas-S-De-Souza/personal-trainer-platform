import { NextResponse, type NextRequest } from "next/server";
import { handleCreateCheckout, CheckoutValidationError } from "@/controllers/checkoutController";
import { verifyCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/middleware/csrf";
import { checkRateLimit, getClientIp } from "@/middleware/rateLimit";
import { logger } from "@/utils/logger";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs"; // precisa do Prisma e do módulo `crypto` do Node

function errorResponse(message: string, code: string, status: number) {
  const body: ApiErrorResponse = { error: { message, code } };
  return NextResponse.json(body, { status });
}

/**
 * POST /api/checkout
 * Cria uma assinatura (Customer + Subscription) na Stripe.
 * Camadas de proteção, na ordem em que rodam:
 *   1. Rate limiting por IP
 *   2. Verificação de CSRF (double-submit cookie)
 *   3. Validação e sanitização do payload (dentro do controller)
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  // 1. Rate limiting — no máximo 5 tentativas de checkout por minuto por IP.
  const rateLimit = checkRateLimit(`checkout:${ip}`, 5, 60_000);
  if (!rateLimit.allowed) {
    logger.warn("Rate limit excedido em /api/checkout", { ip });
    return errorResponse(
      "Muitas tentativas. Aguarde um momento antes de tentar novamente.",
      "RATE_LIMITED",
      429
    );
  }

  // 2. CSRF — o token do header precisa bater com o cookie emitido por /api/csrf.
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME) ?? undefined;
  if (!verifyCsrfToken(cookieToken, headerToken)) {
    logger.warn("Falha na verificação de CSRF em /api/checkout", { ip });
    return errorResponse("Sessão inválida. Recarregue a página e tente novamente.", "CSRF_INVALID", 403);
  }

  // 3. Corpo da requisição
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Corpo da requisição inválido.", "INVALID_JSON", 400);
  }

  try {
    const result = await handleCreateCheckout(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return errorResponse(error.message, "VALIDATION_ERROR", 400);
    }

    // Nunca vazamos detalhes internos (stack trace, erro da Stripe, etc.) ao cliente.
    logger.error("Erro inesperado ao criar checkout", {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return errorResponse(
      "Não foi possível processar seu pedido agora. Tente novamente em instantes.",
      "INTERNAL_ERROR",
      500
    );
  }
}
