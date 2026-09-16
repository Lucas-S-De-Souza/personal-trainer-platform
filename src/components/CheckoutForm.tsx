"use client";

import { useState, type FormEvent } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import type { Plan, BillingIntervalKey, ExistingSubscriptionResponse } from "@/types";
import { getFriendlyErrorMessage } from "@/utils/errorMessage";
import { isValidEmail, isValidPhone } from "@/utils/validation";

interface CheckoutFormProps {
  plan: Plan;
  interval: BillingIntervalKey;
}

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Formulário de checkout em duas etapas:
 *
 * 1. Coleta nome, e-mail e telefone (nosso próprio formulário) e chama
 *    POST /api/checkout, que cria a assinatura (Customer + Subscription)
 *    no servidor, no ciclo (mensal/trimestral) escolhido no componente pai.
 * 2. Com o `client_secret` retornado, renderiza o Payment Element da
 *    Stripe (campo de cartão dentro de um iframe da Stripe — nós nunca
 *    vemos nem armazenamos o número do cartão) para confirmar o pagamento
 *    da primeira cobrança. As cobranças seguintes (renovação mensal ou
 *    trimestral) acontecem automaticamente pela Stripe, sem precisar do
 *    aluno voltar ao site.
 */
export function CheckoutForm({ plan, interval }: CheckoutFormProps) {
  const [step, setStep] = useState<"details" | "payment">("details");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingSubscription, setExistingSubscription] = useState<ExistingSubscriptionResponse | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  function handleEmailBlur() {
    if (customerEmail && !isValidEmail(customerEmail)) {
      setEmailError("Informe um e-mail válido (ex: nome@provedor.com)");
    } else {
      setEmailError(null);
    }
  }

  function handlePhoneBlur() {
    if (customerPhone && !isValidPhone(customerPhone)) {
      setPhoneError("Informe um telefone válido, com DDD (ex: (11) 91234-5678)");
    } else {
      setPhoneError(null);
    }
  }

  async function handleDetailsSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    // Confere de novo no momento do envio (não só no blur) — cobre o caso
    // de alguém colar um valor e enviar sem passar o foco pelo campo.
    const emailValid = isValidEmail(customerEmail);
    const phoneValid = isValidPhone(customerPhone);
    setEmailError(emailValid ? null : "Informe um e-mail válido (ex: nome@provedor.com)");
    setPhoneError(phoneValid ? null : "Informe um telefone válido, com DDD (ex: (11) 91234-5678)");
    if (!emailValid || !phoneValid) return;

    setIsSubmitting(true);

    try {
      // Antes de criar a assinatura, confere se esse e-mail já tem um
      // plano em vigor — se tiver, mostra um aviso em vez de trocar em
      // silêncio (o usuário decide se quer continuar ou não).
      const checkRes = await fetch(`/api/checkout/existing-subscription?email=${encodeURIComponent(customerEmail)}`);
      if (checkRes.ok) {
        const checkData = (await checkRes.json()) as ExistingSubscriptionResponse;
        if (checkData.hasActiveSubscription) {
          setExistingSubscription(checkData);
          setIsSubmitting(false);
          return; // aguarda a pessoa confirmar (ou cancelar) no aviso
        }
      }
    } catch {
      // Se a checagem em si falhar, não trava o fluxo por causa dela —
      // segue normalmente pro checkout (o servidor ainda protege contra
      // duplicidade de qualquer forma, só não avisa antes nesse caso raro).
    }

    await createSubscription();
  }

  async function createSubscription() {
    setFormError(null);
    setIsSubmitting(true);

    try {
      // 1. Busca um token CSRF fresco antes de enviar o formulário.
      const csrfRes = await fetch("/api/csrf");
      if (!csrfRes.ok) {
        throw new Error("Não foi possível carregar a página. Recarregue e tente de novo.");
      }
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

      // 2. Cria a assinatura no servidor.
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          planId: plan.id,
          interval,
          customerName,
          customerEmail,
          customerPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Não foi possível continuar. Tente novamente.");
      }

      if (!stripePromise) {
        stripePromise = loadStripe(data.publishableKey as string);
      }

      setClientSecret(data.clientSecret as string);
      setSubscriptionId(data.subscriptionId as string);
      setStep("payment");
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "payment" && clientSecret && subscriptionId) {
    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          locale: "pt-BR",
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#E84CAD",
              colorText: "#0A0A0A",
              borderRadius: "12px",
              fontFamily: "Inter, sans-serif",
            },
          },
        }}
      >
        <PaymentStep subscriptionId={subscriptionId} customerName={customerName} />
      </Elements>
    );
  }

  return (
    <>
      {existingSubscription?.hasActiveSubscription && (
        <ExistingSubscriptionDialog
          info={existingSubscription}
          newPlanName={plan.name}
          isConfirming={isSubmitting}
          onCancel={() => setExistingSubscription(null)}
          onConfirm={() => {
            setExistingSubscription(null);
            void createSubscription();
          }}
        />
      )}

      <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="customerName" className="field-label">
            Nome completo
          </label>
          <input
            id="customerName"
            type="text"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            className="field-input"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Seu nome completo"
          />
        </div>

        <div>
          <label htmlFor="customerEmail" className="field-label">
            E-mail
          </label>
          <input
            id="customerEmail"
            type="email"
            required
            maxLength={180}
            autoComplete="email"
            aria-invalid={emailError ? "true" : "false"}
            className={`field-input ${emailError ? "!border-red-400" : ""}`}
            value={customerEmail}
            onChange={(e) => {
              setCustomerEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            onBlur={handleEmailBlur}
            placeholder="voce@email.com"
          />
          {emailError && (
            <p role="alert" className="field-error">
              {emailError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="customerPhone" className="field-label">
            Telefone / WhatsApp
          </label>
          <input
            id="customerPhone"
            type="tel"
            required
            autoComplete="tel"
            aria-invalid={phoneError ? "true" : "false"}
            className={`field-input ${phoneError ? "!border-red-400" : ""}`}
            value={customerPhone}
            onChange={(e) => {
              setCustomerPhone(e.target.value);
              if (phoneError) setPhoneError(null);
            }}
            onBlur={handlePhoneBlur}
            placeholder="(11) 91234-5678"
          />
          {phoneError ? (
            <p role="alert" className="field-error">
              {phoneError}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-gray-text">
              Use o número com DDD — é nele que a confirmação chega pelo WhatsApp.
            </p>
          )}
        </div>

        {formError && (
          <p role="alert" className="field-error">
            {formError}
          </p>
        )}

        <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg mt-2 disabled:opacity-60">
          {isSubmitting ? "Processando..." : "Continuar para pagamento"}
        </button>
      </form>
    </>
  );
}

function ExistingSubscriptionDialog({
  info,
  newPlanName,
  isConfirming,
  onCancel,
  onConfirm,
}: {
  info: ExistingSubscriptionResponse;
  newPlanName: string;
  isConfirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cadence = info.interval === "quarterly" ? "trimestral" : "mensal";
  const validUntil = info.currentPeriodEnd
    ? new Date(info.currentPeriodEnd).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;
  const isSamePlan = info.planName === newPlanName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-lg border border-gray-border bg-white p-7 shadow-lift">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-2xl">
          ⚠️
        </div>
        <h2 className="font-display mb-2 text-lg font-bold text-ink">
          {isSamePlan ? "Você já tem esse plano ativo" : "Você já tem um plano ativo"}
        </h2>
        <p className="mb-5 text-sm text-gray-text">
          Seu plano <strong className="text-ink">{info.planName}</strong> ({cadence})
          {validUntil ? (
            <>
              {" "}
              está válido até <strong className="text-ink">{validUntil}</strong>.
            </>
          ) : (
            " ainda está em vigor."
          )}{" "}
          Se continuar, esse plano será cancelado agora e substituído pelo novo (
          <strong className="text-ink">{newPlanName}</strong>). Essa ação não pode ser desfeita automaticamente.
        </p>
        <p className="mb-6 text-sm font-medium text-ink">Tem certeza que quer continuar?</p>

        <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="btn btn-primary flex-1 disabled:opacity-60"
          >
            {isConfirming ? "Trocando..." : "Sim, trocar de plano"}
          </button>
          <button type="button" onClick={onCancel} disabled={isConfirming} className="btn btn-outline flex-1">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentStep({ subscriptionId, customerName }: { subscriptionId: string; customerName: string }) {
  const stripe = useStripe();
  const elements = useElements();

  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  async function handlePaySubmit(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsPaying(true);
    setPayError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // O status real da assinatura é sempre confirmado no servidor via
        // webhook — esta URL só leva o usuário para a tela de status.
        return_url: `${window.location.origin}/checkout/success?subscription=${subscriptionId}`,
      },
    });

    // Se chegou aqui sem redirecionar, algo falhou antes de sair da página
    // (ex: cartão recusado imediatamente).
    if (error) {
      setPayError(error.message ?? "Não foi possível confirmar o pagamento. Tente novamente.");
      setIsPaying(false);
    }
  }

  return (
    <form onSubmit={handlePaySubmit} className="flex flex-col gap-5">
      <p className="text-sm text-gray-text">
        Olá, {customerName.split(" ")[0]}. Finalize informando os dados de pagamento abaixo.
      </p>

      <PaymentElement />

      {payError && (
        <p role="alert" className="field-error">
          {payError}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || isPaying}
        className="btn btn-primary btn-lg mt-2 disabled:opacity-60"
      >
        {isPaying ? "Confirmando pagamento..." : "Finalizar compra"}
      </button>
    </form>
  );
}
