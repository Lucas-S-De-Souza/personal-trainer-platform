import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { handleVerifyPortalAccess } from "@/controllers/portalController";

export const metadata: Metadata = { title: "Acessando sua assinatura" };

interface VerifyPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function PortalVerifyPage({ searchParams }: VerifyPageProps) {
  const { token } = await searchParams;

  const portalUrl = token ? await handleVerifyPortalAccess(token) : null;

  // Token válido -> manda direto pro Customer Portal de verdade da Stripe.
  if (portalUrl) {
    redirect(portalUrl);
  }

  // Token ausente/expirado/já usado -> explica e oferece pedir um novo.
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-border bg-white p-8 text-center shadow-soft">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl text-red-500">
          ✕
        </div>
        <h1 className="font-display mb-2 text-xl font-bold">Link inválido ou expirado</h1>
        <p className="mb-6 text-sm text-gray-text">
          Esse link de acesso não é mais válido — pode ter expirado (dura 30 minutos) ou já ter sido usado. Peça um
          novo na tela de acesso.
        </p>
        <Link href="/minha-assinatura" className="btn btn-primary btn-lg">
          Pedir novo link
        </Link>
      </div>
    </main>
  );
}
