/**
 * Integration tests for member error handling
 * Tests all custom error types and their proper handling in the API
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import app from "../../src/app";
import { memberCache } from "../../src/lib/cache/member-cache";
import {
  MemberNotFoundError,
  DuplicateEmailError,
  DuplicateMemberNumberError,
  InvalidMemberStatusError,
  MemberValidationError,
  MemberLockError,
} from "../../src/lib/errors/member-errors";

let tempDir = "";
let originalDataDir: string | undefined;

beforeAll(async () => {
  // Save original DATA_DIR
  originalDataDir = process.env.DATA_DIR;
  
  // Create unique temp directory for this test file
  const baseDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `pta-errors-${Date.now()}-${Math.random().toString(36).substring(7)}-`)
  );
  tempDir = baseDir;
  process.env.DATA_DIR = tempDir;
  // Ensure directory exists
  await fs.mkdir(tempDir, { recursive: true });
});

beforeEach(async () => {
  // Clear caches before each test
  memberCache.clear();
  
  // Ensure clean state - clear members file
  if (tempDir) {
    try {
      const membersFile = path.join(tempDir, "members.json");
      const membersLockFile = path.join(tempDir, "members.json.lock");
      
      // Remove lock files if they exist
      await fs.unlink(membersLockFile).catch(() => {});
      
      // Wait a bit for locks to release
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Clear file
      await fs.writeFile(membersFile, JSON.stringify([], null, 2)).catch(() => {});
    } catch {
      // ignore errors
    }
  }
});

afterEach(async () => {
  // Clear caches after each test
  memberCache.clear();
  
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
  // Restore original DATA_DIR
  if (originalDataDir !== undefined) {
    process.env.DATA_DIR = originalDataDir;
  } else {
    delete process.env.DATA_DIR;
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

describe("Member Error Handling Integration Tests", () => {
  describe("MemberNotFoundError", () => {
    it("should return 404 when getting non-existent member", async () => {
      const response = await request(app)
        .get("/api/members/non-existent-id");

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should return 404 when updating non-existent member", async () => {
      const response = await request(app)
        .put("/api/members/non-existent-id")
        .send({ firstName: "Updated" });

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should return 404 when patching non-existent member", async () => {
      const response = await request(app)
        .patch("/api/members/non-existent-id")
        .send({ firstName: "Updated" });

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should return 404 when deleting non-existent member", async () => {
      const response = await request(app)
        .delete("/api/members/non-existent-id");

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should return 404 when getting reservations for non-existent member", async () => {
      const response = await request(app)
        .get("/api/members/non-existent-id/reservations");

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("NOT_FOUND");
    });
  });

  describe("DuplicateEmailError", () => {
    it("should return 409 when creating member with duplicate email", async () => {
      const uniqueId = Date.now();
      const email = `duplicate-${uniqueId}@example.com`;

      // Create first member
      await request(app)
        .post("/api/members")
        .send({
          firstName: "First",
          lastName: "User",
          email: email,
          phone: "401-555-1111",
        });

      // Try to create second member with same email
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Second",
          lastName: "User",
          email: email,
          phone: "401-555-2222",
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("DUPLICATE_EMAIL");
      expect(response.body.error).toContain(email);
    });

    it("should return 409 when updating member to duplicate email", async () => {
      const uniqueId = Date.now();
      const email1 = `update-dup1-${uniqueId}@example.com`;
      const email2 = `update-dup2-${uniqueId}@example.com`;

      // Create first member
      const member1 = await request(app)
        .post("/api/members")
        .send({
          firstName: "First",
          lastName: "User",
          email: email1,
          phone: "401-555-1111",
        });

      // Create second member
      const member2 = await request(app)
        .post("/api/members")
        .send({
          firstName: "Second",
          lastName: "User",
          email: email2,
          phone: "401-555-2222",
        });

      // Try to update second member to first member's email
      const response = await request(app)
        .put(`/api/members/${member2.body.id}`)
        .send({
          email: email1,
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("DUPLICATE_EMAIL");
    });

    it("should be case-insensitive for duplicate email detection", async () => {
      const uniqueId = Date.now();
      const email = `case-${uniqueId}@example.com`;

      // Create first member with lowercase email
      await request(app)
        .post("/api/members")
        .send({
          firstName: "First",
          lastName: "User",
          email: email.toLowerCase(),
          phone: "401-555-1111",
        });

      // Try to create second member with uppercase email
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Second",
          lastName: "User",
          email: email.toUpperCase(),
          phone: "401-555-2222",
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe("DUPLICATE_EMAIL");
    });
  });

  describe("DuplicateMemberNumberError", () => {
    it("should return 409 when creating member with duplicate member number", async () => {
      const uniqueId = Date.now();
      const memberNumber = `MEM-TEST-${uniqueId}`;

      // Create first member with specific member number
      await request(app)
        .post("/api/members")
        .send({
          firstName: "First",
          lastName: "User",
          email: `first-${uniqueId}@example.com`,
          phone: "401-555-1111",
          memberNumber: memberNumber,
        });

      // Try to create second member with same member number
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Second",
          lastName: "User",
          email: `second-${uniqueId}@example.com`,
          phone: "401-555-2222",
          memberNumber: memberNumber,
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("DUPLICATE_MEMBER_NUMBER");
      expect(response.body.error).toContain(memberNumber);
    });

    it("should return 409 when updating member to duplicate member number", async () => {
      const uniqueId = Date.now();
      const memberNumber1 = `MEM-UPDATE1-${uniqueId}`;
      const memberNumber2 = `MEM-UPDATE2-${uniqueId}`;

      // Create first member
      const member1 = await request(app)
        .post("/api/members")
        .send({
          firstName: "First",
          lastName: "User",
          email: `first-${uniqueId}@example.com`,
          phone: "401-555-1111",
          memberNumber: memberNumber1,
        });

      // Create second member
      const member2 = await request(app)
        .post("/api/members")
        .send({
          firstName: "Second",
          lastName: "User",
          email: `second-${uniqueId}@example.com`,
          phone: "401-555-2222",
          memberNumber: memberNumber2,
        });

      // Try to update second member to first member's number
      const response = await request(app)
        .put(`/api/members/${member2.body.id}`)
        .send({
          memberNumber: memberNumber1,
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("DUPLICATE_MEMBER_NUMBER");
    });
  });

  describe("InvalidMemberStatusError", () => {
    it("should return 400 when inactive member tries to create reservation", async () => {
      const uniqueId = Date.now();
      const uniqueDate = `2026-05-${String(1 + (uniqueId % 28)).padStart(2, '0')}`;
      const uniqueHour = 10 + Math.floor((uniqueId / 100) % 5);

      // Create inactive member
      const member = await request(app)
        .post("/api/members")
        .send({
          firstName: "Inactive",
          lastName: "Member",
          email: `inactive-${uniqueId}@example.com`,
          phone: "401-555-1111",
          isActive: false,
        });

      // Try to create reservation with inactive member
      const response = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: {
            start: `${String(uniqueHour).padStart(2, '0')}:00`,
            end: `${String(uniqueHour + 1).padStart(2, '0')}:00`,
          },
          memberId: member.body.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("INVALID_STATUS");
      expect(response.body.error).toContain("inactive");
    });
  });

  describe("MemberValidationError", () => {
    it("should return 400 when creating member with missing required fields", async () => {
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          // Missing lastName, email, phone
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it("should return 400 when creating member with invalid email format", async () => {
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: "invalid-email",
          phone: "401-555-1111",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when updating member with invalid data", async () => {
      const uniqueId = Date.now();

      // Create member
      const member = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: `test-${uniqueId}@example.com`,
          phone: "401-555-1111",
        });

      // Try to update with invalid email
      const response = await request(app)
        .put(`/api/members/${member.body.id}`)
        .send({
          email: "invalid-email-format",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe("Error Response Format", () => {
    it("should include error code in response", async () => {
      const response = await request(app)
        .get("/api/members/non-existent-id");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("code");
      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should include error message in response", async () => {
      const uniqueId = Date.now();
      const email = `format-${uniqueId}@example.com`;

      // Create first member
      await request(app)
        .post("/api/members")
        .send({
          firstName: "First",
          lastName: "User",
          email: email,
          phone: "401-555-1111",
        });

      // Try duplicate
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Second",
          lastName: "User",
          email: email,
          phone: "401-555-2222",
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("code");
      expect(typeof response.body.error).toBe("string");
      expect(response.body.error.length).toBeGreaterThan(0);
    });
  });

  describe("Error Type Hierarchy", () => {
    it("should have proper error codes for all error types", () => {
      const notFound = new MemberNotFoundError();
      const duplicateEmail = new DuplicateEmailError();
      const duplicateNumber = new DuplicateMemberNumberError();
      const invalidStatus = new InvalidMemberStatusError();
      const validation = new MemberValidationError();
      const lock = new MemberLockError();

      expect(notFound.code).toBe("NOT_FOUND");
      expect(duplicateEmail.code).toBe("DUPLICATE_EMAIL");
      expect(duplicateNumber.code).toBe("DUPLICATE_MEMBER_NUMBER");
      expect(invalidStatus.code).toBe("INVALID_STATUS");
      expect(validation.code).toBe("VALIDATION_ERROR");
      expect(lock.code).toBe("LOCK_ERROR");
    });

    it("should have proper error names", () => {
      const notFound = new MemberNotFoundError();
      const duplicateEmail = new DuplicateEmailError();
      const duplicateNumber = new DuplicateMemberNumberError();
      const invalidStatus = new InvalidMemberStatusError();
      const validation = new MemberValidationError();
      const lock = new MemberLockError();

      expect(notFound.name).toBe("MemberNotFoundError");
      expect(duplicateEmail.name).toBe("DuplicateEmailError");
      expect(duplicateNumber.name).toBe("DuplicateMemberNumberError");
      expect(invalidStatus.name).toBe("InvalidMemberStatusError");
      expect(validation.name).toBe("MemberValidationError");
      expect(lock.name).toBe("MemberLockError");
    });
  });

  describe("HTTP Status Code Mapping", () => {
    it("should return 404 for MemberNotFoundError", async () => {
      const response = await request(app)
        .get("/api/members/non-existent");

      expect(response.status).toBe(404);
      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should return 409 for DuplicateEmailError", async () => {
      const uniqueId = Date.now();
      const email = `status-${uniqueId}@example.com`;

      await request(app)
        .post("/api/members")
        .send({
          firstName: "First",
          lastName: "User",
          email: email,
          phone: "401-555-1111",
        });

      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Second",
          lastName: "User",
          email: email,
          phone: "401-555-2222",
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe("DUPLICATE_EMAIL");
    });

    it("should return 409 for DuplicateMemberNumberError", async () => {
      const uniqueId = Date.now();
      const memberNumber = `MEM-STATUS-${uniqueId}`;

      await request(app)
        .post("/api/members")
        .send({
          firstName: "First",
          lastName: "User",
          email: `first-${uniqueId}@example.com`,
          phone: "401-555-1111",
          memberNumber: memberNumber,
        });

      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Second",
          lastName: "User",
          email: `second-${uniqueId}@example.com`,
          phone: "401-555-2222",
          memberNumber: memberNumber,
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe("DUPLICATE_MEMBER_NUMBER");
    });

    it("should return 400 for InvalidMemberStatusError", async () => {
      const uniqueId = Date.now();
      const uniqueDate = `2026-05-${String(1 + (uniqueId % 28)).padStart(2, '0')}`;
      const uniqueHour = 10 + Math.floor((uniqueId / 100) % 5);

      const member = await request(app)
        .post("/api/members")
        .send({
          firstName: "Inactive",
          lastName: "Member",
          email: `inactive-status-${uniqueId}@example.com`,
          phone: "401-555-1111",
          isActive: false,
        });

      const response = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: {
            start: `${String(uniqueHour).padStart(2, '0')}:00`,
            end: `${String(uniqueHour + 1).padStart(2, '0')}:00`,
          },
          memberId: member.body.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("INVALID_STATUS");
    });

    it("should return 400 for MemberValidationError", async () => {
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: "invalid-email-format",
          phone: "401-555-1111",
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_ERROR");
    });
  });
});
