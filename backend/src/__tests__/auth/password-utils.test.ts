/**
 * Unit tests for password utilities
 */

import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword, validatePasswordStrength } from "../../lib/auth/password-utils";

describe("Password Utilities", () => {
  describe("hashPassword", () => {
    it("should hash a password successfully", async () => {
      const password = "TestPassword123";
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
      expect(hash.startsWith("$2")).toBe(true); // bcrypt hash starts with $2
    });

    it("should throw error for password shorter than 8 characters", async () => {
      await expect(hashPassword("Short1")).rejects.toThrow("Password must be at least 8 characters long");
    });

    it("should throw error for empty password", async () => {
      await expect(hashPassword("")).rejects.toThrow("Password must be at least 8 characters long");
    });
  });

  describe("comparePassword", () => {
    it("should return true for matching password and hash", async () => {
      const password = "TestPassword123";
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);
      
      expect(result).toBe(true);
    });

    it("should return false for non-matching password and hash", async () => {
      const password = "TestPassword123";
      const wrongPassword = "WrongPassword123";
      const hash = await hashPassword(password);
      const result = await comparePassword(wrongPassword, hash);
      
      expect(result).toBe(false);
    });

    it("should return false for empty password", async () => {
      const password = "TestPassword123";
      const hash = await hashPassword(password);
      const result = await comparePassword("", hash);
      
      expect(result).toBe(false);
    });

    it("should return false for empty hash", async () => {
      const result = await comparePassword("TestPassword123", "");
      
      expect(result).toBe(false);
    });
  });

  describe("validatePasswordStrength", () => {
    it("should validate a strong password", () => {
      const result = validatePasswordStrength("StrongPass123");
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject password shorter than 8 characters", () => {
      const result = validatePasswordStrength("Short1");
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must be at least 8 characters long");
    });

    it("should reject password longer than 128 characters", () => {
      const longPassword = "A".repeat(129) + "1";
      const result = validatePasswordStrength(longPassword);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must be less than 128 characters");
    });

    it("should reject password without lowercase letter", () => {
      const result = validatePasswordStrength("UPPERCASE123");
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one lowercase letter");
    });

    it("should reject password without uppercase letter", () => {
      const result = validatePasswordStrength("lowercase123");
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one uppercase letter");
    });

    it("should reject password without number", () => {
      const result = validatePasswordStrength("NoNumbers");
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one number");
    });

    it("should return multiple errors for weak password", () => {
      const result = validatePasswordStrength("weak");
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it("should accept password with special characters", () => {
      const result = validatePasswordStrength("Strong@Pass123");
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
