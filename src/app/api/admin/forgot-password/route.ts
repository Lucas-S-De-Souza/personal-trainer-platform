import { NextResponse, type NextRequest } from "next/server";
import { handleForgotPassword } from "@/controllers/adminController";
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
 * POST /api/admin/forgot-password
 *
 * Sempre responde com sucesso (mesmo se o envio de e-mail falhar do lado
 * de dentro) — isso é intencional: essa rota não recebe e-mail nenhum do
 * cliente (só existe UM destinatário possível, o ADMIN_EMAIL configurado
 * no servidor), então não há nada a "confirmar ou negar" pro chamador.
 * Rate limiting é a proteção real aqui contra alguém ficar martelando o
 * botão e gerando e-mails/tokens à toa.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  const rateLimit = checkRateLimit(`admin-forgot-password:${ip}`, 3, 15 * 60_000);
  if (!rateLimit.allowed) {
    logger.warn("Rate limit excedido em /api/admin/forgot-password", { ip });
    return errorResponse("Muitas tentativas. Aguarde alguns minutos antes de tentar de novo.", "RATE_LIMITED", 429);
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME) ?? undefined;
  if (!verifyCsrfToken(cookieToken, headerToken)) {
    logger.warn("Falha na verificação de CSRF em /api/admin/forgot-password", { ip });
    return errorResponse("Sessão inválida. Recarregue a página e tente novamente.", "CSRF_INVALID", 403);
  }

  try {
    await handleForgotPassword();
  } catch (error) {
    logger.error("Erro inesperado ao processar 'esqueci minha senha'", {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    // mesmo assim devolve sucesso — ver comentário acima
  }

  return NextResponse.json({ success: true });
}
