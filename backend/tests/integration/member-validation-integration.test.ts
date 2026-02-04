/**
 * Integration tests for member validation
 * Tests validation through the API layer to ensure validation
 * works correctly end-to-end
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import app from "../../src/app";
import { memberCache } from "../../src/lib/cache/member-cache";

let tempDir = "";
let originalDataDir: string | undefined;

beforeAll(async () => {
  // Save original DATA_DIR
  originalDataDir = process.env.DATA_DIR;
  
  // Create unique temp directory for this test file
  const baseDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `pta-validation-${Date.now()}-${Math.random().toString(36).substring(7)}-`)
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

describe("Member Validation Integration Tests", () => {
  describe("Email Validation", () => {
    it("should accept valid email addresses", async () => {
      const uniqueId = Date.now();
      const validEmails = [
        `test-${uniqueId}@example.com`,
        `user.name-${uniqueId}@domain.co.uk`,
        `user+tag-${uniqueId}@example.com`,
        `user123-${uniqueId}@test-domain.com`,
      ];

      for (const email of validEmails) {
        const response = await request(app)
          .post("/api/members")
          .send({
            firstName: "Test",
            lastName: "User",
            email: email,
            phone: "401-555-1234",
          });

        expect(response.status).toBe(201);
        expect(response.body.email).toBe(email.toLowerCase()); // Normalized
      }
    });

    it("should reject invalid email addresses", async () => {
      const invalidEmails = [
        "invalid-email",
        "@example.com",
        "user@",
        "user@domain",
        "user @example.com", // Space in email
        "user@example", // Missing TLD
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post("/api/members")
          .send({
            firstName: "Test",
            lastName: "User",
            email: email,
            phone: "401-555-1234",
          });

        expect(response.status).toBe(400);
        // API may return "Missing required fields" for empty email, or validation error for invalid format
        if (email === "") {
          expect(response.body.error).toBeDefined();
        } else {
          expect(response.body.code).toBe("VALIDATION_ERROR");
          expect(response.body.error).toContain("email");
        }
      }
    });

    it("should normalize email to lowercase", async () => {
      const uniqueId = Date.now();
      const mixedCaseEmail = `TestUser-${uniqueId}@Example.COM`;

      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: mixedCaseEmail,
          phone: "401-555-1234",
        });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe(mixedCaseEmail.toLowerCase());
    });

    it("should trim whitespace from email", async () => {
      const uniqueId = Date.now();
      // Email with spaces - validation now normalizes before checking format
      const emailWithSpaces = `  test-${uniqueId}@example.com  `;
      const expectedEmail = emailWithSpaces.trim().toLowerCase();

      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: emailWithSpaces,
          phone: "401-555-1234",
        });

      expect(response.status).toBe(201);
      // Email should be normalized (trimmed and lowercased)
      expect(response.body.email).toBe(expectedEmail);
    });
  });

  describe("Required Fields Validation", () => {
    it("should reject member creation without firstName", async () => {
      const uniqueId = Date.now();
      const response = await request(app)
        .post("/api/members")
        .send({
          lastName: "User",
          email: `test-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it("should reject member creation without lastName", async () => {
      const uniqueId = Date.now();
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          email: `test-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it("should reject member creation without email", async () => {
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          phone: "401-555-1234",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it("should reject member creation without phone", async () => {
      const uniqueId = Date.now();
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: `test-${uniqueId}@example.com`,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it("should reject empty string values for required fields", async () => {
      const uniqueId = Date.now();
      
      // Empty firstName
      const response1 = await request(app)
        .post("/api/members")
        .send({
          firstName: "   ",
          lastName: "User",
          email: `test1-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });
      expect(response1.status).toBe(400);

      // Empty lastName
      const response2 = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "",
          email: `test2-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });
      expect(response2.status).toBe(400);

      // Empty email
      const response3 = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: "   ",
          phone: "401-555-1234",
        });
      expect(response3.status).toBe(400);

      // Empty phone
      const response4 = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: `test4-${uniqueId}@example.com`,
          phone: "",
        });
      expect(response4.status).toBe(400);
    });
  });

  describe("Date of Birth Validation", () => {
    it("should accept valid date of birth format (YYYY-MM-DD)", async () => {
      const uniqueId = Date.now();
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: `test-${uniqueId}@example.com`,
          phone: "401-555-1234",
          dateOfBirth: "1990-01-15",
        });

      expect(response.status).toBe(201);
      expect(response.body.dateOfBirth).toBe("1990-01-15");
    });

    it("should reject invalid date of birth format", async () => {
      const uniqueId = Date.now();
      const invalidDates = [
        "01/15/1990", // Wrong format
        "90-01-15", // Wrong year format
        "invalid-date",
      ];

      for (const date of invalidDates) {
        const uniqueEmail = `test-${uniqueId}-${Date.now()}-${Math.random()}@example.com`;
        const response = await request(app)
          .post("/api/members")
          .send({
            firstName: "Test",
            lastName: "User",
            email: uniqueEmail,
            phone: "401-555-1234",
            dateOfBirth: date,
          });

        expect(response.status).toBe(400);
        expect(response.body.code).toBe("VALIDATION_ERROR");
        expect(response.body.error).toContain("YYYY-MM-DD");
      }
    });

    it("should allow dateOfBirth to be optional", async () => {
      const uniqueId = Date.now();
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: `test-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      expect(response.status).toBe(201);
      expect(response.body.dateOfBirth).toBeUndefined();
    });
  });

  describe("Update Validation", () => {
    it("should validate email format on update", async () => {
      const uniqueId = Date.now();
      
      // Create member
      const member = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: `test-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      // Try to update with invalid email
      const response = await request(app)
        .put(`/api/members/${member.body.id}`)
        .send({
          email: "invalid-email-format",
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_ERROR");
      expect(response.body.error).toContain("email");
    });

    it("should reject empty string values on update", async () => {
      const uniqueId = Date.now();
      
      // Create member
      const member = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: `test-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      // Try to update with empty firstName
      const response1 = await request(app)
        .put(`/api/members/${member.body.id}`)
        .send({
          firstName: "   ",
        });
      expect(response1.status).toBe(400);

      // Try to update with empty lastName
      const response2 = await request(app)
        .put(`/api/members/${member.body.id}`)
        .send({
          lastName: "",
        });
      expect(response2.status).toBe(400);

      // Try to update with empty email
      const response3 = await request(app)
        .put(`/api/members/${member.body.id}`)
        .send({
          email: "   ",
        });
      expect(response3.status).toBe(400);

      // Try to update with empty phone
      const response4 = await request(app)
        .put(`/api/members/${member.body.id}`)
        .send({
          phone: "",
        });
      expect(response4.status).toBe(400);
    });

    it("should reject negative penalty cancellations", async () => {
      const uniqueId = Date.now();
      
      // Create member
      const member = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: `test-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      // Try to update with negative penalty
      const response = await request(app)
        .put(`/api/members/${member.body.id}`)
        .send({
          penaltyCancellations: -1,
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_ERROR");
      expect(response.body.error).toContain("negative");
    });

    it("should accept valid date of birth format on update", async () => {
      const uniqueId = Date.now();
      
      // Create member
      const member = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: `test-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      // Update with valid date
      const response = await request(app)
        .put(`/api/members/${member.body.id}`)
        .send({
          dateOfBirth: "1985-06-20",
        });

      expect(response.status).toBe(200);
      expect(response.body.dateOfBirth).toBe("1985-06-20");
    });

    it("should allow partial updates without validation errors", async () => {
      const uniqueId = Date.now();
      
      // Create member
      const member = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: `test-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      // Update only firstName (partial update)
      const response = await request(app)
        .patch(`/api/members/${member.body.id}`)
        .send({
          firstName: "Updated",
        });

      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe("Updated");
      expect(response.body.lastName).toBe("User"); // Unchanged
    });
  });

  describe("Validation Error Response Format", () => {
    it("should return validation error with proper format", async () => {
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: "invalid-email",
          phone: "401-555-1234",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("code");
      expect(response.body.code).toBe("VALIDATION_ERROR");
      expect(typeof response.body.error).toBe("string");
      expect(response.body.error.length).toBeGreaterThan(0);
    });

    it("should provide specific error messages for different validation failures", async () => {
      const uniqueId = Date.now();
      
      // Missing firstName - API checks required fields first
      const response1 = await request(app)
        .post("/api/members")
        .send({
          lastName: "User",
          email: `test1-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });
      expect(response1.status).toBe(400);
      expect(response1.body.error).toBeDefined();

      // Invalid email - should get validation error
      const response2 = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: "invalid",
          phone: "401-555-1234",
        });
      expect(response2.status).toBe(400);
      expect(response2.body.code).toBe("VALIDATION_ERROR");
      expect(response2.body.error).toContain("email");

      // Invalid date format - should get validation error
      const response3 = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: `test3-${uniqueId}@example.com`,
          phone: "401-555-1234",
          dateOfBirth: "01/15/1990",
        });
      expect(response3.status).toBe(400);
      expect(response3.body.code).toBe("VALIDATION_ERROR");
      expect(response3.body.error).toContain("YYYY-MM-DD");
    });
  });

  describe("Validation Integration with Business Logic", () => {
    it("should prevent invalid data from being stored", async () => {
      const uniqueId = Date.now();
      
      // Try to create with invalid email
      const createResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: "invalid-email",
          phone: "401-555-1234",
        });

      expect(createResponse.status).toBe(400);

      // Verify member was not created
      const listResponse = await request(app)
        .get("/api/members");

      const member = listResponse.body.find((m: any) => m.email === "invalid-email");
      expect(member).toBeUndefined();
    });

    it("should normalize email before storing", async () => {
      const uniqueId = Date.now();
      const mixedCaseEmail = `TestUser-${uniqueId}@Example.COM`;

      const createResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Test",
          lastName: "User",
          email: mixedCaseEmail,
          phone: "401-555-1234",
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.email).toBe(mixedCaseEmail.toLowerCase());

      // Verify stored email is normalized
      const getResponse = await request(app)
        .get(`/api/members/${createResponse.body.id}`);

      expect(getResponse.body.email).toBe(mixedCaseEmail.toLowerCase());
    });

    it("should validate data before checking for duplicates", async () => {
      const uniqueId = Date.now();
      const email = `duplicate-test-${uniqueId}@example.com`;

      // Create first member
      await request(app)
        .post("/api/members")
        .send({
          firstName: "First",
          lastName: "User",
          email: email,
          phone: "401-555-1111",
        });

      // Try to create second with invalid email format (should fail validation before duplicate check)
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Second",
          lastName: "User",
          email: "invalid-email-format",
          phone: "401-555-2222",
        });

      // Should fail with validation error, not duplicate error
      expect(response.status).toBe(400);
      expect(response.body.code).toBe("VALIDATION_ERROR");
    });
  });
});
