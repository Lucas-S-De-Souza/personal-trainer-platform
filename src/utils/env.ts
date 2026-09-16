import { z } from "zod";

/**
 * Valida as variáveis de ambiente na inicialização do processo.
 * Se algo essencial estiver faltando, a aplicação falha imediatamente
 * (fail-fast) em vez de quebrar silenciosamente em produção no meio
 * de um checkout.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),

  STRIPE_SECRET_KEY: z.string().startsWith("sk_", "STRIPE_SECRET_KEY inválida"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY inválida"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_", "STRIPE_WEBHOOK_SECRET inválida"),

  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY é obrigatória"),
  EMAIL_FROM: z.string().min(1, "EMAIL_FROM é obrigatória"),

  // WhatsApp Cloud API (Meta) — mensagem automática de boas-vindas.
  // OPCIONAL: enquanto não estiver configurado, o resto do app (checkout,
  // e-mail, painel) continua funcionando normalmente — só a mensagem de
  // WhatsApp em si fica desativada (veja src/services/whatsappService.ts).
  WHATSAPP_ACCESS_TOKEN: z.string().optional().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
  WHATSAPP_TEMPLATE_NAME: z.string().min(1).default("pagamento_confirmado"),
  WHATSAPP_TEMPLATE_LANG: z.string().min(1).default("pt_BR"),
  // DDI padrão usado quando o telefone informado não vem com código do país
  // (formulário só pede telefone no formato brasileiro, ex: "(11) 91234-5678").
  WHATSAPP_DEFAULT_COUNTRY_CODE: z.string().min(1).default("55"),

  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL deve ser uma URL válida"),
  CSRF_SECRET: z.string().min(16, "CSRF_SECRET deve ter pelo menos 16 caracteres"),

  // Painel administrativo (só a Thais acessa — autenticação simples por senha)
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD deve ter pelo menos 8 caracteres"),
  ADMIN_SESSION_SECRET: z.string().min(16, "ADMIN_SESSION_SECRET deve ter pelo menos 16 caracteres"),
  // E-mail pra onde vai o link de "esqueci minha senha" do painel
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL deve ser um e-mail válido"),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Lê e valida as variáveis de ambiente (com cache).
 * Chame `getEnv()` em vez de acessar `process.env` diretamente
 * em código de servidor — assim qualquer variável faltando ou
 * malformada é detectada com uma mensagem clara.
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(
      `Configuração de ambiente inválida. Verifique seu arquivo .env:\n${issues}`
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
