import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware de borda (Edge Runtime) — roda antes de QUALQUER rota.
 *
 * Aqui ficam apenas checagens leves e compatíveis com Edge Runtime.
 * Regras que precisam do Prisma, Stripe SDK ou do módulo `crypto` do
 * Node (como a verificação de CSRF em src/middleware/csrf.ts e o
 * rate limiting em src/middleware/rateLimit.ts) rodam dentro dos
 * próprios Route Handlers, que usam Node.js Runtime.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Correlaciona logs de uma mesma requisição de ponta a ponta.
  const requestId = crypto.randomUUID();
  response.headers.set("X-Request-Id", requestId);

  // Defesa em profundidade: bloqueia métodos HTTP inesperados nas rotas de API
  // antes mesmo de chegar no Route Handler.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const allowedMethods = ["GET", "POST", "OPTIONS"];
    if (!allowedMethods.includes(request.method)) {
      return new NextResponse("Method Not Allowed", { status: 405 });
    }
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
