/**
 * Extrai uma mensagem de erro amigável, sempre em português, pra mostrar
 * na tela.
 *
 * Por quê isso existe: nossas próprias respostas de API já vêm em
 * português (veja src/utils/env.ts e os controllers), mas falhas de rede
 * do próprio navegador (`fetch` falhando por falta de conexão, CORS, etc.)
 * lançam um `TypeError` com mensagem nativa em inglês (ex: "Failed to
 * fetch") — isso nunca deve aparecer pro usuário final.
 */
export function getFriendlyErrorMessage(
  error: unknown,
  fallback = "Ocorreu um erro inesperado. Tente novamente."
): string {
  // Falha de rede/conexão — a mensagem nativa do navegador vem em inglês.
  if (error instanceof TypeError) {
    return "Não foi possível conectar. Verifique sua internet e tente novamente.";
  }

  // Erros que nós mesmos lançamos (ex: `throw new Error(data.error.message)`)
  // já têm texto em português, vindo da nossa própria API.
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
