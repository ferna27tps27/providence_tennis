/**
 * Password reset token management.
 *
 * Uses Prisma when DATABASE_URL is configured and falls back to an in-memory
 * store otherwise.
 */

import { randomBytes } from "crypto";

import { PasswordResetToken } from "../../types/auth";
import { getPrismaClient } from "../db/prisma-client";
import { normalizeEmail } from "../utils/member-validation";

const resetTokens = new Map<string, PasswordResetToken>();
const TOKEN_EXPIRY_MINUTES = 30;

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createResetToken(email: string): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + TOKEN_EXPIRY_MINUTES);

  const prisma = getPrismaClient();
  if (prisma) {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    await prisma.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user?.id || null,
        email: normalizedEmail,
        token,
        expiresAt,
      },
    });

    return token;
  }

  for (const [existingToken, data] of Array.from(resetTokens.entries())) {
    if (data.email === normalizedEmail && !data.used) {
      resetTokens.delete(existingToken);
    }
  }

  resetTokens.set(token, {
    email: normalizedEmail,
    token,
    expiresAt: expiresAt.toISOString(),
    used: false,
  });

  return token;
}

export async function verifyResetToken(token: string): Promise<{ email: string; valid: boolean }> {
  if (!token) {
    return { email: "", valid: false };
  }

  const prisma = getPrismaClient();
  if (prisma) {
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!tokenRecord) {
      return { email: "", valid: false };
    }

    if (tokenRecord.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { token } }).catch(() => {});
      return { email: "", valid: false };
    }

    const email = tokenRecord.email;
    await prisma.passwordResetToken.delete({ where: { token } });
    return { email, valid: true };
  }

  const tokenData = resetTokens.get(token);
  if (!tokenData || tokenData.used) {
    return { email: "", valid: false };
  }

  if (new Date(tokenData.expiresAt) < new Date()) {
    resetTokens.delete(token);
    return { email: "", valid: false };
  }

  tokenData.used = true;
  resetTokens.set(token, tokenData);
  return { email: tokenData.email, valid: true };
}

export function getResetUrl(token: string): string {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3009";
  return `${frontendUrl}/reset-password?token=${token}`;
}

export async function cleanupExpiredTokens(): Promise<void> {
  const prisma = getPrismaClient();
  if (prisma) {
    await prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return;
  }

  const now = new Date();
  for (const [token, data] of Array.from(resetTokens.entries())) {
    if (new Date(data.expiresAt) < now) {
      resetTokens.delete(token);
    }
  }
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    void cleanupExpiredTokens();
  }, 15 * 60 * 1000);
}
