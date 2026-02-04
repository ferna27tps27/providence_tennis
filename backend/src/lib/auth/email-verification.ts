/**
 * Email verification token management
 */

import { randomBytes } from "crypto";
import { EmailVerificationToken } from "../../types/auth";

// In-memory token store (in production, use database)
const verificationTokens = new Map<string, EmailVerificationToken>();

const TOKEN_EXPIRY_HOURS = 24; // 24 hours

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create an email verification token
 */
export function createVerificationToken(email: string): string {
  // Remove any existing token for this email
  for (const [token, data] of Array.from(verificationTokens.entries())) {
    if (data.email === email && !data.used) {
      verificationTokens.delete(token);
    }
  }
  
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);
  
  const tokenData: EmailVerificationToken = {
    email,
    token,
    expiresAt: expiresAt.toISOString(),
    used: false,
  };
  
  verificationTokens.set(token, tokenData);
  
  return token;
}

/**
 * Verify and consume an email verification token
 */
export function verifyToken(token: string): { email: string; valid: boolean } {
  const tokenData = verificationTokens.get(token);
  
  if (!tokenData) {
    return { email: "", valid: false };
  }
  
  if (tokenData.used) {
    return { email: "", valid: false };
  }
  
  if (new Date(tokenData.expiresAt) < new Date()) {
    verificationTokens.delete(token);
    return { email: "", valid: false };
  }
  
  // Mark token as used
  tokenData.used = true;
  verificationTokens.set(token, tokenData);
  
  return { email: tokenData.email, valid: true };
}

/**
 * Get verification URL for email
 */
export function getVerificationUrl(token: string): string {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3009";
  return `${frontendUrl}/verify-email?token=${token}`;
}

/**
 * Clean up expired tokens
 */
export function cleanupExpiredTokens(): void {
  const now = new Date();
  
  for (const [token, data] of Array.from(verificationTokens.entries())) {
    if (new Date(data.expiresAt) < now) {
      verificationTokens.delete(token);
    }
  }
}

// Run cleanup every hour
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000); // 1 hour
}
