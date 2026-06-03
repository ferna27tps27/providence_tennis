import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __providencePrismaClient: PrismaClient | undefined;
}

export function isDatabaseRuntimeEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

export function getPrismaClient(): PrismaClient | null {
  if (!isDatabaseRuntimeEnabled()) {
    return null;
  }

  if (!globalThis.__providencePrismaClient) {
    globalThis.__providencePrismaClient = new PrismaClient();
  }

  return globalThis.__providencePrismaClient;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return false;
  }

  await prisma.$queryRaw`SELECT 1`;
  return true;
}

export async function disconnectPrismaClientForTests(): Promise<void> {
  if (!globalThis.__providencePrismaClient) {
    return;
  }

  await globalThis.__providencePrismaClient.$disconnect();
  globalThis.__providencePrismaClient = undefined;
}
