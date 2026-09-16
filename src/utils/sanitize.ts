/**
 * Sanitização de strings vindas do usuário.
 *
 * A validação com Zod (validation.ts) já rejeita a maioria dos formatos
 * inválidos. Esta camada adicional protege especificamente contra
 * XSS caso algum desses valores seja um dia renderizado como HTML
 * (ex: em um e-mail HTML ou painel administrativo futuro).
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

/** Remove espaços duplicados e caracteres de controle invisíveis. */
export function cleanText(input: string): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, "") // caracteres de controle
    .replace(/\s+/g, " ")
    .trim();
}
