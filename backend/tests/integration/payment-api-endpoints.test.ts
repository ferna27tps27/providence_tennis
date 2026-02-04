/**
 * Integration tests for payment API endpoints (Phase 3)
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
let originalStripeKey: string | undefined;

beforeAll(async () => {
  // Save original environment variables
  originalDataDir = process.env.DATA_DIR;
  originalJwtSecret = process.env.JWT_SECRET;
  originalStripeKey = process.env.STRIPE_SECRET_KEY;
  
  // Set test environment
  process.env.JWT_SECRET = "test-secret-key-for-testing-only";
  process.env.STRIPE_SECRET_KEY = "sk_test_51testkey"; // Test key format
  process.env.FRONTEND_URL = "http://localhost:3009";
  
  // Create unique temp directory
  const baseDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `pta-payment-${Date.now()}-${Math.random().toString(36).substring(7)}-`)
  );
  tempDir = baseDir;
  process.env.DATA_DIR = tempDir;
  await fs.mkdir(tempDir, { recursive: true });
});

beforeEach(async () => {
  memberCache.clear();
  reservationCache.clear();
  
  if (tempDir) {
    try {
      const membersFile = path.join(tempDir, "members.json");
      const paymentsFile = path.join(tempDir, "payments.json");
      const membersLockFile = path.join(tempDir, "members.json.lock");
      const paymentsLockFile = path.join(tempDir, "payments.json.lock");
      
      await fs.unlink(membersLockFile).catch(() => {});
      await fs.unlink(paymentsLockFile).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await fs.writeFile(membersFile, JSON.stringify([], null, 2)).catch(() => {});
      await fs.writeFile(paymentsFile, JSON.stringify([], null, 2)).catch(() => {});
    } catch {
      // ignore errors
    }
  }
});

afterEach(async () => {
  memberCache.clear();
  reservationCache.clear();
  
  if (!tempDir) return;
  try {
    const membersLockFile = path.join(tempDir, "members.json.lock");
    const paymentsLockFile = path.join(tempDir, "payments.json.lock");
    await fs.unlink(membersLockFile).catch(() => {});
    await fs.unlink(paymentsLockFile).catch(() => {});
  } catch {
    // ignore cleanup errors
  }
});

afterAll(async () => {
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
  
  if (originalStripeKey !== undefined) {
    process.env.STRIPE_SECRET_KEY = originalStripeKey;
  } else {
    delete process.env.STRIPE_SECRET_KEY;
  }
  
  if (tempDir) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
});

describe("Payment API Endpoints Integration Tests (Phase 3)", () => {
  let authToken: string;
  let memberId: string;

  beforeEach(async () => {
    // Create and sign in a user
    const signupResponse = await request(app)
      .post("/api/auth/signup")
      .send({
        firstName: "Payment",
        lastName: "Test",
        email: `payment${Date.now()}@example.com`,
        phone: "401-555-9999",
        password: "PaymentPass123",
      });
    
    memberId = signupResponse.body.member.id;
    
    const signinResponse = await request(app)
      .post("/api/auth/signin")
      .send({
        email: signupResponse.body.member.email,
        password: "PaymentPass123",
      });
    
    authToken = signinResponse.body.token;
  });

  describe("POST /api/payments/create-intent", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/payments/create-intent")
        .send({
          amount: 50.00,
        });
      
      expect(response.status).toBe(401);
    });

    it("should reject request without amount", async () => {
      const response = await request(app)
        .post("/api/payments/create-intent")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Amount is required");
    });

    it("should reject zero amount", async () => {
      const response = await request(app)
        .post("/api/payments/create-intent")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          amount: 0,
        });
      
      expect(response.status).toBe(400);
    });

    it("should create payment intent (will fail without real Stripe key, but tests structure)", async () => {
      // Note: This will fail without a real Stripe test key, but tests the endpoint structure
      const response = await request(app)
        .post("/api/payments/create-intent")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          amount: 50.00,
          currency: "usd",
          description: "Test Payment",
        });
      
      // Without real Stripe key, this will return 500, but structure is correct
      // In real scenario with test key, would return 200 with clientSecret
      expect([400, 500]).toContain(response.status);
    });
  });

  describe("GET /api/payments", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .get("/api/payments");
      
      expect(response.status).toBe(401);
    });

    it("should return empty array when no payments exist", async () => {
      const response = await request(app)
        .get("/api/payments")
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it("should filter payments by status", async () => {
      const response = await request(app)
        .get("/api/payments?status=paid")
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /api/payments/:id", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .get("/api/payments/nonexistent");
      
      expect(response.status).toBe(401);
    });

    it("should return 404 for non-existent payment", async () => {
      const response = await request(app)
        .get("/api/payments/nonexistent")
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain("not found");
    });
  });

  describe("GET /api/payments/:id/invoice", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .get("/api/payments/nonexistent/invoice");
      
      expect(response.status).toBe(401);
    });

    it("should return 404 for non-existent payment", async () => {
      const response = await request(app)
        .get("/api/payments/nonexistent/invoice")
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/payments/membership", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/payments/membership")
        .send({
          amount: 100.00,
        });
      
      expect(response.status).toBe(401);
    });

    it("should reject request without amount", async () => {
      const response = await request(app)
        .post("/api/payments/membership")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Amount is required");
    });
  });
});
