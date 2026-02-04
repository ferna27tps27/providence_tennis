/**
 * Integration tests for authentication API endpoints (Phase 1)
 * Verifies all auth endpoints work correctly
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import app from "../../src/app";
import { memberCache } from "../../src/lib/cache/member-cache";
import { reservationCache } from "../../src/lib/cache/reservation-cache";

let tempDir = "";
let originalDataDir: string | undefined;
let originalJwtSecret: string | undefined;
let originalFrontendUrl: string | undefined;

beforeAll(async () => {
  // Save original environment variables
  originalDataDir = process.env.DATA_DIR;
  originalJwtSecret = process.env.JWT_SECRET;
  originalFrontendUrl = process.env.FRONTEND_URL;
  
  // Set test environment
  process.env.JWT_SECRET = "test-secret-key-for-testing-only";
  process.env.FRONTEND_URL = "http://localhost:3009";
  process.env.BCRYPT_ROUNDS = "10";
  
  // Create unique temp directory for this test file
  const baseDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `pta-auth-${Date.now()}-${Math.random().toString(36).substring(7)}-`)
  );
  tempDir = baseDir;
  process.env.DATA_DIR = tempDir;
  // Ensure directory exists
  await fs.mkdir(tempDir, { recursive: true });
});

beforeEach(async () => {
  // Clear caches before each test
  memberCache.clear();
  reservationCache.clear();
  
  // Ensure clean state - clear members file
  if (tempDir) {
    try {
      const membersFile = path.join(tempDir, "members.json");
      const membersLockFile = path.join(tempDir, "members.json.lock");
      
      // Remove lock files if they exist
      await fs.unlink(membersLockFile).catch(() => {});
      
      // Wait a bit for locks to release
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Clear files
      await fs.writeFile(membersFile, JSON.stringify([], null, 2)).catch(() => {});
    } catch {
      // ignore errors
    }
  }
});

afterEach(async () => {
  // Clear caches after each test
  memberCache.clear();
  reservationCache.clear();
  
  if (!tempDir) return;
  try {
    // Remove lock files
    const membersLockFile = path.join(tempDir, "members.json.lock");
    await fs.unlink(membersLockFile).catch(() => {});
  } catch {
    // ignore cleanup errors
  }
});

afterAll(async () => {
  // Restore original environment variables
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
  
  if (originalFrontendUrl !== undefined) {
    process.env.FRONTEND_URL = originalFrontendUrl;
  } else {
    delete process.env.FRONTEND_URL;
  }
  
  // Clean up temp directory
  if (tempDir) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
});

describe("Authentication API Endpoints Integration Tests (Phase 1)", () => {
  describe("POST /api/auth/signup", () => {
    it("should create a new member account successfully", async () => {
      const response = await request(app)
        .post("/api/auth/signup")
        .send({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "401-555-1234",
          password: "SecurePass123",
        });
      
      expect(response.status).toBe(201);
      expect(response.body.message).toContain("Account created successfully");
      expect(response.body.member).toBeDefined();
      expect(response.body.member.email).toBe("john@example.com");
      expect(response.body.member.emailVerified).toBe(false);
      expect(response.body.member.role).toBe("player");
    });

    it("should reject signup with missing required fields", async () => {
      const response = await request(app)
        .post("/api/auth/signup")
        .send({
          firstName: "John",
          // Missing lastName, email, phone, password
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Missing required fields");
    });

    it("should reject signup with weak password", async () => {
      const response = await request(app)
        .post("/api/auth/signup")
        .send({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "401-555-1234",
          password: "weak", // Too weak
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Password validation failed");
    });

    it("should reject signup with duplicate email", async () => {
      // Create first account
      await request(app)
        .post("/api/auth/signup")
        .send({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "401-555-1234",
          password: "SecurePass123",
        });
      
      // Try to create duplicate
      const response = await request(app)
        .post("/api/auth/signup")
        .send({
          firstName: "Jane",
          lastName: "Doe",
          email: "john@example.com", // Same email
          phone: "401-555-5678",
          password: "SecurePass456",
        });
      
      expect(response.status).toBe(409);
      expect(response.body.error).toContain("already registered");
    });

    it("should accept custom role", async () => {
      const response = await request(app)
        .post("/api/auth/signup")
        .send({
          firstName: "Coach",
          lastName: "Smith",
          email: "coach@example.com",
          phone: "401-555-9999",
          password: "SecurePass123",
          role: "coach",
        });
      
      expect(response.status).toBe(201);
      expect(response.body.member.role).toBe("coach");
    });
  });

  describe("POST /api/auth/signin", () => {
    let testMember: any;

    beforeEach(async () => {
      // Create a test member
      const signupResponse = await request(app)
        .post("/api/auth/signup")
        .send({
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          phone: "401-555-0000",
          password: "TestPass123",
        });
      
      testMember = signupResponse.body.member;
    });

    it("should sign in with correct credentials", async () => {
      const response = await request(app)
        .post("/api/auth/signin")
        .send({
          email: "test@example.com",
          password: "TestPass123",
        });
      
      expect(response.status).toBe(200);
      expect(response.body.member).toBeDefined();
      expect(response.body.member.email).toBe("test@example.com");
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe("string");
    });

    it("should reject signin with wrong password", async () => {
      const response = await request(app)
        .post("/api/auth/signin")
        .send({
          email: "test@example.com",
          password: "WrongPassword123",
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Invalid email or password");
    });

    it("should reject signin with non-existent email", async () => {
      const response = await request(app)
        .post("/api/auth/signin")
        .send({
          email: "nonexistent@example.com",
          password: "TestPass123",
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Invalid email or password");
    });

    it("should reject signin with missing fields", async () => {
      const response = await request(app)
        .post("/api/auth/signin")
        .send({
          email: "test@example.com",
          // Missing password
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Email and password are required");
    });
  });

  describe("GET /api/auth/me", () => {
    let authToken: string;

    beforeEach(async () => {
      // Create and sign in a user
      await request(app)
        .post("/api/auth/signup")
        .send({
          firstName: "Auth",
          lastName: "Test",
          email: "authtest@example.com",
          phone: "401-555-1111",
          password: "AuthPass123",
        });
      
      const signinResponse = await request(app)
        .post("/api/auth/signin")
        .send({
          email: "authtest@example.com",
          password: "AuthPass123",
        });
      
      authToken = signinResponse.body.token;
    });

    it("should return current user with valid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.email).toBe("authtest@example.com");
      expect(response.body.id).toBeDefined();
    });

    it("should reject request without token", async () => {
      const response = await request(app)
        .get("/api/auth/me");
      
      expect(response.status).toBe(401);
      expect(response.body.error).toContain("No authentication token");
    });

    it("should reject request with invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token");
      
      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Invalid or expired token");
    });
  });

  describe("POST /api/auth/verify-email", () => {
    let verificationToken: string;

    beforeEach(async () => {
      // Sign up a user (this creates a verification token)
      const signupResponse = await request(app)
        .post("/api/auth/signup")
        .send({
          firstName: "Verify",
          lastName: "Test",
          email: "verify@example.com",
          phone: "401-555-2222",
          password: "VerifyPass123",
        });
      
      // Note: In real implementation, token would come from email
      // For testing, we need to get it from the signup response or create it manually
      // For now, we'll test the endpoint with a manually created token
    });

    it("should verify email with valid token", async () => {
      // This test requires access to the token creation function
      // For now, we'll test the endpoint structure
      // In a real scenario, you'd extract the token from the email or signup response
      
      // We'll need to import the email verification module to create a token
      const { createVerificationToken } = await import("../../src/lib/auth/email-verification");
      const token = createVerificationToken("verify@example.com");
      
      const response = await request(app)
        .post("/api/auth/verify-email")
        .send({ token });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should reject verification with invalid token", async () => {
      const response = await request(app)
        .post("/api/auth/verify-email")
        .send({ token: "invalid-token" });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid or expired");
    });

    it("should reject verification with missing token", async () => {
      const response = await request(app)
        .post("/api/auth/verify-email")
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Verification token is required");
    });
  });

  describe("POST /api/auth/forgot-password", () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post("/api/auth/signup")
        .send({
          firstName: "Reset",
          lastName: "Test",
          email: "reset@example.com",
          phone: "401-555-3333",
          password: "ResetPass123",
        });
    });

    it("should accept password reset request", async () => {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "reset@example.com" });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("password reset link");
    });

    it("should accept request even for non-existent email (security)", async () => {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "nonexistent@example.com" });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should not reveal if email exists
    });

    it("should reject request with missing email", async () => {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Email is required");
    });
  });

  describe("POST /api/auth/reset-password", () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post("/api/auth/signup")
        .send({
          firstName: "Reset",
          lastName: "Test",
          email: "resetpass@example.com",
          phone: "401-555-4444",
          password: "OldPass123",
        });
    });

    it("should reset password with valid token", async () => {
      // Create a reset token
      const { createResetToken } = await import("../../src/lib/auth/password-reset");
      const token = createResetToken("resetpass@example.com");
      
      const response = await request(app)
        .post("/api/auth/reset-password")
        .send({
          token,
          newPassword: "NewPass123",
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify new password works
      const signinResponse = await request(app)
        .post("/api/auth/signin")
        .send({
          email: "resetpass@example.com",
          password: "NewPass123",
        });
      
      expect(signinResponse.status).toBe(200);
    });

    it("should reject reset with invalid token", async () => {
      const response = await request(app)
        .post("/api/auth/reset-password")
        .send({
          token: "invalid-token",
          newPassword: "NewPass123",
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid or expired");
    });

    it("should reject reset with weak password", async () => {
      const { createResetToken } = await import("../../src/lib/auth/password-reset");
      const token = createResetToken("resetpass@example.com");
      
      const response = await request(app)
        .post("/api/auth/reset-password")
        .send({
          token,
          newPassword: "weak",
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Password validation failed");
    });

    it("should reject reset with missing fields", async () => {
      const response = await request(app)
        .post("/api/auth/reset-password")
        .send({
          token: "some-token",
          // Missing newPassword
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Token and new password are required");
    });
  });

  describe("POST /api/auth/logout", () => {
    let authToken: string;

    beforeEach(async () => {
      // Create and sign in a user
      await request(app)
        .post("/api/auth/signup")
        .send({
          firstName: "Logout",
          lastName: "Test",
          email: "logout@example.com",
          phone: "401-555-5555",
          password: "LogoutPass123",
        });
      
      const signinResponse = await request(app)
        .post("/api/auth/signin")
        .send({
          email: "logout@example.com",
          password: "LogoutPass123",
        });
      
      authToken = signinResponse.body.token;
    });

    it("should logout successfully", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Logged out successfully");
    });

    it("should reject logout without token", async () => {
      const response = await request(app)
        .post("/api/auth/logout");
      
      expect(response.status).toBe(401);
    });
  });
});
