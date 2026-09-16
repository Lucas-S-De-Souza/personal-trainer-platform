import { NextResponse, type NextRequest } from "next/server";
import { handleGetSubscriptionStatus, SubscriptionNotFoundError } from "@/controllers/subscriptionController";
import { checkRateLimit, getClientIp } from "@/middleware/rateLimit";
import { logger } from "@/utils/logger";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

function errorResponse(message: string, code: string, status: number) {
  const body: ApiErrorResponse = { error: { message, code } };
  return NextResponse.json(body, { status });
}

/**
 * GET /api/subscriptions/:id
 * Usado pela página de sucesso para confirmar o status real da assinatura
 * a partir do banco de dados — nunca confiamos apenas em parâmetros de URL
 * (?status=success) para exibir a confirmação, já que esses são triviais
 * de forjar manualmente.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ip = getClientIp(request.headers);

  const rateLimit = checkRateLimit(`subscription-status:${ip}`, 30, 60_000);
  if (!rateLimit.allowed) {
    return errorResponse("Muitas requisições. Aguarde um momento.", "RATE_LIMITED", 429);
  }

  // Formato de ID esperado (cuid do Prisma) — rejeita entradas claramente inválidas cedo.
  if (!/^[a-z0-9]{20,40}$/i.test(id)) {
    return errorResponse("Assinatura não encontrada.", "NOT_FOUND", 404);
  }

  try {
    const subscription = await handleGetSubscriptionStatus(id);
    return NextResponse.json(subscription);
  } catch (error) {
    if (error instanceof SubscriptionNotFoundError) {
      return errorResponse("Assinatura não encontrada.", "NOT_FOUND", 404);
    }

    logger.error("Erro inesperado ao buscar status da assinatura", {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return errorResponse("Não foi possível carregar sua assinatura agora.", "INTERNAL_ERROR", 500);
  }
}
