/**
 * Email verification token management.
 *
 * Uses Prisma when DATABASE_URL is configured and falls back to an in-memory
 * store otherwise.
 */

import { randomBytes } from "crypto";

import { EmailVerificationToken } from "../../types/auth";
import { getPrismaClient } from "../db/prisma-client";
import { normalizeEmail } from "../utils/member-validation";

const verificationTokens = new Map<string, EmailVerificationToken>();
const TOKEN_EXPIRY_HOURS = 24;

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createVerificationToken(email: string): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  const prisma = getPrismaClient();
  if (prisma) {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    await prisma.verificationToken.deleteMany({
      where: { email: normalizedEmail },
    });

    await prisma.verificationToken.create({
      data: {
        userId: user?.id || null,
        email: normalizedEmail,
        token,
        expiresAt,
      },
    });

    return token;
  }

  for (const [existingToken, data] of Array.from(verificationTokens.entries())) {
    if (data.email === normalizedEmail && !data.used) {
      verificationTokens.delete(existingToken);
    }
  }

  verificationTokens.set(token, {
    email: normalizedEmail,
    token,
    expiresAt: expiresAt.toISOString(),
    used: false,
  });

  return token;
}

export async function verifyToken(token: string): Promise<{ email: string; valid: boolean }> {
  if (!token) {
    return { email: "", valid: false };
  }

  const prisma = getPrismaClient();
  if (prisma) {
    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!tokenRecord) {
      return { email: "", valid: false };
    }

    if (tokenRecord.expiresAt < new Date()) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
      return { email: "", valid: false };
    }

    const email = tokenRecord.email;
    await prisma.verificationToken.delete({ where: { token } });
    return { email, valid: true };
  }

  const tokenData = verificationTokens.get(token);
  if (!tokenData || tokenData.used) {
    return { email: "", valid: false };
  }

  if (new Date(tokenData.expiresAt) < new Date()) {
    verificationTokens.delete(token);
    return { email: "", valid: false };
  }

  tokenData.used = true;
  verificationTokens.set(token, tokenData);
  return { email: tokenData.email, valid: true };
}

export function getVerificationUrl(token: string): string {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3009";
  return `${frontendUrl}/verify-email?token=${token}`;
}

export async function cleanupExpiredTokens(): Promise<void> {
  const prisma = getPrismaClient();
  if (prisma) {
    await prisma.verificationToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return;
  }

  const now = new Date();
  for (const [token, data] of Array.from(verificationTokens.entries())) {
    if (new Date(data.expiresAt) < now) {
      verificationTokens.delete(token);
    }
  }
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    void cleanupExpiredTokens();
  }, 60 * 60 * 1000);
}
