import { NextResponse, type NextRequest } from "next/server";
import { handleRequestPortalAccess } from "@/controllers/portalController";
import { verifyCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/middleware/csrf";
import { checkRateLimit, getClientIp } from "@/middleware/rateLimit";
import { logger } from "@/utils/logger";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

function errorResponse(message: string, code: string, status: number) {
  const body: ApiErrorResponse = { error: { message, code } };
  return NextResponse.json(body, { status });
}

/**
 * POST /api/portal/request
 *
 * Sempre responde com sucesso, exista ou não uma assinatura pra esse
 * e-mail — de propósito, pra não virar uma forma de descobrir quem já
 * assinou algum plano (mesmo padrão do "esqueci minha senha" do painel).
 * Rate limiting é a proteção real contra abuso aqui.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  const rateLimit = checkRateLimit(`portal-request:${ip}`, 5, 15 * 60_000);
  if (!rateLimit.allowed) {
    logger.warn("Rate limit excedido em /api/portal/request", { ip });
    return errorResponse("Muitas tentativas. Aguarde alguns minutos antes de tentar de novo.", "RATE_LIMITED", 429);
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME) ?? undefined;
  if (!verifyCsrfToken(cookieToken, headerToken)) {
    return errorResponse("Sessão inválida. Recarregue a página e tente novamente.", "CSRF_INVALID", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Corpo da requisição inválido.", "INVALID_JSON", 400);
  }

  const email = typeof (body as { email?: unknown })?.email === "string" ? (body as { email: string }).email : "";

  try {
    await handleRequestPortalAccess(email);
  } catch (error) {
    logger.error("Erro inesperado ao processar pedido de acesso ao portal", {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    // mesmo assim devolve sucesso — ver comentário acima
  }

  return NextResponse.json({ success: true });
}
