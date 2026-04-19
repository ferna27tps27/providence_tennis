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
