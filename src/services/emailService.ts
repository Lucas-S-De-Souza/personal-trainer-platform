import { Resend } from "resend";
import { getEnv } from "@/utils/env";
import { escapeHtml } from "@/utils/sanitize";
import { logger } from "@/utils/logger";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (resendClient) return resendClient;
  const { RESEND_API_KEY } = getEnv();
  resendClient = new Resend(RESEND_API_KEY);
  return resendClient;
}

interface SendWelcomeEmailParams {
  toEmail: string;
  toName: string;
}

/**
 * Envia o e-mail de boas-vindas.
 *
 * Esta função só deve ser chamada DEPOIS que o webhook confirmar o
 * pagamento (veja src/controllers/webhookController.ts) — nunca no
 * momento em que o pedido é criado, para não avisar o cliente antes
 * da hora caso o pagamento seja recusado.
 */
export async function sendWelcomeEmail({ toEmail, toName }: SendWelcomeEmailParams) {
  const { EMAIL_FROM } = getEnv();
  const resend = getResendClient();
  const safeName = escapeHtml(toName);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0A0A0A;">
      <p style="font-size: 16px; line-height: 1.6;">Olá, ${safeName}.</p>
      <p style="font-size: 16px; line-height: 1.6;">Seu pagamento foi confirmado com sucesso.</p>
      <p style="font-size: 16px; line-height: 1.6;">Seja muito bem-vindo(a)!</p>
      <p style="font-size: 16px; line-height: 1.6;">Em breve entraremos em contato para iniciar seu acompanhamento.</p>
      <p style="font-size: 16px; line-height: 1.6; margin-top: 24px;">Equipe Personal Trainer</p>
    </div>
  `.trim();

  const text = [
    `Olá, ${toName}.`,
    "",
    "Seu pagamento foi confirmado com sucesso.",
    "",
    "Seja muito bem-vindo(a)!",
    "",
    "Em breve entraremos em contato para iniciar seu acompanhamento.",
    "",
    "Equipe Personal Trainer",
  ].join("\n");

  try {
    logger.info("Tentando enviar e-mail de boas-vindas", { from: EMAIL_FROM, to: toEmail });

    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: toEmail,
      subject: "Bem-vindo!",
      html,
      text,
    });

    if (result.error) {
      // Não relançamos o erro: uma falha de e-mail não deve derrubar
      // a confirmação do pagamento, que já foi processada com sucesso.
      logger.error("Falha ao enviar e-mail de boas-vindas", { from: EMAIL_FROM, to: toEmail, error: result.error });
      return { sent: false };
    }

    logger.info("E-mail de boas-vindas enviado", { to: toEmail, emailId: result.data?.id });
    return { sent: true };
  } catch (error) {
    logger.error("Exceção ao enviar e-mail de boas-vindas", {
      from: EMAIL_FROM,
      to: toEmail,
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return { sent: false };
  }
}

interface SendRenewalEmailParams {
  toEmail: string;
  toName: string;
  planName: string;
  nextBillingDate: Date | null;
}

/**
 * Envia o e-mail de confirmação de renovação — disparado a cada cobrança
 * bem-sucedida que NÃO é a primeira (ou seja, toda renovação mensal ou
 * trimestral depois da primeira). Veja webhookController.ts.
 */
export async function sendRenewalEmail({ toEmail, toName, planName, nextBillingDate }: SendRenewalEmailParams) {
  const { EMAIL_FROM } = getEnv();
  const resend = getResendClient();
  const safeName = escapeHtml(toName);
  const safePlan = escapeHtml(planName);
  const dateLabel = nextBillingDate
    ? nextBillingDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0A0A0A;">
      <p style="font-size: 16px; line-height: 1.6;">Olá, ${safeName}.</p>
      <p style="font-size: 16px; line-height: 1.6;">Seu pagamento do plano <strong>${safePlan}</strong> foi renovado com sucesso.</p>
      ${
        dateLabel
          ? `<p style="font-size: 16px; line-height: 1.6;">Sua próxima cobrança está prevista para <strong>${dateLabel}</strong>.</p>`
          : ""
      }
      <p style="font-size: 16px; line-height: 1.6;">Continue firme — qualquer dúvida, estamos à disposição.</p>
      <p style="font-size: 16px; line-height: 1.6; margin-top: 24px;">Equipe Personal Trainer</p>
    </div>
  `.trim();

  const text = [
    `Olá, ${toName}.`,
    "",
    `Seu pagamento do plano ${planName} foi renovado com sucesso.`,
    ...(dateLabel ? ["", `Sua próxima cobrança está prevista para ${dateLabel}.`] : []),
    "",
    "Continue firme — qualquer dúvida, estamos à disposição.",
    "",
    "Equipe Personal Trainer",
  ].join("\n");

  try {
    logger.info("Tentando enviar e-mail de renovação", { from: EMAIL_FROM, to: toEmail });

    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: toEmail,
      subject: "Pagamento renovado!",
      html,
      text,
    });

    if (result.error) {
      logger.error("Falha ao enviar e-mail de renovação", { from: EMAIL_FROM, to: toEmail, error: result.error });
      return { sent: false };
    }

    logger.info("E-mail de renovação enviado", { to: toEmail, emailId: result.data?.id });
    return { sent: true };
  } catch (error) {
    logger.error("Exceção ao enviar e-mail de renovação", {
      from: EMAIL_FROM,
      to: toEmail,
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return { sent: false };
  }
}

interface SendCancellationEmailParams {
  toEmail: string;
  toName: string;
  planName: string;
}

/**
 * Envia o e-mail avisando que a assinatura foi cancelada — disparado
 * quando a Stripe confirma o cancelamento (`customer.subscription.deleted`),
 * seja porque a pessoa cancelou de verdade, seja porque trocou de plano
 * (nesse caso o e-mail de boas-vindas do novo plano chega logo em seguida).
 */
export async function sendCancellationEmail({ toEmail, toName, planName }: SendCancellationEmailParams) {
  const { EMAIL_FROM } = getEnv();
  const resend = getResendClient();
  const safeName = escapeHtml(toName);
  const safePlan = escapeHtml(planName);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0A0A0A;">
      <p style="font-size: 16px; line-height: 1.6;">Olá, ${safeName}.</p>
      <p style="font-size: 16px; line-height: 1.6;">Sua assinatura do plano <strong>${safePlan}</strong> foi cancelada.</p>
      <p style="font-size: 16px; line-height: 1.6;">Se foi um engano ou você mudou de ideia, é só assinar de novo pelo nosso site quando quiser.</p>
      <p style="font-size: 16px; line-height: 1.6;">Agradecemos por ter treinado com a gente!</p>
      <p style="font-size: 16px; line-height: 1.6; margin-top: 24px;">Equipe Personal Trainer</p>
    </div>
  `.trim();

  const text = [
    `Olá, ${toName}.`,
    "",
    `Sua assinatura do plano ${planName} foi cancelada.`,
    "",
    "Se foi um engano ou você mudou de ideia, é só assinar de novo pelo nosso site quando quiser.",
    "",
    "Agradecemos por ter treinado com a gente!",
    "",
    "Equipe Personal Trainer",
  ].join("\n");

  try {
    logger.info("Tentando enviar e-mail de cancelamento", { from: EMAIL_FROM, to: toEmail });

    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: toEmail,
      subject: "Assinatura cancelada",
      html,
      text,
    });

    if (result.error) {
      logger.error("Falha ao enviar e-mail de cancelamento", { from: EMAIL_FROM, to: toEmail, error: result.error });
      return { sent: false };
    }

    logger.info("E-mail de cancelamento enviado", { to: toEmail, emailId: result.data?.id });
    return { sent: true };
  } catch (error) {
    logger.error("Exceção ao enviar e-mail de cancelamento", {
      from: EMAIL_FROM,
      to: toEmail,
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return { sent: false };
  }
}

interface SendAdminPasswordResetEmailParams {
  toEmail: string;
  resetUrl: string;
}

/**
 * Envia o link de redefinição de senha do painel administrativo.
 * O link em si já contém o token de uso único — quem abrir o e-mail e
 * clicar consegue definir uma nova senha diretamente.
 */
export async function sendAdminPasswordResetEmail({ toEmail, resetUrl }: SendAdminPasswordResetEmailParams) {
  const { EMAIL_FROM } = getEnv();
  const resend = getResendClient();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0A0A0A;">
      <p style="font-size: 16px; line-height: 1.6;">Olá.</p>
      <p style="font-size: 16px; line-height: 1.6;">Recebemos um pedido pra redefinir a senha do seu painel administrativo.</p>
      <p style="font-size: 16px; line-height: 1.6;">
        <a href="${resetUrl}" style="display: inline-block; background: #E84CAD; color: #0A0A0A; font-weight: 600; padding: 12px 24px; border-radius: 999px; text-decoration: none;">
          Redefinir senha
        </a>
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #6E6570;">Esse link expira em 1 hora. Se você não pediu essa redefinição, pode ignorar este e-mail com segurança — sua senha atual continua funcionando normalmente.</p>
      <p style="font-size: 16px; line-height: 1.6; margin-top: 24px;">Equipe Personal Trainer</p>
    </div>
  `.trim();

  const text = [
    "Olá.",
    "",
    "Recebemos um pedido pra redefinir a senha do seu painel administrativo.",
    "",
    `Abra este link pra criar uma nova senha: ${resetUrl}`,
    "",
    "Esse link expira em 1 hora. Se você não pediu essa redefinição, pode ignorar este e-mail com segurança.",
    "",
    "Equipe Personal Trainer",
  ].join("\n");

  try {
    logger.info("Tentando enviar e-mail de redefinição de senha do painel", { from: EMAIL_FROM, to: toEmail });

    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: toEmail,
      subject: "Redefinir senha do painel",
      html,
      text,
    });

    if (result.error) {
      logger.error("Falha ao enviar e-mail de redefinição de senha", { from: EMAIL_FROM, to: toEmail, error: result.error });
      return { sent: false };
    }

    logger.info("E-mail de redefinição de senha enviado", { to: toEmail, emailId: result.data?.id });
    return { sent: true };
  } catch (error) {
    logger.error("Exceção ao enviar e-mail de redefinição de senha", {
      from: EMAIL_FROM,
      to: toEmail,
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return { sent: false };
  }
}

interface SendPortalAccessEmailParams {
  toEmail: string;
  portalUrl: string;
}

/**
 * Envia o link de acesso à área "Minha assinatura" (Stripe Customer
 * Portal) — é assim que o aluno consegue ver a próxima cobrança, trocar
 * de plano, cancelar ou atualizar o cartão, sem precisar de senha.
 */
export async function sendPortalAccessEmail({ toEmail, portalUrl }: SendPortalAccessEmailParams) {
  const { EMAIL_FROM } = getEnv();
  const resend = getResendClient();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0A0A0A;">
      <p style="font-size: 16px; line-height: 1.6;">Olá.</p>
      <p style="font-size: 16px; line-height: 1.6;">Aqui está o link pra você acessar sua assinatura — dá pra ver a próxima cobrança, trocar de plano, cancelar ou atualizar seu cartão.</p>
      <p style="font-size: 16px; line-height: 1.6;">
        <a href="${portalUrl}" style="display: inline-block; background: #E84CAD; color: #0A0A0A; font-weight: 600; padding: 12px 24px; border-radius: 999px; text-decoration: none;">
          Gerenciar minha assinatura
        </a>
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #6E6570;">Esse link expira em 30 minutos e só funciona uma vez. Se você não pediu esse acesso, pode ignorar este e-mail com segurança.</p>
      <p style="font-size: 16px; line-height: 1.6; margin-top: 24px;">Equipe Personal Trainer</p>
    </div>
  `.trim();

  const text = [
    "Olá.",
    "",
    "Aqui está o link pra você acessar sua assinatura — dá pra ver a próxima cobrança, trocar de plano, cancelar ou atualizar seu cartão.",
    "",
    `Acesse: ${portalUrl}`,
    "",
    "Esse link expira em 30 minutos e só funciona uma vez. Se você não pediu esse acesso, pode ignorar este e-mail com segurança.",
    "",
    "Equipe Personal Trainer",
  ].join("\n");

  try {
    logger.info("Tentando enviar e-mail de acesso ao portal do aluno", { from: EMAIL_FROM, to: toEmail });

    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: toEmail,
      subject: "Acesse sua assinatura",
      html,
      text,
    });

    if (result.error) {
      logger.error("Falha ao enviar e-mail de acesso ao portal", { from: EMAIL_FROM, to: toEmail, error: result.error });
      return { sent: false };
    }

    logger.info("E-mail de acesso ao portal enviado", { to: toEmail, emailId: result.data?.id });
    return { sent: true };
  } catch (error) {
    logger.error("Exceção ao enviar e-mail de acesso ao portal", {
      from: EMAIL_FROM,
      to: toEmail,
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return { sent: false };
  }
}
