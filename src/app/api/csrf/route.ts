import { NextResponse } from "next/server";
import { generateCsrfToken, CSRF_COOKIE_NAME } from "@/middleware/csrf";
import { getEnv } from "@/utils/env";
import { logger } from "@/utils/logger";

export const runtime = "nodejs";

/**
 * GET /api/csrf
 * Emite um token CSRF (double-submit cookie) que o front-end deve
 * reenviar no header `X-CSRF-Token` em requisições de mutação (POST).
 * Chamado automaticamente pela página de checkout e pelo login do painel
 * ao carregar.
 */
export async function GET() {
  try {
    const token = generateCsrfToken();
    const { NODE_ENV } = getEnv();

    const response = NextResponse.json({ csrfToken: token });

    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // precisa ser legível pelo JS do front-end para reenviar no header
      secure: NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hora
    });

    return response;
  } catch (error) {
    // Sem isso, um erro aqui (ex: variável de ambiente inválida) derruba
    // a rota sem corpo de resposta, e o front-end recebe um JSON vazio
    // pra interpretar — o que aparece pro usuário como "Unexpected end
    // of JSON input", uma mensagem que não diz nada sobre a causa real.
    logger.error("Erro ao gerar token CSRF", {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return NextResponse.json(
      { error: { message: "Não foi possível carregar a página agora.", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}
