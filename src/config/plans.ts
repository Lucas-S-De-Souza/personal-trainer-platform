import type { Plan, PlanId, BillingIntervalKey } from "@/types";

/**
 * Fonte ÚNICA de verdade sobre planos e preços.
 *
 * IMPORTANTE (segurança): o valor cobrado nunca deve vir do front-end.
 * O checkout sempre recalcula o preço a partir deste arquivo no servidor
 * (veja src/controllers/checkoutController.ts), então mesmo que alguém
 * manipule a requisição no navegador, o valor cobrado continua sendo este.
 *
 * `monthlyAmount` é o valor de UM mês, em centavos. O valor trimestral é
 * calculado automaticamente a partir dele (3x o mensal, com o desconto de
 * BILLING_INTERVALS.quarterly.discountPercent aplicado) — assim você só
 * precisa manter o preço mensal atualizado em um único lugar.
 */
export const PLANS: Record<PlanId, Plan> = {
  start: {
    id: "start",
    name: "Start",
    description: "Para quem está começando a se organizar com o treino.",
    monthlyAmount: 14900, // R$ 149,00
    currency: "brl",
    benefits: [
      "Treino personalizado mensal",
      "Ajuste de cargas a cada 30 dias",
      "Suporte por mensagem",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    description: "Acompanhamento completo, presencial ou online.",
    monthlyAmount: 24900, // R$ 249,00
    currency: "brl",
    benefits: [
      "Treino personalizado semanal",
      "Ajustes quinzenais",
      "Suporte prioritário por WhatsApp",
      "Orientações de hábitos e alimentação",
    ],
    highlighted: true,
  },
  elite: {
    id: "elite",
    name: "Elite",
    description: "Para quem quer o acompanhamento mais próximo possível.",
    monthlyAmount: 39900, // R$ 399,00
    currency: "brl",
    benefits: [
      "Tudo do plano Premium",
      "Check-ins semanais por chamada",
      "Reavaliação física mensal",
      "Prioridade em horários presenciais",
    ],
  },
};

/**
 * Configuração dos ciclos de cobrança disponíveis.
 * `stripeInterval` + `intervalCount` seguem exatamente o formato que a
 * Stripe espera (ela não tem um intervalo "quarter" nativo — trimestral
 * é modelado como "a cada 3 meses").
 */
export const BILLING_INTERVALS: Record<
  BillingIntervalKey,
  { label: string; stripeInterval: "month"; intervalCount: number; discountPercent: number }
> = {
  monthly: {
    label: "Mensal",
    stripeInterval: "month",
    intervalCount: 1,
    discountPercent: 0,
  },
  quarterly: {
    label: "Trimestral",
    stripeInterval: "month",
    intervalCount: 3,
    // Desconto de fidelidade por fechar 3 meses de uma vez.
    // Ajuste esse número livremente — é o único lugar que precisa mudar.
    discountPercent: 10,
  },
};

export function getPlanById(planId: string): Plan | null {
  return (PLANS as Record<string, Plan>)[planId] ?? null;
}

export function isValidInterval(interval: string): interval is BillingIntervalKey {
  return interval === "monthly" || interval === "quarterly";
}

/** Valor total cobrado POR CICLO (não é o valor mensal — já é o total do período). */
export function getCycleAmount(plan: Plan, interval: BillingIntervalKey): number {
  const config = BILLING_INTERVALS[interval];
  const rawTotal = plan.monthlyAmount * config.intervalCount;
  const discounted = rawTotal * (1 - config.discountPercent / 100);
  return Math.round(discounted);
}

export function formatCurrency(amountInCents: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amountInCents / 100);
}
