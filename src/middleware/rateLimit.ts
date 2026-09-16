/**
 * Rate limiting simples por janela deslizante, em memória.
 *
 * ⚠️ LIMITAÇÃO IMPORTANTE: este contador vive na memória do processo.
 * Funciona bem para uma única instância (ex: um servidor Node clássico),
 * mas em ambientes serverless/multi-instância (Vercel com múltiplas
 * funções, múltiplos pods, etc.) cada instância tem seu próprio contador,
 * então o limite real acaba sendo (limite × nº de instâncias).
 *
 * Para produção com múltiplas instâncias, troque este módulo por um
 * rate limiter compartilhado (ex: Upstash Redis + `@upstash/ratelimit`,
 * ou Redis próprio) mantendo a mesma assinatura de `checkRateLimit`.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

// Limpeza periódica para não vazar memória com IPs antigos.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.windowStart > CLEANUP_INTERVAL_MS) buckets.delete(key);
  }
}, CLEANUP_INTERVAL_MS).unref?.();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * @param key Identificador único do requisitante (ex: IP + rota)
 * @param limit Número máximo de requisições permitidas na janela
 * @param windowMs Duração da janela, em milissegundos
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.ceil((bucket.windowStart + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/** Extrai um identificador de cliente a partir dos headers da requisição (proxy-aware). */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown";

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}
