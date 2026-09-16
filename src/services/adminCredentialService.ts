import { prisma } from "@/database/prisma";
import { getEnv } from "@/utils/env";
import {
  hashPassword,
  verifyPasswordAgainstHash,
  generateRandomToken,
  hashToken,
  safeEqual,
} from "@/middleware/adminAuth";
import { logger } from "@/utils/logger";

const SINGLETON_ID = "singleton";
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Confere a senha informada contra o que está salvo.
 *
 * Se já existir uma senha definida no banco (porque foi redefinida em
 * algum momento via "esqueci minha senha"), compara com o hash salvo lá.
 * Se ainda NÃO existir nenhuma linha (instalação nova, nunca foi
 * redefinida), cai de volta pra comparar com `ADMIN_PASSWORD` do `.env`
 * — assim o painel funciona desde o primeiro dia sem precisar de nenhum
 * passo manual extra de "criar senha inicial".
 */
export async function verifyPassword(plainPassword: string): Promise<boolean> {
  const credential = await prisma.adminCredential.findUnique({ where: { id: SINGLETON_ID } });

  if (credential) {
    return verifyPasswordAgainstHash(plainPassword, credential.passwordHash);
  }

  const { ADMIN_PASSWORD } = getEnv();
  return safeEqual(plainPassword, ADMIN_PASSWORD);
}

/** Define (ou substitui) a senha do painel. */
export async function setPassword(plainPassword: string): Promise<void> {
  const passwordHash = hashPassword(plainPassword);
  await prisma.adminCredential.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, passwordHash },
    update: { passwordHash },
  });
  logger.info("Senha do painel administrativo redefinida");
}

/**
 * Cria um token de redefinição de senha e devolve o valor CRU (não salvo
 * em lugar nenhum) — só ele vai no link do e-mail. O banco guarda apenas
 * o hash, então mesmo um vazamento do banco não permite forjar o link.
 */
export async function createPasswordResetToken(): Promise<string> {
  const rawToken = generateRandomToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.adminPasswordResetToken.create({
    data: { tokenHash, expiresAt },
  });

  return rawToken;
}

/**
 * Confere se um token de redefinição é válido (existe, não expirou, não
 * foi usado ainda) SEM consumi-lo — usado pra decidir se a página de
 * redefinição mostra o formulário ou uma mensagem de link inválido.
 */
export async function isResetTokenValid(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  const tokenHash = hashToken(rawToken);
  const record = await prisma.adminPasswordResetToken.findUnique({ where: { tokenHash } });
  if (!record) return false;
  if (record.usedAt) return false;
  if (record.expiresAt < new Date()) return false;
  return true;
}

/** Marca o token como usado — chamado depois que a nova senha é salva com sucesso. */
export async function consumeResetToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.adminPasswordResetToken.updateMany({
    where: { tokenHash, usedAt: null },
    data: { usedAt: new Date() },
  });
}
