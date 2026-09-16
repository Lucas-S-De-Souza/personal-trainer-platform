"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/config/plans";
import { buildMonthlySeries, buildPlanBreakdown } from "@/utils/analytics";
import type { AdminSubscriptionRow } from "@/types";

const PINK = "#E84CAD";
const INK = "#0A0A0A";
const GRAY_TEXT = "#6E6570";
const GRAY_BORDER = "#ECE1E7";
const AMBER = "#D97706";

export function AdminRevenueTab({ subscriptions }: { subscriptions: AdminSubscriptionRow[] }) {
  const series = useMemo(() => buildMonthlySeries(subscriptions, 12), [subscriptions]);
  const planBreakdown = useMemo(() => buildPlanBreakdown(subscriptions), [subscriptions]);

  const current = series[series.length - 1];
  const previous = series[series.length - 2];
  const growthPercent =
    previous && previous.mrr > 0 ? ((current.mrr - previous.mrr) / previous.mrr) * 100 : null;

  return (
    <div className="flex flex-col gap-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="MRR atual" value={formatCurrency(current.mrr)} />
        <KpiCard
          label="Vs. mês passado"
          value={growthPercent === null ? "—" : `${growthPercent >= 0 ? "+" : ""}${growthPercent.toFixed(1)}%`}
          tone={growthPercent === null ? "neutral" : growthPercent >= 0 ? "positive" : "negative"}
        />
        <KpiCard label="Novos assinantes (mês)" value={String(current.newSubscribers)} />
        <KpiCard
          label="Cancelamentos (mês)"
          value={String(current.canceled)}
          tone={current.canceled > 0 ? "negative" : "neutral"}
        />
      </div>

      {/* MRR ao longo do tempo */}
      <ChartCard title="Receita mensal recorrente (MRR)" subtitle="Últimos 12 meses">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PINK} stopOpacity={0.35} />
                <stop offset="100%" stopColor={PINK} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRAY_BORDER} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: GRAY_TEXT }} axisLine={{ stroke: GRAY_BORDER }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12, fill: GRAY_TEXT }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => formatCurrency(value).replace(",00", "")}
              width={70}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "MRR"]}
              contentStyle={{ borderRadius: 12, border: `1px solid ${GRAY_BORDER}`, fontSize: 13 }}
            />
            <Area type="monotone" dataKey="mrr" stroke={PINK} strokeWidth={2.5} fill="url(#mrrGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Novos vs. cancelados */}
        <ChartCard title="Novos assinantes vs. cancelamentos" subtitle="Últimos 12 meses">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRAY_BORDER} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: GRAY_TEXT }} axisLine={{ stroke: GRAY_BORDER }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: GRAY_TEXT }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
              <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${GRAY_BORDER}`, fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="newSubscribers" name="Novos" fill={INK} radius={[4, 4, 0, 0]} />
              <Bar dataKey="canceled" name="Cancelados" fill={AMBER} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Receita por plano */}
        <ChartCard title="Receita mensal por plano" subtitle="Assinaturas ativas agora">
          {planBreakdown.length === 0 ? (
            <EmptyChartState />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={planBreakdown} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRAY_BORDER} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: GRAY_TEXT }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => formatCurrency(value).replace(",00", "")}
                />
                <YAxis type="category" dataKey="planName" tick={{ fontSize: 13, fill: INK }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "MRR"]}
                  contentStyle={{ borderRadius: 12, border: `1px solid ${GRAY_BORDER}`, fontSize: 13 }}
                />
                <Bar dataKey="mrr" fill={PINK} radius={[0, 4, 4, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Tabela comparativa mês a mês */}
      <ChartCard title="Comparação mês a mês" subtitle="Detalhe dos últimos 12 meses">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-border text-xs uppercase tracking-wide text-gray-text">
                <th className="px-4 py-2.5 font-semibold">Mês</th>
                <th className="px-4 py-2.5 font-semibold">MRR</th>
                <th className="px-4 py-2.5 font-semibold">Variação</th>
                <th className="px-4 py-2.5 font-semibold">Novos</th>
                <th className="px-4 py-2.5 font-semibold">Cancelados</th>
                <th className="px-4 py-2.5 font-semibold">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((point, idx) => {
                const previousPoint = series[series.length - 1 - idx - 1];
                const change = previousPoint ? point.mrr - previousPoint.mrr : null;
                const changePercent = previousPoint && previousPoint.mrr > 0 ? (change! / previousPoint.mrr) * 100 : null;
                const net = point.newSubscribers - point.canceled;

                return (
                  <tr key={point.key} className="border-b border-gray-border last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{point.label}</td>
                    <td className="px-4 py-3 text-ink">{formatCurrency(point.mrr)}</td>
                    <td className="px-4 py-3">
                      {changePercent === null ? (
                        <span className="text-gray-text">—</span>
                      ) : (
                        <span className={changePercent >= 0 ? "text-emerald-600" : "text-red-600"}>
                          {changePercent >= 0 ? "+" : ""}
                          {changePercent.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-text">{point.newSubscribers}</td>
                    <td className="px-4 py-3 text-gray-text">{point.canceled}</td>
                    <td className="px-4 py-3">
                      <span className={net > 0 ? "text-emerald-600" : net < 0 ? "text-red-600" : "text-gray-text"}>
                        {net > 0 ? "+" : ""}
                        {net}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-ink";
  return (
    <div className="rounded-lg border border-gray-border bg-white p-5">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-text">{label}</p>
      <p className={`font-display text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-border bg-white p-6 shadow-soft">
      <div className="mb-4">
        <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
        {subtitle && <p className="text-xs text-gray-text">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-gray-text">
      Nenhum aluno ativo ainda.
    </div>
  );
}
