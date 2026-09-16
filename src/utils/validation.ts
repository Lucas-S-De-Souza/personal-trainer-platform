import { z } from "zod";

/**
 * Regras de validação do formulário de checkout.
 * Toda entrada de usuário passa por aqui ANTES de tocar em qualquer
 * serviço (Stripe, banco de dados, e-mail) — nunca confiamos apenas
 * na validação feita no navegador.
 */

// Zod's built-in .email() é permissiva demais (aceita coisas tipo
// "x@qualquercoisa", sem domínio de verdade) — regex própria, exigindo
// um domínio com ponto e TLD de pelo menos 2 letras.
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export const checkoutSchema = z.object({
  planId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Plano inválido"),

  interval: z.enum(["monthly", "quarterly"], {
    errorMap: () => ({ message: "Ciclo de cobrança inválido" }),
  }),

  customerName: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo")
    .max(120, "Nome muito longo")
    .regex(/^[\p{L}\s'.-]+$/u, "Nome contém caracteres inválidos"),

  customerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(180, "E-mail muito longo")
    .refine((val) => EMAIL_REGEX.test(val), "Informe um e-mail válido (ex: nome@provedor.com)"),

  customerPhone: z
    .string()
    .trim()
    .regex(/^[\d\s()+-]+$/, "Telefone inválido")
    .refine((val) => {
      const digits = val.replace(/\D/g, "");
      // DDD + número (10 ou 11 dígitos), com ou sem código do país 55 na frente
      return [10, 11, 12, 13].includes(digits.length);
    }, "Informe um telefone válido, com DDD (ex: (11) 91234-5678)"),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

/** Reutilizável no front-end pra validação em tempo real, sem duplicar a regra. */
export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  if (!/^[\d\s()+-]+$/.test(value.trim())) return false;
  const digits = value.replace(/\D/g, "");
  return [10, 11, 12, 13].includes(digits.length);
}

/** Extrai apenas os dígitos de um telefone, para armazenar em formato normalizado. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
