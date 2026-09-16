import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/utils/adminSession";
import * as subscriptionService from "@/services/subscriptionService";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import type { AdminSubscriptionRow } from "@/types";

export const metadata: Metadata = { title: "Painel" };

// Sempre busca dados frescos do banco — este painel não deve ser cacheado.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const subscriptions = await subscriptionService.getAllSubscriptions();

  // Serializa pra um formato simples (datas como string) antes de passar
  // pro componente cliente, e já traduz o ciclo pro formato usado no front.
  const rows: AdminSubscriptionRow[] = subscriptions.map((sub) => ({
    id: sub.id,
    customerName: sub.customerName,
    customerEmail: sub.customerEmail,
    customerPhone: sub.customerPhone,
    planName: sub.planName,
    interval: subscriptionService.toIntervalKey(sub.interval),
    amount: sub.amount,
    currency: sub.currency,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
    canceledAt: sub.canceledAt ? sub.canceledAt.toISOString() : null,
    createdAt: sub.createdAt.toISOString(),
  }));

  return <AdminDashboard subscriptions={rows} />;
}
