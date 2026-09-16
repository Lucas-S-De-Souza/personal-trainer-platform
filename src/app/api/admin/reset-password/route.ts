import { NextResponse, type NextRequest } from "next/server";
import { handleResetPassword, AdminAuthError, InvalidResetTokenError } from "@/controllers/adminController";
import { verifyCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/middleware/csrf";
import { checkRateLimit, getClientIp } from "@/middleware/rateLimit";
import { logger } from "@/utils/logger";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

function errorResponse(message: string, code: string, status: number) {
  const body: ApiErrorResponse = { error: { message, code } };
  return NextResponse.json(body, { status });
}

/** POST /api/admin/reset-password — confere o token e salva a nova senha. */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  const rateLimit = checkRateLimit(`admin-reset-password:${ip}`, 10, 15 * 60_000);
  if (!rateLimit.allowed) {
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

  try {
    await handleResetPassword(body);
    logger.info("Senha do painel redefinida com sucesso", { ip });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof InvalidResetTokenError) {
      return errorResponse(error.message, "INVALID_TOKEN", 400);
    }
    if (error instanceof AdminAuthError) {
      return errorResponse(error.message, "VALIDATION_ERROR", 400);
    }

    logger.error("Erro inesperado ao redefinir senha do painel", {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return errorResponse("Não foi possível redefinir a senha agora. Tente novamente.", "INTERNAL_ERROR", 500);
  }
}
