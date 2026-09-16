import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPlanById } from "@/config/plans";
import { CheckoutClient } from "@/components/CheckoutClient";

interface CheckoutPageProps {
  // Next.js 15: params passa a ser assíncrono (Promise) tanto em
  // generateMetadata quanto no componente da página.
  params: Promise<{ planId: string }>;
}

export async function generateMetadata({ params }: CheckoutPageProps): Promise<Metadata> {
  const { planId } = await params;
  const plan = getPlanById(planId);
  return { title: plan ? `Checkout — Plano ${plan.name}` : "Checkout" };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { planId } = await params;
  const plan = getPlanById(planId);

  // Plano inexistente/URL adulterada manualmente -> 404, em vez de
  // deixar a pessoa presa em um checkout de um plano que não existe.
  if (!plan) notFound();

  return (
    <main className="min-h-screen bg-bg px-4 py-10 sm:py-16">
      <CheckoutClient plan={plan} />
    </main>
  );
}
