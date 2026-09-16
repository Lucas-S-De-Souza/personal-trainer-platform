"use client";

import { useState } from "react";
import { getCycleAmount, BILLING_INTERVALS, formatCurrency } from "@/config/plans";
import { CheckoutForm } from "@/components/CheckoutForm";
import { SecurityBadges } from "@/components/SecurityBadges";
import type { Plan, BillingIntervalKey } from "@/types";

const INTERVAL_OPTIONS: BillingIntervalKey[] = ["monthly", "quarterly"];

export function CheckoutClient({ plan }: { plan: Plan }) {
  const [interval, setInterval] = useState<BillingIntervalKey>("monthly");
  const cycleAmount = getCycleAmount(plan, interval);
  const intervalConfig = BILLING_INTERVALS[interval];

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8 md:grid-cols-[1fr_1.15fr] md:gap-10">
      {/* Resumo do plano */}
      <aside className="h-fit rounded-lg border border-gray-border bg-white p-8 shadow-soft md:sticky md:top-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-pink-deep">Resumo do pedido</p>
        <h1 className="font-display mb-1 text-2xl font-bold">Plano {plan.name}</h1>
        <p className="mb-6 text-sm text-gray-text">{plan.description}</p>

        {/* Seletor de ciclo de cobrança */}
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-full bg-gray-soft p-1" role="radiogroup" aria-label="Ciclo de cobrança">
          {INTERVAL_OPTIONS.map((option) => {
            const config = BILLING_INTERVALS[option];
            const isActive = interval === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setInterval(option)}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive ? "bg-ink text-white" : "text-gray-text hover:text-ink"
                }`}
              >
                {config.label}
                {config.discountPercent > 0 && (
                  <span className={`ml-1.5 text-xs ${isActive ? "text-pink" : "text-pink-deep"}`}>
                    -{config.discountPercent}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="font-display mb-1 text-4xl font-bold">
          {formatCurrency(cycleAmount)}
          <span className="text-base font-medium text-gray-text"> /{intervalConfig.intervalCount === 1 ? "mês" : `${intervalConfig.intervalCount} meses`}</span>
        </p>
        {interval === "quarterly" && (
          <p className="mb-6 text-xs text-gray-text">
            Equivale a {formatCurrency(Math.round(cycleAmount / 3))}/mês
          </p>
        )}
        {interval === "monthly" && <div className="mb-6" />}

        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-text">O que está incluso</p>
        <ul className="mb-6 flex flex-col gap-2.5">
          {plan.benefits.map((benefit) => (
            <li key={benefit} className="relative pl-6 text-sm text-ink-soft">
              <span className="absolute left-0 top-0 font-bold text-pink-deep">✓</span>
              {benefit}
            </li>
          ))}
        </ul>

        <SecurityBadges />
      </aside>

      {/* Formulário */}
      <section className="rounded-lg border border-gray-border bg-white p-8 shadow-soft">
        <h2 className="font-display mb-1 text-xl font-semibold">Seus dados</h2>
        <p className="mb-6 text-sm text-gray-text">
          Usamos essas informações apenas para confirmar sua compra e iniciar o acompanhamento.
        </p>

        <CheckoutForm plan={plan} interval={interval} />
      </section>
    </div>
  );
}
