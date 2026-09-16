import type { SubscriptionStatus } from "@prisma/client";

export type PlanId = "start" | "premium" | "elite";
export type BillingIntervalKey = "monthly" | "quarterly";

/** Um plano tal como definido no servidor (fonte única de verdade de preço). */
export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  /** Valor de UM MÊS, em centavos. O valor trimestral é derivado disso. */
  monthlyAmount: number;
  currency: "brl";
  benefits: string[];
  highlighted?: boolean;
}

/** Payload aceito pelo endpoint POST /api/checkout */
export interface CreateCheckoutInput {
  planId: string;
  interval: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

/** Resposta do endpoint POST /api/checkout */
export interface CreateCheckoutResult {
  subscriptionId: string;
  clientSecret: string;
  publishableKey: string;
}

/** Formato exposto por GET /api/subscriptions/:id, usado pela página de sucesso */
export interface SubscriptionStatusResponse {
  id: string;
  status: SubscriptionStatus;
  planName: string;
  interval: BillingIntervalKey;
  amount: number;
  currency: string;
  customerName: string;
  currentPeriodEnd: string | null;
}

/** Resposta de GET /api/checkout/existing-subscription?email=... */
export interface ExistingSubscriptionResponse {
  hasActiveSubscription: boolean;
  planName?: string;
  interval?: BillingIntervalKey;
  currentPeriodEnd?: string | null;
}

/** Erro de API padronizado — nunca vaza detalhes internos ao cliente. */
export interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
  };
}

/** Uma linha da tabela do painel administrativo (dados já serializados). */
export interface AdminSubscriptionRow {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  planName: string;
  interval: BillingIntervalKey;
  amount: number;
  currency: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  createdAt: string;
}
