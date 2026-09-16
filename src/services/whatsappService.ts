import { getEnv } from "@/utils/env";
import { logger } from "@/utils/logger";

/**
 * Envio de mensagem via WhatsApp Cloud API (Meta) — canal oficial de
 * negócios do WhatsApp, sem risco de banimento do número (ao contrário
 * de bibliotecas não-oficiais que simulam um WhatsApp Web logado).
 *
 * PRÉ-REQUISITO IMPORTANTE: a primeira mensagem de uma conversa (ou
 * qualquer mensagem fora da janela de 24h de uma conversa iniciada pelo
 * cliente) só pode ser um TEMPLATE previamente aprovado pela Meta — não
 * dá pra mandar texto livre nesse momento. Por isso esta função monta a
 * mensagem como `template`, não como `text`. Veja o README para o passo
 * a passo de criação do template no Meta Business Manager.
 */

interface SendWhatsappTemplateParams {
  toPhone: string; // como veio do formulário, ex: "(11) 91234-5678"
  templateParams: string[]; // valores para preencher {{1}}, {{2}}, ... do template
}

export async function sendWhatsappTemplate({ toPhone, templateParams }: SendWhatsappTemplateParams) {
  const {
    WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_TEMPLATE_NAME,
    WHATSAPP_TEMPLATE_LANG,
    WHATSAPP_DEFAULT_COUNTRY_CODE,
  } = getEnv();

  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    // Conta da Meta ainda não configurada — não bloqueia o resto do fluxo
    // (o e-mail de boas-vindas já foi/será enviado normalmente).
    logger.warn("Envio de WhatsApp pulado: WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID não configurados");
    return { sent: false };
  }

  const to = toE164(toPhone, WHATSAPP_DEFAULT_COUNTRY_CODE);

  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: WHATSAPP_TEMPLATE_NAME,
      language: { code: WHATSAPP_TEMPLATE_LANG },
      components: [
        {
          type: "body",
          parameters: templateParams.map((text) => ({ type: "text", text })),
        },
      ],
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      // Não relançamos o erro: uma falha no WhatsApp não deve derrubar
      // a confirmação do pagamento, que já foi processada com sucesso.
      logger.error("Falha ao enviar mensagem de WhatsApp", { status: response.status, error: data });
      return { sent: false };
    }

    logger.info("Mensagem de WhatsApp enviada", { messageId: data?.messages?.[0]?.id });
    return { sent: true };
  } catch (error) {
    logger.error("Exceção ao enviar mensagem de WhatsApp", {
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return { sent: false };
  }
}

/**
 * Converte um telefone no formato brasileiro comum (com DDD, sem
 * código de país) para o formato E.164 que a API do WhatsApp exige
 * (ex: "11912345678" -> "5511912345678").
 * Se o número já vier com código de país (12+ dígitos), mantém como está.
 */
function toE164(phone: string, defaultCountryCode: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length > 11) {
    // já parece incluir código de país
    return digits;
  }

  return `${defaultCountryCode}${digits}`;
}
