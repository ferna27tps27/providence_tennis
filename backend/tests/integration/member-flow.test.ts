/**
 * Integration tests for the complete member management flow
 * Tests the end-to-end functionality including CRUD operations,
 * filtering, search, status management, and error handling
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

beforeAll(async () => {
  // Save original DATA_DIR
  originalDataDir = process.env.DATA_DIR;
  
  // Create unique temp directory for this test file
  const baseDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `pta-member-flow-${Date.now()}-${Math.random().toString(36).substring(7)}-`)
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
  
  // Ensure clean state - clear members and reservations files
  if (tempDir) {
    try {
      const membersFile = path.join(tempDir, "members.json");
      const membersLockFile = path.join(tempDir, "members.json.lock");
      const reservationsFile = path.join(tempDir, "reservations.json");
      const reservationsLockFile = path.join(tempDir, "reservations.json.lock");
      
      // Remove lock files if they exist
      await fs.unlink(membersLockFile).catch(() => {});
      await fs.unlink(reservationsLockFile).catch(() => {});
      
      // Wait a bit for locks to release
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Clear files
      await fs.writeFile(membersFile, JSON.stringify([], null, 2)).catch(() => {});
      await fs.writeFile(reservationsFile, JSON.stringify([], null, 2)).catch(() => {});
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
    const reservationsLockFile = path.join(tempDir, "reservations.json.lock");
    await fs.unlink(membersLockFile).catch(() => {});
    await fs.unlink(reservationsLockFile).catch(() => {});
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

describe("Member Flow Integration Tests", () => {
  describe("Member CRUD Operations", () => {
    it("should create, read, update, and delete a member", async () => {
      const uniqueId = Date.now();
      
      // CREATE
      const createResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Integration",
          lastName: "Test",
          email: `integration-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.id).toBeDefined();
      expect(createResponse.body.memberNumber).toMatch(/^MEM-\d{4}$/);
      expect(createResponse.body.firstName).toBe("Integration");
      expect(createResponse.body.isActive).toBe(true);

      const memberId = createResponse.body.id;

      // READ
      const getResponse = await request(app).get(`/api/members/${memberId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.id).toBe(memberId);
      expect(getResponse.body.firstName).toBe("Integration");

      // UPDATE
      const updateResponse = await request(app)
        .put(`/api/members/${memberId}`)
        .send({
          firstName: "Updated",
          notes: "Integration test notes",
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.firstName).toBe("Updated");
      expect(updateResponse.body.notes).toBe("Integration test notes");

      // DELETE (soft delete)
      const deleteResponse = await request(app).delete(`/api/members/${memberId}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify member is inactive but still accessible
      const getAfterDeleteResponse = await request(app).get(`/api/members/${memberId}`);
      expect(getAfterDeleteResponse.status).toBe(200);
      expect(getAfterDeleteResponse.body.isActive).toBe(false);
    });

    it("should handle partial updates with PATCH", async () => {
      const uniqueId = Date.now();
      
      const createResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Patch",
          lastName: "Test",
          email: `patch-${uniqueId}@example.com`,
          phone: "401-555-1111",
          isActive: true,
        });

      const memberId = createResponse.body.id;

      // PATCH to change status only
      const patchResponse = await request(app)
        .patch(`/api/members/${memberId}`)
        .send({
          isActive: false,
        });

      expect(patchResponse.status).toBe(200);
      expect(patchResponse.body.isActive).toBe(false);
      expect(patchResponse.body.firstName).toBe("Patch"); // Other fields unchanged
    });
  });

  describe("Member Filtering and Search", () => {
    it("should filter members by active/inactive status", async () => {
      const uniqueId = Date.now();
      
      // Create active members
      await request(app)
        .post("/api/members")
        .send({
          firstName: "Active1",
          lastName: "Member",
          email: `active1-${uniqueId}@example.com`,
          phone: "401-555-1111",
          isActive: true,
        });

      await request(app)
        .post("/api/members")
        .send({
          firstName: "Active2",
          lastName: "Member",
          email: `active2-${uniqueId}@example.com`,
          phone: "401-555-2222",
          isActive: true,
        });

      // Create inactive member
      await request(app)
        .post("/api/members")
        .send({
          firstName: "Inactive",
          lastName: "Member",
          email: `inactive-${uniqueId}@example.com`,
          phone: "401-555-3333",
          isActive: false,
        });

      // Test active filter
      const activeResponse = await request(app).get("/api/members?filter=active");
      expect(activeResponse.status).toBe(200);
      expect(activeResponse.body.length).toBe(2);
      expect(activeResponse.body.every((m: any) => m.isActive === true)).toBe(true);

      // Test inactive filter
      const inactiveResponse = await request(app).get("/api/members?filter=inactive");
      expect(inactiveResponse.status).toBe(200);
      expect(inactiveResponse.body.length).toBe(1);
      expect(inactiveResponse.body[0].isActive).toBe(false);

      // Test all filter
      const allResponse = await request(app).get("/api/members?filter=all");
      expect(allResponse.status).toBe(200);
      expect(allResponse.body.length).toBe(3);
    });

    it("should search members by name, email, phone, or member number", async () => {
      const uniqueId = Date.now();
      
      await request(app)
        .post("/api/members")
        .send({
          firstName: "Searchable",
          lastName: "User",
          email: `searchable-${uniqueId}@example.com`,
          phone: "401-555-1111",
        });

      await request(app)
        .post("/api/members")
        .send({
          firstName: "Other",
          lastName: "Person",
          email: `other-${uniqueId}@example.com`,
          phone: "401-555-2222",
        });

      // Search by first name
      const nameResponse = await request(app).get("/api/members?search=Searchable");
      expect(nameResponse.status).toBe(200);
      expect(nameResponse.body.length).toBe(1);
      expect(nameResponse.body[0].firstName).toBe("Searchable");

      // Search by email
      const emailResponse = await request(app).get(`/api/members?search=searchable-${uniqueId}`);
      expect(emailResponse.status).toBe(200);
      expect(emailResponse.body.length).toBe(1);

      // Search by phone
      const phoneResponse = await request(app).get("/api/members?search=401-555-1111");
      expect(phoneResponse.status).toBe(200);
      expect(phoneResponse.body.length).toBe(1);
    });

    it("should combine filter and search", async () => {
      const uniqueId = Date.now();
      
      await request(app)
        .post("/api/members")
        .send({
          firstName: "Active",
          lastName: "Searchable",
          email: `active-search-${uniqueId}@example.com`,
          phone: "401-555-1111",
          isActive: true,
        });

      await request(app)
        .post("/api/members")
        .send({
          firstName: "Inactive",
          lastName: "Searchable",
          email: `inactive-search-${uniqueId}@example.com`,
          phone: "401-555-2222",
          isActive: false,
        });

      const response = await request(app).get("/api/members?filter=active&search=Searchable");
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].isActive).toBe(true);
      expect(response.body[0].lastName).toBe("Searchable");
    });
  });

  describe("Member Validation and Error Handling", () => {
    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Incomplete",
          // Missing lastName, email, phone
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Missing required fields");
    });

    it("should return 409 for duplicate email", async () => {
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

      // Try to create duplicate
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

    it("should return 404 for non-existent member", async () => {
      const response = await request(app).get("/api/members/non-existent-id");
      
      expect(response.status).toBe(404);
      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should return 400 for invalid update data", async () => {
      const uniqueId = Date.now();
      
      const createResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Update",
          lastName: "Test",
          email: `update-${uniqueId}@example.com`,
          phone: "401-555-1111",
        });

      const memberId = createResponse.body.id;

      // Try to update with empty data
      const response = await request(app)
        .put(`/api/members/${memberId}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("No update data provided");
    });

    it("should return 409 for duplicate email on update", async () => {
      const uniqueId = Date.now();
      
      const member1 = await request(app)
        .post("/api/members")
        .send({
          firstName: "First",
          lastName: "User",
          email: `first-${uniqueId}@example.com`,
          phone: "401-555-1111",
        });

      const member2 = await request(app)
        .post("/api/members")
        .send({
          firstName: "Second",
          lastName: "User",
          email: `second-${uniqueId}@example.com`,
          phone: "401-555-2222",
        });

      const response = await request(app)
        .put(`/api/members/${member2.body.id}`)
        .send({
          email: `first-${uniqueId}@example.com`,
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe("DUPLICATE_EMAIL");
    });
  });

  describe("Member Status Management", () => {
    it("should create member as active by default", async () => {
      const uniqueId = Date.now();
      
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Default",
          lastName: "Status",
          email: `default-${uniqueId}@example.com`,
          phone: "401-555-1111",
        });

      expect(response.status).toBe(201);
      expect(response.body.isActive).toBe(true);
    });

    it("should allow creating inactive member", async () => {
      const uniqueId = Date.now();
      
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Inactive",
          lastName: "Member",
          email: `inactive-${uniqueId}@example.com`,
          phone: "401-555-1111",
          isActive: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.isActive).toBe(false);
    });

    it("should allow changing member status", async () => {
      const uniqueId = Date.now();
      
      const createResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Status",
          lastName: "Change",
          email: `status-${uniqueId}@example.com`,
          phone: "401-555-1111",
          isActive: true,
        });

      const memberId = createResponse.body.id;

      // Deactivate
      const deactivateResponse = await request(app)
        .patch(`/api/members/${memberId}`)
        .send({ isActive: false });

      expect(deactivateResponse.status).toBe(200);
      expect(deactivateResponse.body.isActive).toBe(false);

      // Reactivate
      const reactivateResponse = await request(app)
        .patch(`/api/members/${memberId}`)
        .send({ isActive: true });

      expect(reactivateResponse.status).toBe(200);
      expect(reactivateResponse.body.isActive).toBe(true);
    });
  });

  describe("Member Number Generation", () => {
    it("should auto-generate sequential member numbers", async () => {
      const uniqueId = Date.now();
      
      const member1 = await request(app)
        .post("/api/members")
        .send({
          firstName: "First",
          lastName: "Member",
          email: `first-${uniqueId}@example.com`,
          phone: "401-555-1111",
        });

      const member2 = await request(app)
        .post("/api/members")
        .send({
          firstName: "Second",
          lastName: "Member",
          email: `second-${uniqueId}@example.com`,
          phone: "401-555-2222",
        });

      expect(member1.body.memberNumber).toBe("MEM-0001");
      expect(member2.body.memberNumber).toBe("MEM-0002");
    });

    it("should use provided member number if given", async () => {
      const uniqueId = Date.now();
      
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Custom",
          lastName: "Number",
          email: `custom-${uniqueId}@example.com`,
          phone: "401-555-1111",
          memberNumber: "CUSTOM-001",
        });

      expect(response.status).toBe(201);
      expect(response.body.memberNumber).toBe("CUSTOM-001");
    });
  });

  describe("Email Normalization", () => {
    it("should normalize email to lowercase", async () => {
      const uniqueId = Date.now();
      
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Email",
          lastName: "Test",
          email: `TEST-${uniqueId}@EXAMPLE.COM`,
          phone: "401-555-1111",
        });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe(`test-${uniqueId}@example.com`);
    });

    it("should handle case-insensitive duplicate detection", async () => {
      const uniqueId = Date.now();
      const baseEmail = `case-${uniqueId}@example.com`;
      
      // Create member with lowercase email
      await request(app)
        .post("/api/members")
        .send({
          firstName: "First",
          lastName: "User",
          email: baseEmail,
          phone: "401-555-1111",
        });

      // Try to create with uppercase email
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Second",
          lastName: "User",
          email: baseEmail.toUpperCase(),
          phone: "401-555-2222",
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe("DUPLICATE_EMAIL");
    });
  });

  describe("Member Reservations Endpoint", () => {
    it("should return empty array for member with no reservations", async () => {
      const uniqueId = Date.now();
      
      const memberResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "No",
          lastName: "Reservations",
          email: `no-res-${uniqueId}@example.com`,
          phone: "401-555-1111",
        });

      const memberId = memberResponse.body.id;

      const response = await request(app)
        .get(`/api/members/${memberId}/reservations`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it("should return 404 for non-existent member", async () => {
      const response = await request(app)
        .get("/api/members/non-existent-id/reservations");

      expect(response.status).toBe(404);
      expect(response.body.code).toBe("NOT_FOUND");
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent member creation requests", async () => {
      const uniqueId = Date.now();
      const promises = [];

      // Create 5 members concurrently
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post("/api/members")
            .send({
              firstName: `Concurrent${i}`,
              lastName: "Test",
              email: `concurrent-${uniqueId}-${i}@example.com`,
              phone: `401-555-${1000 + i}`,
            })
        );
      }

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.status).toBe(201);
        expect(result.body.id).toBeDefined();
      });

      // Verify all members were created
      const listResponse = await request(app).get("/api/members");
      expect(listResponse.body.length).toBe(5);
    });
  });

  describe("Complete Member Lifecycle", () => {
    it("should handle complete member lifecycle: create, update, deactivate, reactivate, delete", async () => {
      const uniqueId = Date.now();
      
      // 1. CREATE
      const createResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Lifecycle",
          lastName: "Test",
          email: `lifecycle-${uniqueId}@example.com`,
          phone: "401-555-1234",
          dateOfBirth: "1990-01-15",
          gender: "Male",
          address: "123 Main St",
        });

      expect(createResponse.status).toBe(201);
      const memberId = createResponse.body.id;
      expect(createResponse.body.isActive).toBe(true);

      // 2. UPDATE
      const updateResponse = await request(app)
        .put(`/api/members/${memberId}`)
        .send({
          notes: "Lifecycle test notes",
          ntrpRating: "4.5",
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.notes).toBe("Lifecycle test notes");
      expect(updateResponse.body.ntrpRating).toBe("4.5");

      // 3. DEACTIVATE
      const deactivateResponse = await request(app)
        .patch(`/api/members/${memberId}`)
        .send({ isActive: false });

      expect(deactivateResponse.status).toBe(200);
      expect(deactivateResponse.body.isActive).toBe(false);

      // Verify filtered list
      const activeListResponse = await request(app).get("/api/members?filter=active");
      expect(activeListResponse.body.find((m: any) => m.id === memberId)).toBeUndefined();

      const inactiveListResponse = await request(app).get("/api/members?filter=inactive");
      expect(inactiveListResponse.body.find((m: any) => m.id === memberId)).toBeDefined();

      // 4. REACTIVATE
      const reactivateResponse = await request(app)
        .patch(`/api/members/${memberId}`)
        .send({ isActive: true });

      expect(reactivateResponse.status).toBe(200);
      expect(reactivateResponse.body.isActive).toBe(true);

      // 5. DELETE (soft delete)
      const deleteResponse = await request(app).delete(`/api/members/${memberId}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify member is still accessible but inactive
      const finalGetResponse = await request(app).get(`/api/members/${memberId}`);
      expect(finalGetResponse.status).toBe(200);
      expect(finalGetResponse.body.isActive).toBe(false);
    });
  });
});
