/**
 * Unit tests for email verification
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createVerificationToken,
  verifyToken,
  getVerificationUrl,
} from "../../lib/auth/email-verification";

describe("Email Verification", () => {
  beforeEach(() => {
    // Note: In a real implementation, we'd clear the token store
    // For now, we'll test with fresh tokens
  });

  describe("createVerificationToken", () => {
    it("should create a verification token", () => {
      const token = createVerificationToken("test@example.com");
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should create different tokens for different emails", () => {
      const token1 = createVerificationToken("test1@example.com");
      const token2 = createVerificationToken("test2@example.com");
      
      expect(token1).not.toBe(token2);
    });

    it("should replace existing token for same email", () => {
      const token1 = createVerificationToken("test@example.com");
      const token2 = createVerificationToken("test@example.com");
      
      // Should create a new token (replacing the old one)
      expect(token2).toBeDefined();
      // The old token should be invalid
      const result1 = verifyToken(token1);
      expect(result1.valid).toBe(false);
    });
  });

  describe("verifyToken", () => {
    it("should verify a valid token", () => {
      const token = createVerificationToken("test@example.com");
      const result = verifyToken(token);
      
      expect(result.valid).toBe(true);
      expect(result.email).toBe("test@example.com");
    });

    it("should return invalid for non-existent token", () => {
      const result = verifyToken("nonexistent-token");
      
      expect(result.valid).toBe(false);
      expect(result.email).toBe("");
    });

    it("should return invalid for already used token", () => {
      const token = createVerificationToken("test@example.com");
      
      // First verification should succeed
      const result1 = verifyToken(token);
      expect(result1.valid).toBe(true);
      
      // Second verification should fail (token already used)
      const result2 = verifyToken(token);
      expect(result2.valid).toBe(false);
    });

    it("should return invalid for empty token", () => {
      const result = verifyToken("");
      
      expect(result.valid).toBe(false);
      expect(result.email).toBe("");
    });
  });

  describe("getVerificationUrl", () => {
    it("should generate verification URL with token", () => {
      const token = "test-token-123";
      const url = getVerificationUrl(token);
      
      expect(url).toContain(token);
      expect(url).toContain("/verify-email");
    });

    it("should use FRONTEND_URL from environment", () => {
      const originalUrl = process.env.FRONTEND_URL;
      process.env.FRONTEND_URL = "https://example.com";
      
      const token = "test-token";
      const url = getVerificationUrl(token);
      
      expect(url).toContain("https://example.com");
      
      // Restore
      if (originalUrl) {
        process.env.FRONTEND_URL = originalUrl;
      } else {
        delete process.env.FRONTEND_URL;
      }
    });
  });
});
