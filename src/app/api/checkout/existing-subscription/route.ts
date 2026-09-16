import { NextResponse, type NextRequest } from "next/server";
import { handleCheckExistingSubscription, InvalidEmailError } from "@/controllers/subscriptionController";
import { checkRateLimit, getClientIp } from "@/middleware/rateLimit";
import { logger } from "@/utils/logger";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

function errorResponse(message: string, code: string, status: number) {
  const body: ApiErrorResponse = { error: { message, code } };
  return NextResponse.json(body, { status });
}

/**
 * GET /api/checkout/existing-subscription?email=...
 *
 * Consultado pelo checkout ANTES de criar uma nova assinatura, pra avisar
 * a pessoa se ela já tem um plano em vigor (em vez de trocar em silêncio).
 * Só devolve nome do plano e data — nunca e-mail/telefone/IDs internos —
 * então o risco de alguém usar isto pra "adivinhar" quem é assinante é
 * baixo, mas ainda assim é uma rota pública consultável por e-mail, então
 * fica com rate limiting como as demais.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);

  const rateLimit = checkRateLimit(`existing-subscription:${ip}`, 20, 60_000);
  if (!rateLimit.allowed) {
    return errorResponse("Muitas requisições. Aguarde um momento.", "RATE_LIMITED", 429);
  }

  const email = request.nextUrl.searchParams.get("email") ?? "";

  try {
    const result = await handleCheckExistingSubscription(email);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InvalidEmailError) {
      return errorResponse(error.message, "VALIDATION_ERROR", 400);
    }

    logger.error("Erro inesperado ao checar assinatura existente", {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return errorResponse("Não foi possível continuar agora. Tente novamente.", "INTERNAL_ERROR", 500);
  }
}
