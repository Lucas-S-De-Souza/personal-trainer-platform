import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/admin/ResetPasswordForm";

export const metadata: Metadata = { title: "Redefinir senha" };

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AdminResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-border bg-white p-8 shadow-soft">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-pink-deep">Painel administrativo</p>
        <h1 className="font-display mb-6 text-xl font-bold">Redefinir senha</h1>
        <ResetPasswordForm token={token ?? ""} />
      </div>
    </main>
  );
}
