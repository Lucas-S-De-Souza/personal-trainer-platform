import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckoutSuccessContent } from "@/components/CheckoutSuccessContent";

export const metadata: Metadata = { title: "Confirmação do pedido" };

function LoadingFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-md rounded-lg border border-gray-border bg-white p-10 text-center shadow-soft">
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-gray-border border-t-pink" />
        <p className="text-sm text-gray-text">Carregando...</p>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
