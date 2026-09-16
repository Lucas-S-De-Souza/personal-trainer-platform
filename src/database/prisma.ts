import { PrismaClient } from "@prisma/client";

/**
 * Em desenvolvimento, o Next.js recarrega módulos a cada mudança de arquivo
 * (hot reload). Sem esse cache global, cada reload criaria uma NOVA conexão
 * com o banco, esgotando o pool de conexões do Postgres rapidamente.
 * Guardamos a instância em `globalThis` para reaproveitá-la entre reloads.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
