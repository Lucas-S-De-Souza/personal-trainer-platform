import { prisma } from "@/database/prisma";
import { generateRandomToken, hashToken } from "@/middleware/adminAuth";
import { logger } from "@/utils/logger";

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos

/**
 * Busca o Customer da Stripe mais recente associado a um e-mail, olhando
 * nas NOSSAS assinaturas (não direto na Stripe) — assim é confiável mesmo
 * que a pessoa já tenha trocado de plano várias vezes (usamos sempre o
 * mesmo stripeCustomerId entre trocas, veja checkoutController.ts).
 */
async function findCustomerIdByEmail(email: string): Promise<string | null> {
  const subscription = await prisma.subscription.findFirst({
    where: { customerEmail: email.trim().toLowerCase() },
    orderBy: { createdAt: "desc" },
    select: { stripeCustomerId: true },
  });
  return subscription?.stripeCustomerId ?? null;
}

/**
 * Cria um token de acesso ao portal SE o e-mail corresponder a algum
 * cliente conhecido. Devolve `null` silenciosamente se não encontrar —
 * de propósito: o chamador (rota da API) deve responder a mesma coisa
 * pra quem existe e pra quem não existe, pra não vazar quais e-mails
 * já assinaram (veja src/app/api/portal/request/route.ts).
 */
export async function createPortalAccessTokenForEmail(email: string): Promise<string | null> {
  const stripeCustomerId = await findCustomerIdByEmail(email);
  if (!stripeCustomerId) {
    logger.info("Pedido de acesso ao portal para e-mail sem assinatura conhecida", { email });
    return null;
  }

  const rawToken = generateRandomToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.portalAccessToken.create({
    data: { tokenHash, stripeCustomerId, expiresAt },
  });

  return rawToken;
}

/**
 * Confere um token e, se válido, consome (marca como usado) e devolve o
 * stripeCustomerId associado — pronto pra gerar a sessão do portal.
 */
export async function verifyAndConsumePortalToken(rawToken: string): Promise<string | null> {
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const record = await prisma.portalAccessToken.findUnique({ where: { tokenHash } });

  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  await prisma.portalAccessToken.update({
    where: { tokenHash },
    data: { usedAt: new Date() },
  });

  return record.stripeCustomerId;
}
