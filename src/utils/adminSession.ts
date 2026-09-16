import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE_NAME, verifyAdminSessionToken } from "@/middleware/adminAuth";

/**
 * Verifica a sessão do painel a partir de um Server Component (não de uma
 * Route Handler — lá se usa `request.cookies` diretamente, veja as rotas
 * em src/app/api/admin/*).
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
}
