import { z } from "zod";
import { getEnv } from "@/utils/env";
import { logger } from "@/utils/logger";
import * as portalService from "@/services/portalService";
import * as stripeService from "@/services/stripeService";
import { sendPortalAccessEmail } from "@/services/emailService";

const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido");

/**
 * Dispara o link mágico de acesso à área "Minha assinatura", SE o e-mail
 * corresponder a algum cliente conhecido. Nunca lança erro pro chamador
 * dizendo "não encontrado" — a rota (veja app/api/portal/request) sempre
 * responde a mesma coisa pra qualquer e-mail, conhecido ou não, pra não
 * virar uma forma de descobrir quem já assinou algum plano.
 */
export async function handleRequestPortalAccess(rawEmail: string): Promise<void> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return; // e-mail nem parece válido — não há o que buscar

  const token = await portalService.createPortalAccessTokenForEmail(parsed.data);
  if (!token) return; // e-mail não encontrado — silêncio proposital, ver comentário acima

  const { NEXT_PUBLIC_APP_URL } = getEnv();
  const portalRequestUrl = `${NEXT_PUBLIC_APP_URL}/minha-assinatura/verificar?token=${token}`;

  const result = await sendPortalAccessEmail({ toEmail: parsed.data, portalUrl: portalRequestUrl });
  if (!result.sent) {
    logger.error("Falha ao enviar e-mail de acesso ao portal do aluno");
  }
}

/**
 * Confere o token e, se válido, devolve a URL de verdade do Stripe
 * Customer Portal pra onde a pessoa deve ser redirecionada.
 */
export async function handleVerifyPortalAccess(rawToken: string): Promise<string | null> {
  const stripeCustomerId = await portalService.verifyAndConsumePortalToken(rawToken);
  if (!stripeCustomerId) return null;

  const { NEXT_PUBLIC_APP_URL } = getEnv();
  const session = await stripeService.createBillingPortalSession(stripeCustomerId, NEXT_PUBLIC_APP_URL);
  return session.url;
}
