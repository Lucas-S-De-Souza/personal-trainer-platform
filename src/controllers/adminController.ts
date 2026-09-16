import { z } from "zod";
import { createAdminSessionToken } from "@/middleware/adminAuth";
import * as adminCredentialService from "@/services/adminCredentialService";
import { sendAdminPasswordResetEmail } from "@/services/emailService";
import { getEnv } from "@/utils/env";
import { logger } from "@/utils/logger";

export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export class InvalidResetTokenError extends Error {
  constructor() {
    super("Esse link de redefinição é inválido ou já expirou.");
    this.name = "InvalidResetTokenError";
  }
}

const loginSchema = z.object({
  password: z.string().min(1, "Informe a senha"),
});

/** Valida a senha e devolve um token de sessão assinado, se estiver correta. */
export async function handleAdminLogin(rawInput: unknown): Promise<string> {
  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AdminAuthError("Informe a senha");
  }

  const isValid = await adminCredentialService.verifyPassword(parsed.data.password);
  if (!isValid) {
    throw new AdminAuthError("Senha incorreta");
  }

  return createAdminSessionToken();
}

/**
 * Dispara o e-mail de redefinição de senha pro endereço fixo configurado
 * em ADMIN_EMAIL. Não recebe e-mail como parâmetro do cliente — como só
 * existe UMA senha de painel, não faz sentido perguntar "qual e-mail?" e
 * isso evita que a rota vire uma forma de descobrir e-mails válidos.
 */
export async function handleForgotPassword(): Promise<void> {
  const { ADMIN_EMAIL, NEXT_PUBLIC_APP_URL } = getEnv();

  const token = await adminCredentialService.createPasswordResetToken();
  const resetUrl = `${NEXT_PUBLIC_APP_URL}/admin/reset-password?token=${token}`;

  const result = await sendAdminPasswordResetEmail({ toEmail: ADMIN_EMAIL, resetUrl });
  if (!result.sent) {
    // Não é um erro pro chamador tratar de forma diferente — o endpoint
    // sempre responde "ok" (veja a rota) pra não vazar se o envio
    // funcionou ou não. Só registramos no log do servidor pra investigar.
    logger.error("Falha ao enviar e-mail de redefinição de senha do painel");
  }
}

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token inválido"),
  newPassword: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres"),
});

/** Confere o token e, se válido, salva a nova senha e consome o token. */
export async function handleResetPassword(rawInput: unknown): Promise<void> {
  const parsed = resetPasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new AdminAuthError(firstIssue?.message ?? "Dados inválidos");
  }

  const isValid = await adminCredentialService.isResetTokenValid(parsed.data.token);
  if (!isValid) {
    throw new InvalidResetTokenError();
  }

  await adminCredentialService.setPassword(parsed.data.newPassword);
  await adminCredentialService.consumeResetToken(parsed.data.token);
}
