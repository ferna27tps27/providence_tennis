/**
 * Password reset token management
 */

import { randomBytes } from "crypto";
import { PasswordResetToken } from "../../types/auth";

// In-memory token store (in production, use database)
const resetTokens = new Map<string, PasswordResetToken>();

const TOKEN_EXPIRY_MINUTES = 30; // 30 minutes

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create a password reset token
 */
export function createResetToken(email: string): string {
  // Remove any existing token for this email
  for (const [token, data] of Array.from(resetTokens.entries())) {
    if (data.email === email && !data.used) {
      resetTokens.delete(token);
    }
  }
  
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + TOKEN_EXPIRY_MINUTES);
  
  const tokenData: PasswordResetToken = {
    email,
    token,
    expiresAt: expiresAt.toISOString(),
    used: false,
  };
  
  resetTokens.set(token, tokenData);
  
  return token;
}

/**
 * Verify and consume a password reset token
 */
export function verifyResetToken(token: string): { email: string; valid: boolean } {
  const tokenData = resetTokens.get(token);
  
  if (!tokenData) {
    return { email: "", valid: false };
  }
  
  if (tokenData.used) {
    return { email: "", valid: false };
  }
  
  if (new Date(tokenData.expiresAt) < new Date()) {
    resetTokens.delete(token);
    return { email: "", valid: false };
  }
  
  // Mark token as used
  tokenData.used = true;
  resetTokens.set(token, tokenData);
  
  return { email: tokenData.email, valid: true };
}

/**
 * Get password reset URL for email
 */
export function getResetUrl(token: string): string {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3009";
  return `${frontendUrl}/reset-password?token=${token}`;
}

/**
 * Clean up expired tokens
 */
export function cleanupExpiredTokens(): void {
  const now = new Date();
  
  for (const [token, data] of Array.from(resetTokens.entries())) {
    if (new Date(data.expiresAt) < now) {
      resetTokens.delete(token);
    }
  }
}

// Run cleanup every 15 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredTokens, 15 * 60 * 1000); // 15 minutes
}
