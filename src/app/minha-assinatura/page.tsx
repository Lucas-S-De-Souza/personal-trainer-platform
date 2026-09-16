import type { Metadata } from "next";
import { PortalRequestForm } from "@/components/portal/PortalRequestForm";

export const metadata: Metadata = { title: "Minha assinatura" };

export default function PortalRequestPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-border bg-white p-8 shadow-soft">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-pink-deep">Área do aluno</p>
        <h1 className="font-display mb-2 text-xl font-bold">Minha assinatura</h1>
        <p className="mb-6 text-sm text-gray-text">
          Informe o e-mail que você usou na assinatura. Vamos te mandar um link de acesso — sem precisar de senha.
        </p>
        <PortalRequestForm />
      </div>
    </main>
  );
}
