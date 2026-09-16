import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getEnv } from "@/utils/env";

/**
 * Proteção CSRF via "signed double-submit cookie":
 *
 * 1. O servidor gera um valor aleatório + assinatura HMAC (com CSRF_SECRET)
 *    e envia como cookie (legível por JS, mas não httpOnly).
 * 2. O front-end lê o cookie e reenvia o mesmo valor em um header
 *    customizado (`X-CSRF-Token`) em toda requisição de mutação (POST).
 * 3. O servidor confirma que: (a) o header bate com o cookie, e
 *    (b) a assinatura HMAC é válida — ou seja, o token foi de fato
 *    emitido por nós, e não forjado por um terceiro.
 *
 * Um atacante em outro domínio consegue fazer o navegador da vítima
 * enviar o cookie automaticamente (é assim que CSRF funciona), mas NÃO
 * consegue ler o cookie para colocá-lo no header — por isso o ataque falha.
 */

const TOKEN_BYTES = 32;

export function generateCsrfToken(): string {
  const { CSRF_SECRET } = getEnv();
  const random = randomBytes(TOKEN_BYTES).toString("hex");
  const signature = sign(random, CSRF_SECRET);
  return `${random}.${signature}`;
}

export function verifyCsrfToken(cookieValue: string | undefined, headerValue: string | undefined): boolean {
  if (!cookieValue || !headerValue) return false;

  // Double-submit: o valor do cookie e do header precisam ser idênticos.
  if (!safeEqual(cookieValue, headerValue)) return false;

  // Assinatura: confirma que o token foi emitido por nós (não forjado).
  const [random, signature] = cookieValue.split(".");
  if (!random || !signature) return false;

  const { CSRF_SECRET } = getEnv();
  const expectedSignature = sign(random, CSRF_SECRET);
  return safeEqual(signature, expectedSignature);
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** Comparação em tempo constante — evita timing attacks na verificação. */
function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";
