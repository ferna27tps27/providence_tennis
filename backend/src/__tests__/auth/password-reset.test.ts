/**
 * Unit tests for password reset
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createResetToken,
  verifyResetToken,
  getResetUrl,
} from "../../lib/auth/password-reset";

describe("Password Reset", () => {
  beforeEach(() => {
    // Note: In a real implementation, we'd clear the token store
    // For now, we'll test with fresh tokens
  });

  describe("createResetToken", () => {
    it("should create a reset token", () => {
      const token = createResetToken("test@example.com");
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should create different tokens for different emails", () => {
      const token1 = createResetToken("test1@example.com");
      const token2 = createResetToken("test2@example.com");
      
      expect(token1).not.toBe(token2);
    });

    it("should replace existing token for same email", () => {
      const token1 = createResetToken("test@example.com");
      const token2 = createResetToken("test@example.com");
      
      // Should create a new token (replacing the old one)
      expect(token2).toBeDefined();
      // The old token should be invalid
      const result1 = verifyResetToken(token1);
      expect(result1.valid).toBe(false);
    });
  });

  describe("verifyResetToken", () => {
    it("should verify a valid token", () => {
      const token = createResetToken("test@example.com");
      const result = verifyResetToken(token);
      
      expect(result.valid).toBe(true);
      expect(result.email).toBe("test@example.com");
    });

    it("should return invalid for non-existent token", () => {
      const result = verifyResetToken("nonexistent-token");
      
      expect(result.valid).toBe(false);
      expect(result.email).toBe("");
    });

    it("should return invalid for already used token", () => {
      const token = createResetToken("test@example.com");
      
      // First verification should succeed
      const result1 = verifyResetToken(token);
      expect(result1.valid).toBe(true);
      
      // Second verification should fail (token already used)
      const result2 = verifyResetToken(token);
      expect(result2.valid).toBe(false);
    });

    it("should return invalid for empty token", () => {
      const result = verifyResetToken("");
      
      expect(result.valid).toBe(false);
      expect(result.email).toBe("");
    });
  });

  describe("getResetUrl", () => {
    it("should generate reset URL with token", () => {
      const token = "test-token-123";
      const url = getResetUrl(token);
      
      expect(url).toContain(token);
      expect(url).toContain("/reset-password");
    });

    it("should use FRONTEND_URL from environment", () => {
      const originalUrl = process.env.FRONTEND_URL;
      process.env.FRONTEND_URL = "https://example.com";
      
      const token = "test-token";
      const url = getResetUrl(token);
      
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
