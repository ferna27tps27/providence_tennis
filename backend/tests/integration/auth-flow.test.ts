/**
 * Integration tests for complete authentication flows (Phase 1)
 * Tests end-to-end authentication scenarios
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import {
  signUp,
  signIn,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getCurrentMember,
} from "../../src/lib/auth/auth";
import { AuthenticationError, EmailAlreadyExistsError } from "../../src/lib/errors/auth-errors";
import { memberCache } from "../../src/lib/cache/member-cache";

let tempDir = "";
let originalDataDir: string | undefined;
let originalJwtSecret: string | undefined;

beforeAll(async () => {
  // Save original environment variables
  originalDataDir = process.env.DATA_DIR;
  originalJwtSecret = process.env.JWT_SECRET;
  
  // Set test environment
  process.env.JWT_SECRET = "test-secret-key-for-testing-only";
  process.env.FRONTEND_URL = "http://localhost:3009";
  process.env.BCRYPT_ROUNDS = "10";
  
  // Create unique temp directory for this test file
  const baseDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `pta-auth-flow-${Date.now()}-${Math.random().toString(36).substring(7)}-`)
  );
  tempDir = baseDir;
  process.env.DATA_DIR = tempDir;
  await fs.mkdir(tempDir, { recursive: true });
});

beforeEach(async () => {
  // Clear caches
  memberCache.clear();
  
  // Clear members file
  if (tempDir) {
    try {
      const membersFile = path.join(tempDir, "members.json");
      const membersLockFile = path.join(tempDir, "members.json.lock");
      await fs.unlink(membersLockFile).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 50));
      await fs.writeFile(membersFile, JSON.stringify([], null, 2)).catch(() => {});
    } catch {
      // ignore errors
    }
  }
});

afterEach(async () => {
  memberCache.clear();
  
  if (!tempDir) return;
  try {
    const membersLockFile = path.join(tempDir, "members.json.lock");
    await fs.unlink(membersLockFile).catch(() => {});
  } catch {
    // ignore cleanup errors
  }
});

afterAll(async () => {
  // Restore environment
  if (originalDataDir !== undefined) {
    process.env.DATA_DIR = originalDataDir;
  } else {
    delete process.env.DATA_DIR;
  }
  
  if (originalJwtSecret !== undefined) {
    process.env.JWT_SECRET = originalJwtSecret;
  } else {
    delete process.env.JWT_SECRET;
  }
  
  // Clean up
  if (tempDir) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
});

describe("Authentication Flow Integration Tests (Phase 1)", () => {
  describe("Complete Sign Up Flow", () => {
    it("should create account, send verification email, and allow sign in after verification", async () => {
      // Step 1: Sign up
      const signupResult = await signUp({
        firstName: "Flow",
        lastName: "Test",
        email: "flow@example.com",
        phone: "401-555-6666",
        password: "FlowPass123",
      });
      
      expect(signupResult.member).toBeDefined();
      expect(signupResult.member.emailVerified).toBe(false);
      expect(signupResult.verificationToken).toBeDefined();
      
      // Step 2: Verify email
      const verifyResult = await verifyEmail(signupResult.verificationToken);
      expect(verifyResult.success).toBe(true);
      
      // Step 3: Sign in
      const signinResult = await signIn({
        email: "flow@example.com",
        password: "FlowPass123",
      });
      
      expect(signinResult.member.email).toBe("flow@example.com");
      expect(signinResult.token).toBeDefined();
    });

    it("should reject duplicate email signup", async () => {
      await signUp({
        firstName: "First",
        lastName: "User",
        email: "duplicate@example.com",
        phone: "401-555-7777",
        password: "FirstPass123",
      });
      
      await expect(
        signUp({
          firstName: "Second",
          lastName: "User",
          email: "duplicate@example.com",
          phone: "401-555-8888",
          password: "SecondPass123",
        })
      ).rejects.toThrow(EmailAlreadyExistsError);
    });

    it("should reject signup with weak password", async () => {
      await expect(
        signUp({
          firstName: "Weak",
          lastName: "Password",
          email: "weak@example.com",
          phone: "401-555-9999",
          password: "weak",
        })
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe("Sign In Flow", () => {
    beforeEach(async () => {
      // Create a test user
      await signUp({
        firstName: "SignIn",
        lastName: "Test",
        email: "signin@example.com",
        phone: "401-555-0001",
        password: "SignInPass123",
      });
    });

    it("should sign in with correct credentials", async () => {
      const result = await signIn({
        email: "signin@example.com",
        password: "SignInPass123",
      });
      
      expect(result.member.email).toBe("signin@example.com");
      expect(result.token).toBeDefined();
    });

    it("should reject sign in with wrong password", async () => {
      await expect(
        signIn({
          email: "signin@example.com",
          password: "WrongPassword123",
        })
      ).rejects.toThrow(AuthenticationError);
    });

    it("should reject sign in with non-existent email", async () => {
      await expect(
        signIn({
          email: "nonexistent@example.com",
          password: "SomePass123",
        })
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe("Email Verification Flow", () => {
    it("should verify email with valid token", async () => {
      const signupResult = await signUp({
        firstName: "Verify",
        lastName: "Email",
        email: "verifyemail@example.com",
        phone: "401-555-0002",
        password: "VerifyPass123",
      });
      
      const result = await verifyEmail(signupResult.verificationToken);
      
      expect(result.success).toBe(true);
    });

    it("should reject verification with invalid token", async () => {
      await expect(verifyEmail("invalid-token")).rejects.toThrow();
    });

    it("should reject verification with already used token", async () => {
      const signupResult = await signUp({
        firstName: "Double",
        lastName: "Verify",
        email: "doubleverify@example.com",
        phone: "401-555-0003",
        password: "DoublePass123",
      });
      
      // First verification should succeed
      await verifyEmail(signupResult.verificationToken);
      
      // Second verification should fail
      await expect(verifyEmail(signupResult.verificationToken)).rejects.toThrow();
    });
  });

  describe("Password Reset Flow", () => {
    beforeEach(async () => {
      // Create a test user
      await signUp({
        firstName: "Reset",
        lastName: "Password",
        email: "resetflow@example.com",
        phone: "401-555-0004",
        password: "OldPassword123",
      });
    });

    it("should complete password reset flow", async () => {
      // Step 1: Request password reset
      const resetRequest = await requestPasswordReset("resetflow@example.com");
      expect(resetRequest.success).toBe(true);
      
      // Step 2: Get reset token (in real app, from email)
      const { createResetToken } = await import("../../src/lib/auth/password-reset");
      const resetToken = createResetToken("resetflow@example.com");
      
      // Step 3: Reset password
      const resetResult = await resetPassword(resetToken, "NewPassword123");
      expect(resetResult.success).toBe(true);
      
      // Step 4: Sign in with new password
      const signinResult = await signIn({
        email: "resetflow@example.com",
        password: "NewPassword123",
      });
      
      expect(signinResult.member.email).toBe("resetflow@example.com");
    });

    it("should reject reset with invalid token", async () => {
      await expect(
        resetPassword("invalid-token", "NewPassword123")
      ).rejects.toThrow();
    });

    it("should reject reset with weak password", async () => {
      const { createResetToken } = await import("../../src/lib/auth/password-reset");
      const resetToken = createResetToken("resetflow@example.com");
      
      await expect(
        resetPassword(resetToken, "weak")
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe("Get Current Member", () => {
    let memberId: string;

    beforeEach(async () => {
      const signupResult = await signUp({
        firstName: "Current",
        lastName: "Member",
        email: "current@example.com",
        phone: "401-555-0005",
        password: "CurrentPass123",
      });
      
      memberId = signupResult.member.id;
    });

    it("should get current member by ID", async () => {
      const member = await getCurrentMember(memberId);
      
      expect(member.id).toBe(memberId);
      expect(member.email).toBe("current@example.com");
      expect(member.firstName).toBe("Current");
    });
  });
});
