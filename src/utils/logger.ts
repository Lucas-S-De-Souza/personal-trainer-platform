/**
 * Logger simples com redação automática de campos sensíveis.
 *
 * Em produção, troque os `console.*` abaixo pelo seu provedor de logs
 * (ex: Datadog, Sentry, CloudWatch) — a interface pública (`logger.info`,
 * `logger.warn`, `logger.error`) permanece a mesma.
 */

const SENSITIVE_KEYS = new Set([
  "password",
  "cardNumber",
  "cvv",
  "cvc",
  "authorization",
  "cookie",
  "secret",
  "token",
  "clientSecret",
  "stripeSecretKey",
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);

  if (value && typeof value === "object") {
    const clone: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      clone[key] = SENSITIVE_KEYS.has(key) ? "[REDACTED]" : redact(val);
    }
    return clone;
  }

  return value;
}

function format(level: string, message: string, meta?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta: redact(meta) } : {}),
  };
  return JSON.stringify(entry);
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.log(format("info", message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(format("warn", message, meta));
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(format("error", message, meta));
  },
};
