import { NextResponse, type NextRequest } from "next/server";
import { handleAdminLogin, AdminAuthError } from "@/controllers/adminController";
import { verifyCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/middleware/csrf";
import { ADMIN_SESSION_COOKIE_NAME, getAdminSessionMaxAgeSeconds } from "@/middleware/adminAuth";
import { checkRateLimit, getClientIp } from "@/middleware/rateLimit";
import { logger } from "@/utils/logger";
import { getEnv } from "@/utils/env";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

function errorResponse(message: string, code: string, status: number) {
  const body: ApiErrorResponse = { error: { message, code } };
  return NextResponse.json(body, { status });
}

/**
 * POST /api/admin/login
 * Camadas de proteção contra força bruta / abuso:
 *   1. Rate limiting agressivo por IP (bem mais restrito que o checkout,
 *      já que aqui alguém tentando adivinhar senha é o cenário principal)
 *   2. Verificação de CSRF
 *   3. Comparação de senha em tempo constante (dentro do controller)
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  const rateLimit = checkRateLimit(`admin-login:${ip}`, 5, 5 * 60_000);
  if (!rateLimit.allowed) {
    logger.warn("Rate limit excedido em /api/admin/login", { ip });
    return errorResponse("Muitas tentativas. Aguarde alguns minutos antes de tentar de novo.", "RATE_LIMITED", 429);
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME) ?? undefined;
  if (!verifyCsrfToken(cookieToken, headerToken)) {
    logger.warn("Falha na verificação de CSRF em /api/admin/login", { ip });
    return errorResponse("Sessão inválida. Recarregue a página e tente novamente.", "CSRF_INVALID", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Corpo da requisição inválido.", "INVALID_JSON", 400);
  }

  try {
    const sessionToken = await handleAdminLogin(body);
    const { NODE_ENV } = getEnv();

    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true, // ninguém no JS do navegador precisa ler isso, ao contrário do CSRF
      secure: NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: getAdminSessionMaxAgeSeconds(),
    });

    logger.info("Login no painel administrativo bem-sucedido", { ip });
    return response;
  } catch (error) {
    if (error instanceof AdminAuthError) {
      logger.warn("Tentativa de login no painel com senha incorreta", { ip });
      return errorResponse(error.message, "INVALID_CREDENTIALS", 401);
    }

    logger.error("Erro inesperado no login do painel", {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return errorResponse("Não foi possível entrar agora. Tente novamente.", "INTERNAL_ERROR", 500);
  }
}
