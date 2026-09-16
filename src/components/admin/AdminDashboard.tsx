"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/config/plans";
import { AdminRevenueTab } from "./AdminRevenueTab";
import type { AdminSubscriptionRow } from "@/types";

type StatusFilter = "all" | "active" | "attention" | "canceled";
type Tab = "alunos" | "receita";

const STATUS_BADGE: Record<
  AdminSubscriptionRow["status"],
  { label: string; className: string }
> = {
  ACTIVE: { label: "Ativo", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PAST_DUE: { label: "Pagamento atrasado", className: "bg-amber-50 text-amber-700 border-amber-200" },
  INCOMPLETE: { label: "Aguardando pagamento", className: "bg-gray-soft text-gray-text border-gray-border" },
  CANCELED: { label: "Cancelado", className: "bg-red-50 text-red-600 border-red-200" },
  UNPAID: { label: "Não pago", className: "bg-red-50 text-red-600 border-red-200" },
};

function statusGroup(status: AdminSubscriptionRow["status"]): StatusFilter {
  if (status === "ACTIVE") return "active";
  if (status === "PAST_DUE" || status === "INCOMPLETE") return "attention";
  return "canceled"; // CANCELED, UNPAID
}

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "Todos",
  active: "Ativos",
  attention: "Precisam de atenção",
  canceled: "Cancelados",
};

export function AdminDashboard({ subscriptions }: { subscriptions: AdminSubscriptionRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("alunos");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = { all: subscriptions.length, active: 0, attention: 0, canceled: 0 };
    for (const sub of subscriptions) result[statusGroup(sub.status)] += 1;
    return result;
  }, [subscriptions]);

  const mrr = useMemo(() => {
    return subscriptions
      .filter((sub) => sub.status === "ACTIVE")
      .reduce((total, sub) => total + (sub.interval === "quarterly" ? sub.amount / 3 : sub.amount), 0);
  }, [subscriptions]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return subscriptions.filter((sub) => {
      const matchesFilter = filter === "all" || statusGroup(sub.status) === filter;
      const matchesSearch =
        term === "" ||
        sub.customerName.toLowerCase().includes(term) ||
        sub.customerEmail.toLowerCase().includes(term) ||
        sub.customerPhone.includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [subscriptions, search, filter]);

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-pink-deep">Painel</p>
            <h1 className="font-display text-2xl font-bold">Alunos e assinaturas</h1>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="btn btn-outline !w-auto px-5 py-2.5 text-sm disabled:opacity-60"
          >
            {isLoggingOut ? "Saindo..." : "Sair"}
          </button>
        </div>

        {/* Navegação entre abas */}
        <div className="mb-8 flex gap-2 border-b border-gray-border">
          <TabButton active={tab === "alunos"} onClick={() => setTab("alunos")}>
            Alunos
          </TabButton>
          <TabButton active={tab === "receita"} onClick={() => setTab("receita")}>
            Receita
          </TabButton>
        </div>

        {tab === "receita" && <AdminRevenueTab subscriptions={subscriptions} />}

        {tab === "alunos" && (
          <>
            {/* Cards de resumo */}
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryCard label="Alunos ativos" value={String(counts.active)} />
              <SummaryCard label="Receita mensal (MRR)" value={formatCurrency(Math.round(mrr))} />
              <SummaryCard label="Precisam de atenção" value={String(counts.attention)} highlight={counts.attention > 0} />
              <SummaryCard label="Cancelados" value={String(counts.canceled)} />
            </div>

            {/* Filtros e busca */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(FILTER_LABELS) as StatusFilter[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      filter === key ? "bg-ink text-white" : "border border-gray-border bg-white text-gray-text hover:text-ink"
                    }`}
                  >
                    {FILTER_LABELS[key]} ({counts[key]})
                  </button>
                ))}
              </div>

              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, e-mail ou telefone..."
                className="field-input sm:max-w-xs"
              />
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto rounded-lg border border-gray-border bg-white shadow-soft">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-border text-xs uppercase tracking-wide text-gray-text">
                    <th className="px-5 py-3 font-semibold">Aluno</th>
                    <th className="px-5 py-3 font-semibold">Plano</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Próxima cobrança</th>
                    <th className="px-5 py-3 font-semibold">Cliente desde</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-gray-text">
                        Nenhum aluno encontrado.
                      </td>
                    </tr>
                  )}
                  {filtered.map((sub) => (
                    <tr key={sub.id} className="border-b border-gray-border last:border-0 hover:bg-gray-soft">
                      <td className="px-5 py-4">
                        <p className="font-medium text-ink">{sub.customerName}</p>
                        <p className="text-xs text-gray-text">{sub.customerEmail}</p>
                        <p className="text-xs text-gray-text">{formatPhone(sub.customerPhone)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-ink">{sub.planName}</p>
                        <p className="text-xs text-gray-text">
                          {sub.interval === "monthly" ? "Mensal" : "Trimestral"} · {formatCurrency(sub.amount)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="px-5 py-4 text-gray-text">{formatDate(sub.currentPeriodEnd)}</td>
                      <td className="px-5 py-4 text-gray-text">{formatDate(sub.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
        active ? "border-pink text-ink" : "border-transparent text-gray-text hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-5 ${
        highlight ? "border-amber-200 bg-amber-50" : "border-gray-border bg-white"
      }`}
    >
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-text">{label}</p>
      <p className="font-display text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminSubscriptionRow["status"] }) {
  const badge = STATUS_BADGE[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${badge.className}`}>
      {badge.label}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatPhone(digits: string): string {
  // Formata "11912345678" como "(11) 91234-5678" quando possível; senão, devolve como veio.
  const match = digits.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  if (!match) return digits;
  return `(${match[1]}) ${match[2]}-${match[3]}`;
}
