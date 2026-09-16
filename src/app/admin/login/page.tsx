import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/utils/adminSession";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = { title: "Entrar no painel" };

export default async function AdminLoginPage() {
  // Se já tem sessão válida, não precisa passar pelo login de novo.
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-border bg-white p-8 shadow-soft">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-pink-deep">
          Painel administrativo
        </p>
        <h1 className="font-display mb-6 text-xl font-bold">Thais Santana</h1>
        <AdminLoginForm />
      </div>
    </main>
  );
}
