"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getFriendlyErrorMessage } from "@/utils/errorMessage";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showForgotConfirm, setShowForgotConfirm] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const csrfRes = await fetch("/api/csrf");
      if (!csrfRes.ok) {
        throw new Error("Não foi possível carregar a página. Recarregue e tente de novo.");
      }
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Não foi possível entrar. Tente novamente.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    setIsSendingReset(true);
    setError(null);

    try {
      const csrfRes = await fetch("/api/csrf");
      if (!csrfRes.ok) {
        throw new Error("Não foi possível carregar a página. Recarregue e tente de novo.");
      }
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

      await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "X-CSRF-Token": csrfToken },
      });

      setResetSent(true);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsSendingReset(false);
    }
  }

  if (resetSent) {
    return (
      <div className="flex flex-col gap-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pink/15 text-2xl">✉️</div>
        <p className="text-center text-sm text-gray-text">
          Se o e-mail estiver configurado corretamente, um link de redefinição chega em instantes. O link vale por
          1 hora.
        </p>
        <button
          type="button"
          onClick={() => {
            setResetSent(false);
            setShowForgotConfirm(false);
          }}
          className="btn btn-outline btn-lg"
        >
          Voltar ao login
        </button>
      </div>
    );
  }

  if (showForgotConfirm) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-text">
          Vamos enviar um link de redefinição de senha para o e-mail cadastrado. Quer continuar?
        </p>

        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={isSendingReset}
          className="btn btn-primary btn-lg disabled:opacity-60"
        >
          {isSendingReset ? "Enviando..." : "Enviar link de redefinição"}
        </button>
        <button
          type="button"
          onClick={() => setShowForgotConfirm(false)}
          disabled={isSendingReset}
          className="btn btn-outline btn-lg"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="password" className="field-label">
          Senha
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          autoFocus
          className="field-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg mt-1 disabled:opacity-60">
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>

      <button
        type="button"
        onClick={() => setShowForgotConfirm(true)}
        className="text-center text-sm text-gray-text underline-offset-2 hover:text-ink hover:underline"
      >
        Esqueci minha senha
      </button>
    </form>
  );
}
