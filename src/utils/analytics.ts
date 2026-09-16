import type { AdminSubscriptionRow } from "@/types";

/**
 * Cálculos de receita para o painel administrativo.
 *
 * IMPORTANTE — limitação assumida conscientemente: estes números são
 * reconstruídos a partir do status atual de cada assinatura (`createdAt`,
 * `canceledAt`, `status`, `amount`) salvo no nosso banco, não a partir do
 * histórico completo de faturas da Stripe. Para o volume de uma personal
 * trainer (dezenas/centenas de alunos, não milhares), isso é preciso o
 * suficiente e evita depender de chamadas extras à API da Stripe toda vez
 * que o painel carrega. Se o negócio crescer muito, a evolução natural é
 * passar a ler o histórico de invoices da Stripe diretamente.
 */

export interface MonthlyDataPoint {
  /** Chave ordenável, ex: "2026-08" */
  key: string;
  /** Rótulo pra exibição, ex: "Ago/26" */
  label: string;
  mrr: number; // em centavos
  newSubscribers: number;
  canceled: number;
}

export interface PlanBreakdownItem {
  planName: string;
  mrr: number; // em centavos
  count: number;
}

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function monthlyEquivalent(sub: AdminSubscriptionRow): number {
  return sub.interval === "quarterly" ? sub.amount / 3 : sub.amount;
}

/** A assinatura já tinha sido paga pelo menos uma vez até esse ponto? */
function wasEverActivated(sub: AdminSubscriptionRow): boolean {
  return sub.status !== "INCOMPLETE";
}

/** A assinatura estava "contribuindo" MRR no fim do mês `monthEnd`? */
function wasContributingAt(sub: AdminSubscriptionRow, monthEnd: Date): boolean {
  if (!wasEverActivated(sub)) return false;
  if (new Date(sub.createdAt) > monthEnd) return false;
  if (sub.canceledAt && new Date(sub.canceledAt) <= monthEnd) return false;
  return true;
}

/**
 * Monta a série dos últimos `monthsCount` meses (o mais recente é o mês
 * atual, "até agora" — não o mês fechado).
 */
export function buildMonthlySeries(subscriptions: AdminSubscriptionRow[], monthsCount = 12): MonthlyDataPoint[] {
  const now = new Date();
  const points: MonthlyDataPoint[] = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const isCurrentMonth = i === 0;
    // Fim do mês (ou "agora" se for o mês corrente, já que ele ainda não fechou)
    const monthEnd = isCurrentMonth ? now : new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);

    const mrr = subscriptions
      .filter((sub) => wasContributingAt(sub, monthEnd))
      .reduce((total, sub) => total + monthlyEquivalent(sub), 0);

    const newSubscribers = subscriptions.filter((sub) => {
      const created = new Date(sub.createdAt);
      return created >= monthStart && created <= monthEnd && wasEverActivated(sub);
    }).length;

    const canceled = subscriptions.filter((sub) => {
      if (!sub.canceledAt) return false;
      const canceledAt = new Date(sub.canceledAt);
      return canceledAt >= monthStart && canceledAt <= monthEnd;
    }).length;

    points.push({
      key: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTH_LABELS[monthDate.getMonth()]}/${String(monthDate.getFullYear()).slice(2)}`,
      mrr: Math.round(mrr),
      newSubscribers,
      canceled,
    });
  }

  return points;
}

/** Receita mensal recorrente atual, por plano — só assinaturas ativas. */
export function buildPlanBreakdown(subscriptions: AdminSubscriptionRow[]): PlanBreakdownItem[] {
  const byPlan = new Map<string, PlanBreakdownItem>();

  for (const sub of subscriptions) {
    if (sub.status !== "ACTIVE") continue;
    const existing = byPlan.get(sub.planName);
    const amount = monthlyEquivalent(sub);
    if (existing) {
      existing.mrr += amount;
      existing.count += 1;
    } else {
      byPlan.set(sub.planName, { planName: sub.planName, mrr: Math.round(amount), count: 1 });
    }
  }

  return Array.from(byPlan.values()).sort((a, b) => b.mrr - a.mrr);
}
