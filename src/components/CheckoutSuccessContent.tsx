"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { SubscriptionStatusResponse } from "@/types";

type ViewState = "loading" | "active" | "pending" | "failed" | "not-found" | "error";

/**
 * Busca o status da assinatura no servidor (nunca confia em query params
 * como prova de pagamento — a URL de retorno da Stripe pode até ser
 * revisitada manualmente pelo usuário sem que o pagamento tenha sido
 * concluído).
 *
 * Se o webhook ainda não tiver processado o evento no instante em que
 * o usuário chega aqui (o redirect do cartão às vezes é mais rápido
 * que o webhook), fazemos um curto polling antes de desistir.
 */
export function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const subscriptionId = searchParams.get("subscription");

  const [state, setState] = useState<ViewState>("loading");
  const [subscription, setSubscription] = useState<SubscriptionStatusResponse | null>(null);

  useEffect(() => {
    if (!subscriptionId) {
      setState("not-found");
      return;
    }

    let attempts = 0;
    let cancelled = false;
    const MAX_ATTEMPTS = 6;

    async function poll() {
      try {
        const res = await fetch(`/api/subscriptions/${subscriptionId}`);
        if (cancelled) return;

        if (res.status === 404) {
          setState("not-found");
          return;
        }

        if (!res.ok) {
          setState("error");
          return;
        }

        const data = (await res.json()) as SubscriptionStatusResponse;
        setSubscription(data);

        if (data.status === "ACTIVE") {
          setState("active");
          return;
        }

        if (data.status === "CANCELED" || data.status === "UNPAID") {
          setState("failed");
          return;
        }

        // INCOMPLETE ou PAST_DUE logo após o checkout costuma significar
        // que o webhook ainda está a caminho — continua tentando.
        attempts += 1;
        if (attempts >= MAX_ATTEMPTS) {
          setState("pending");
          return;
        }

        setTimeout(poll, 2000);
      } catch {
        if (!cancelled) setState("error");
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [subscriptionId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-md rounded-lg border border-gray-border bg-white p-10 text-center shadow-soft">
        {state === "loading" && <LoadingView />}
        {state === "active" && subscription && <ActiveView subscription={subscription} />}
        {state === "pending" && <PendingView />}
        {state === "failed" && <FailedView />}
        {state === "not-found" && <NotFoundView />}
        {state === "error" && <ErrorView />}
      </div>
    </main>
  );
}

function LoadingView() {
  return (
    <>
      <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-gray-border border-t-pink" />
      <p className="text-sm text-gray-text">Confirmando seu pagamento...</p>
    </>
  );
}

function ActiveView({ subscription }: { subscription: SubscriptionStatusResponse }) {
  const cadence = subscription.interval === "monthly" ? "mensal" : "trimestral";
  return (
    <>
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-pink/15 text-2xl text-pink-deep">
        ✓
      </div>
      <h1 className="font-display mb-2 text-xl font-bold">Assinatura confirmada!</h1>
      <p className="mb-1 text-sm text-gray-text">
        Olá, {subscription.customerName.split(" ")[0]}. Seu plano <strong>{subscription.planName}</strong> ({cadence})
        está ativo.
      </p>
      <p className="mb-6 text-sm text-gray-text">
        Enviamos a confirmação por e-mail e por WhatsApp, com os próximos passos.
      </p>
      <div className="flex flex-col gap-2.5">
        <Link href="/minha-assinatura" className="btn btn-primary btn-lg">
          Gerenciar minha assinatura
        </Link>
        <Link href="/" className="btn btn-outline btn-lg">
          Voltar ao site
        </Link>
      </div>
    </>
  );
}

function PendingView() {
  return (
    <>
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gray-soft text-2xl">
        ⏳
      </div>
      <h1 className="font-display mb-2 text-xl font-bold">Ainda confirmando...</h1>
      <p className="mb-6 text-sm text-gray-text">
        Seu pagamento está sendo processado. Isso pode levar alguns instantes — você também
        receberá uma confirmação por e-mail e WhatsApp assim que for aprovado.
      </p>
      <Link href="/" className="btn btn-outline btn-lg">
        Voltar ao site
      </Link>
    </>
  );
}

function FailedView() {
  return (
    <>
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-red-500">
        ✕
      </div>
      <h1 className="font-display mb-2 text-xl font-bold">Pagamento não aprovado</h1>
      <p className="mb-6 text-sm text-gray-text">
        Não foi possível confirmar o pagamento da assinatura. Você pode tentar novamente com
        outro cartão.
      </p>
      <Link href="/#planos" className="btn btn-primary btn-lg">
        Tentar novamente
      </Link>
    </>
  );
}

function NotFoundView() {
  return (
    <>
      <h1 className="font-display mb-2 text-xl font-bold">Assinatura não encontrada</h1>
      <p className="mb-6 text-sm text-gray-text">
        Não localizamos essa assinatura. Se você acabou de finalizar uma compra, confira seu
        e-mail ou WhatsApp.
      </p>
      <Link href="/" className="btn btn-outline btn-lg">
        Voltar ao site
      </Link>
    </>
  );
}

function ErrorView() {
  return (
    <>
      <h1 className="font-display mb-2 text-xl font-bold">Algo deu errado</h1>
      <p className="mb-6 text-sm text-gray-text">
        Não conseguimos carregar o status da sua assinatura agora. Se o valor foi cobrado, ela
        será confirmada automaticamente em instantes.
      </p>
      <Link href="/" className="btn btn-outline btn-lg">
        Voltar ao site
      </Link>
    </>
  );
}
