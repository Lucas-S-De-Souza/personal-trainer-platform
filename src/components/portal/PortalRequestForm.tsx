"use client";

import { useState, type FormEvent } from "react";
import { getFriendlyErrorMessage } from "@/utils/errorMessage";
import { isValidEmail } from "@/utils/validation";

export function PortalRequestForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pink/15 text-2xl">✉️</div>
        <p className="text-center text-sm text-gray-text">
          Se esse e-mail tiver uma assinatura com a gente, você recebe um link de acesso em instantes. O link vale
          por 30 minutos.
        </p>
        <button type="button" onClick={() => setSent(false)} className="btn btn-outline btn-lg">
          Usar outro e-mail
        </button>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!isValidEmail(email)) {
      setEmailError("Informe um e-mail válido (ex: nome@provedor.com)");
      return;
    }
    setEmailError(null);
    setIsSubmitting(true);

    try {
      const csrfRes = await fetch("/api/csrf");
      if (!csrfRes.ok) {
        throw new Error("Não foi possível carregar a página. Recarregue e tente de novo.");
      }
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

      await fetch("/api/portal/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ email }),
      });

      setSent(true);
    } catch (err) {
      setFormError(getFriendlyErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="portalEmail" className="field-label">
          E-mail
        </label>
        <input
          id="portalEmail"
          type="email"
          required
          autoComplete="email"
          autoFocus
          aria-invalid={emailError ? "true" : "false"}
          className={`field-input ${emailError ? "!border-red-400" : ""}`}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(null);
          }}
          placeholder="voce@email.com"
        />
        {emailError && (
          <p role="alert" className="field-error">
            {emailError}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="field-error">
          {formError}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg mt-1 disabled:opacity-60">
        {isSubmitting ? "Enviando..." : "Enviar link de acesso"}
      </button>
    </form>
  );
}
