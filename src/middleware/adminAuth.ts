import { createHmac, timingSafeEqual, scryptSync, randomBytes } from "crypto";
import { getEnv } from "@/utils/env";

/**
 * Sessão do painel administrativo — autenticação simples por senha única
 * (só a Thais acessa, não é um sistema multiusuário com cadastro/login).
 *
 * O "token de sessão" é: `expiresAt.assinaturaHMAC`. Não guardamos sessão
 * nenhuma no banco — a própria assinatura garante que o cookie não foi
 * forjado nem alterado, e o timestamp embutido garante a expiração.
 */

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas
export const ADMIN_SESSION_COOKIE_NAME = "admin_session";

export function createAdminSessionToken(): string {
  const { ADMIN_SESSION_SECRET } = getEnv();
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const signature = sign(String(expiresAt), ADMIN_SESSION_SECRET);
  return `${expiresAt}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  if (!token) return false;

  const [expiresAtStr, signature] = token.split(".");
  if (!expiresAtStr || !signature) return false;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const { ADMIN_SESSION_SECRET } = getEnv();
  const expectedSignature = sign(expiresAtStr, ADMIN_SESSION_SECRET);
  return safeEqual(signature, expectedSignature);
}

export function getAdminSessionMaxAgeSeconds(): number {
  return SESSION_DURATION_MS / 1000;
}

/**
 * Hash de senha com scrypt (nativo do Node — sem precisar de bcrypt como
 * dependência extra). Formato salvo: "salt:hash", ambos em hex.
 */
export function hashPassword(plainPassword: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plainPassword, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPasswordAgainstHash(plainPassword: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) return false;

  const derived = scryptSync(plainPassword, salt, 64).toString("hex");
  return safeEqual(derived, originalHash);
}

/** Gera um token aleatório de uso único (ex: link de "esqueci minha senha"). */
export function generateRandomToken(): string {
  return randomBytes(32).toString("hex");
}

/** Hash simples (sem salt) pra guardar tokens no banco — o valor original nunca é salvo. */
export function hashToken(token: string): string {
  return createHmac("sha256", "admin-reset-token").update(token).digest("hex");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** Comparação em tempo constante — evita timing attacks. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
