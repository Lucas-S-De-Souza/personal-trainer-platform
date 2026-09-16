"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getFriendlyErrorMessage } from "@/utils/errorMessage";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <p className="text-sm text-gray-text">
        Esse link está incompleto. Peça um novo link de redefinição na tela de login.
      </p>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pink/15 text-2xl">✓</div>
        <p className="text-center text-sm text-gray-text">Senha redefinida com sucesso.</p>
        <button type="button" onClick={() => router.push("/admin/login")} className="btn btn-primary btn-lg">
          Ir para o login
        </button>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não são iguais.");
      return;
    }

    setIsSubmitting(true);

    try {
      const csrfRes = await fetch("/api/csrf");
      if (!csrfRes.ok) {
        throw new Error("Não foi possível carregar a página. Recarregue e tente de novo.");
      }
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Não foi possível redefinir a senha. Tente novamente.");
      }

      setSuccess(true);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="newPassword" className="field-label">
          Nova senha
        </label>
        <input
          id="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          className="field-input"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="field-label">
          Confirmar nova senha
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field-input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repita a senha"
        />
      </div>

      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg mt-1 disabled:opacity-60">
        {isSubmitting ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
