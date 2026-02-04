/**
 * Integration tests for all member API endpoints (Phase 7)
 * Verifies all 7 endpoints work correctly according to MVP requirements
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
    path.join(os.tmpdir(), `pta-api-${Date.now()}-${Math.random().toString(36).substring(7)}-`)
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

describe("Member API Endpoints Integration Tests (Phase 7)", () => {
  describe("1. GET /api/members - List all members", () => {
    it("should return empty array when no members exist", async () => {
      const response = await request(app).get("/api/members");
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it("should return all members", async () => {
      const uniqueId = Date.now();
      
      // Create multiple members
      await request(app).post("/api/members").send({
        firstName: "First",
        lastName: "Member",
        email: `first-${uniqueId}@example.com`,
        phone: "401-555-1111",
      });

      await request(app).post("/api/members").send({
        firstName: "Second",
        lastName: "Member",
        email: `second-${uniqueId}@example.com`,
        phone: "401-555-2222",
      });

      const response = await request(app).get("/api/members");
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it("should filter by active status (filter=active)", async () => {
      const uniqueId = Date.now();
      
      await request(app).post("/api/members").send({
        firstName: "Active",
        lastName: "Member",
        email: `active-${uniqueId}@example.com`,
        phone: "401-555-1111",
        isActive: true,
      });

      await request(app).post("/api/members").send({
        firstName: "Inactive",
        lastName: "Member",
        email: `inactive-${uniqueId}@example.com`,
        phone: "401-555-2222",
        isActive: false,
      });

      const response = await request(app).get("/api/members?filter=active");
      
      expect(response.status).toBe(200);
      expect(response.body.every((m: any) => m.isActive === true)).toBe(true);
    });

    it("should filter by inactive status (filter=inactive)", async () => {
      const uniqueId = Date.now();
      
      await request(app).post("/api/members").send({
        firstName: "Active",
        lastName: "Member",
        email: `active-${uniqueId}@example.com`,
        phone: "401-555-1111",
        isActive: true,
      });

      await request(app).post("/api/members").send({
        firstName: "Inactive",
        lastName: "Member",
        email: `inactive-${uniqueId}@example.com`,
        phone: "401-555-2222",
        isActive: false,
      });

      const response = await request(app).get("/api/members?filter=inactive");
      
      expect(response.status).toBe(200);
      expect(response.body.every((m: any) => m.isActive === false)).toBe(true);
    });

    it("should return all members when filter=all", async () => {
      const uniqueId = Date.now();
      
      await request(app).post("/api/members").send({
        firstName: "Active",
        lastName: "Member",
        email: `active-${uniqueId}@example.com`,
        phone: "401-555-1111",
        isActive: true,
      });

      await request(app).post("/api/members").send({
        firstName: "Inactive",
        lastName: "Member",
        email: `inactive-${uniqueId}@example.com`,
        phone: "401-555-2222",
        isActive: false,
      });

      const response = await request(app).get("/api/members?filter=all");
      
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it("should search members by query (search parameter)", async () => {
      const uniqueId = Date.now();
      
      await request(app).post("/api/members").send({
        firstName: "Searchable",
        lastName: "User",
        email: `searchable-${uniqueId}@example.com`,
        phone: "401-555-1111",
      });

      await request(app).post("/api/members").send({
        firstName: "Other",
        lastName: "Person",
        email: `other-${uniqueId}@example.com`,
        phone: "401-555-2222",
      });

      const response = await request(app).get("/api/members?search=Searchable");
      
      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((m: any) => m.firstName === "Searchable")).toBe(true);
    });

    it("should combine filter and search parameters", async () => {
      const uniqueId = Date.now();
      
      await request(app).post("/api/members").send({
        firstName: "Active",
        lastName: "Searchable",
        email: `active-search-${uniqueId}@example.com`,
        phone: "401-555-1111",
        isActive: true,
      });

      await request(app).post("/api/members").send({
        firstName: "Inactive",
        lastName: "Searchable",
        email: `inactive-search-${uniqueId}@example.com`,
        phone: "401-555-2222",
        isActive: false,
      });

      const response = await request(app).get("/api/members?filter=active&search=Searchable");
      
      expect(response.status).toBe(200);
      expect(response.body.every((m: any) => m.isActive === true)).toBe(true);
      expect(response.body.some((m: any) => m.lastName === "Searchable")).toBe(true);
    });
  });

  describe("2. GET /api/members/:id - Get member by ID", () => {
    it("should return member by ID", async () => {
      const uniqueId = Date.now();
      
      const createResponse = await request(app).post("/api/members").send({
        firstName: "Get",
        lastName: "Test",
        email: `get-${uniqueId}@example.com`,
        phone: "401-555-1111",
      });

      const memberId = createResponse.body.id;
      const response = await request(app).get(`/api/members/${memberId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(memberId);
      expect(response.body.firstName).toBe("Get");
      expect(response.body.lastName).toBe("Test");
      expect(response.body.email).toBe(`get-${uniqueId}@example.com`);
    });

    it("should return 404 for non-existent member", async () => {
      const response = await request(app).get("/api/members/non-existent-id");
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("NOT_FOUND");
    });
  });

  describe("3. POST /api/members - Create new member", () => {
    it("should create a new member with required fields", async () => {
      const uniqueId = Date.now();
      const payload = {
        firstName: "New",
        lastName: "Member",
        email: `new-${uniqueId}@example.com`,
        phone: "401-555-1234",
      };

      const response = await request(app)
        .post("/api/members")
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.memberNumber).toMatch(/^MEM-\d{4}$/);
      expect(response.body.firstName).toBe(payload.firstName);
      expect(response.body.lastName).toBe(payload.lastName);
      expect(response.body.email).toBe(payload.email.toLowerCase());
      expect(response.body.phone).toBe(payload.phone);
      expect(response.body.isActive).toBe(true);
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.lastModified).toBeDefined();
    });

    it("should create member with optional fields", async () => {
      const uniqueId = Date.now();
      const payload = {
        firstName: "Optional",
        lastName: "Fields",
        email: `optional-${uniqueId}@example.com`,
        phone: "401-555-1234",
        dateOfBirth: "1990-01-15",
        gender: "Male",
        address: "123 Main St",
        notes: "Test member",
        ntrpRating: "4.5",
        ustaNumber: "USTA123",
      };

      const response = await request(app)
        .post("/api/members")
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.dateOfBirth).toBe(payload.dateOfBirth);
      expect(response.body.gender).toBe(payload.gender);
      expect(response.body.address).toBe(payload.address);
      expect(response.body.notes).toBe(payload.notes);
      expect(response.body.ntrpRating).toBe(payload.ntrpRating);
      expect(response.body.ustaNumber).toBe(payload.ustaNumber);
    });

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
      
      await request(app).post("/api/members").send({
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
  });

  describe("4. PUT /api/members/:id - Update member (full update)", () => {
    it("should update member with full data", async () => {
      const uniqueId = Date.now();
      
      const createResponse = await request(app).post("/api/members").send({
        firstName: "Original",
        lastName: "Name",
        email: `original-${uniqueId}@example.com`,
        phone: "401-555-1111",
      });

      const memberId = createResponse.body.id;
      const updatePayload = {
        firstName: "Updated",
        lastName: "Name",
        email: `updated-${uniqueId}@example.com`,
        phone: "401-555-9999",
        isActive: true,
      };

      const response = await request(app)
        .put(`/api/members/${memberId}`)
        .send(updatePayload);

      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe(updatePayload.firstName);
      expect(response.body.email).toBe(updatePayload.email.toLowerCase());
      expect(response.body.phone).toBe(updatePayload.phone);
    });

    it("should return 400 when no update data provided", async () => {
      const uniqueId = Date.now();
      
      const createResponse = await request(app).post("/api/members").send({
        firstName: "Test",
        lastName: "User",
        email: `test-${uniqueId}@example.com`,
        phone: "401-555-1111",
      });

      const response = await request(app)
        .put(`/api/members/${createResponse.body.id}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("No update data provided");
    });

    it("should return 404 for non-existent member", async () => {
      const response = await request(app)
        .put("/api/members/non-existent-id")
        .send({
          firstName: "Updated",
        });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe("NOT_FOUND");
    });
  });

  describe("5. PATCH /api/members/:id - Partial update", () => {
    it("should update member status with PATCH", async () => {
      const uniqueId = Date.now();
      
      const createResponse = await request(app).post("/api/members").send({
        firstName: "Status",
        lastName: "Change",
        email: `status-${uniqueId}@example.com`,
        phone: "401-555-1111",
        isActive: true,
      });

      const memberId = createResponse.body.id;
      const response = await request(app)
        .patch(`/api/members/${memberId}`)
        .send({
          isActive: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
      expect(response.body.firstName).toBe("Status"); // Other fields unchanged
    });

    it("should allow partial update of any field", async () => {
      const uniqueId = Date.now();
      
      const createResponse = await request(app).post("/api/members").send({
        firstName: "Partial",
        lastName: "Update",
        email: `partial-${uniqueId}@example.com`,
        phone: "401-555-1111",
      });

      const memberId = createResponse.body.id;
      const response = await request(app)
        .patch(`/api/members/${memberId}`)
        .send({
          firstName: "Updated",
        });

      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe("Updated");
      expect(response.body.lastName).toBe("Update"); // Unchanged
    });

    it("should return 400 when no update data provided", async () => {
      const uniqueId = Date.now();
      
      const createResponse = await request(app).post("/api/members").send({
        firstName: "Test",
        lastName: "User",
        email: `test-${uniqueId}@example.com`,
        phone: "401-555-1111",
      });

      const response = await request(app)
        .patch(`/api/members/${createResponse.body.id}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("No update data provided");
    });
  });

  describe("6. DELETE /api/members/:id - Delete/deactivate member", () => {
    it("should soft delete member (set isActive to false)", async () => {
      const uniqueId = Date.now();
      
      const createResponse = await request(app).post("/api/members").send({
        firstName: "Delete",
        lastName: "Test",
        email: `delete-${uniqueId}@example.com`,
        phone: "401-555-1111",
        isActive: true,
      });

      const memberId = createResponse.body.id;
      const deleteResponse = await request(app).delete(`/api/members/${memberId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe("Member deactivated successfully");

      // Verify member is still accessible but inactive
      const getResponse = await request(app).get(`/api/members/${memberId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.isActive).toBe(false);
    });

    it("should return 404 for non-existent member", async () => {
      const response = await request(app).delete("/api/members/non-existent-id");

      expect(response.status).toBe(404);
      expect(response.body.code).toBe("NOT_FOUND");
    });
  });

  describe("7. GET /api/members/:id/reservations - Get member's reservations", () => {
    it("should return empty array for member with no reservations", async () => {
      const uniqueId = Date.now();
      
      const createResponse = await request(app).post("/api/members").send({
        firstName: "No",
        lastName: "Reservations",
        email: `no-res-${uniqueId}@example.com`,
        phone: "401-555-1111",
      });

      const response = await request(app)
        .get(`/api/members/${createResponse.body.id}/reservations`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it("should return member's reservations", async () => {
      const uniqueId = Date.now();
      const uniqueDate = `2026-06-${String(1 + (uniqueId % 28)).padStart(2, '0')}`;
      const uniqueHour = 10 + Math.floor((uniqueId / 100) % 5);
      
      // Create member
      const createResponse = await request(app).post("/api/members").send({
        firstName: "With",
        lastName: "Reservations",
        email: `with-res-${uniqueId}@example.com`,
        phone: "401-555-1111",
      });

      const memberId = createResponse.body.id;

      // Create reservation for member
      await request(app).post("/api/reservations").send({
        courtId: "1",
        date: uniqueDate,
        timeSlot: {
          start: `${String(uniqueHour).padStart(2, '0')}:00`,
          end: `${String(uniqueHour + 1).padStart(2, '0')}:00`,
        },
        memberId: memberId,
      });

      const response = await request(app)
        .get(`/api/members/${memberId}/reservations`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].memberId).toBe(memberId);
    });

    it("should return 404 for non-existent member", async () => {
      const response = await request(app)
        .get("/api/members/non-existent-id/reservations");

      expect(response.status).toBe(404);
      expect(response.body.code).toBe("NOT_FOUND");
    });
  });

  describe("API Endpoint Integration", () => {
    it("should support complete CRUD lifecycle", async () => {
      const uniqueId = Date.now();
      
      // CREATE
      const createResponse = await request(app).post("/api/members").send({
        firstName: "Lifecycle",
        lastName: "Test",
        email: `lifecycle-${uniqueId}@example.com`,
        phone: "401-555-1111",
      });
      expect(createResponse.status).toBe(201);
      const memberId = createResponse.body.id;

      // READ
      const getResponse = await request(app).get(`/api/members/${memberId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.id).toBe(memberId);

      // UPDATE (PUT)
      const putResponse = await request(app)
        .put(`/api/members/${memberId}`)
        .send({
          firstName: "Updated",
          lastName: "Test",
          email: `updated-lifecycle-${uniqueId}@example.com`,
          phone: "401-555-9999",
        });
      expect(putResponse.status).toBe(200);
      expect(putResponse.body.firstName).toBe("Updated");

      // UPDATE (PATCH)
      const patchResponse = await request(app)
        .patch(`/api/members/${memberId}`)
        .send({
          isActive: false,
        });
      expect(patchResponse.status).toBe(200);
      expect(patchResponse.body.isActive).toBe(false);

      // DELETE (soft delete)
      const deleteResponse = await request(app).delete(`/api/members/${memberId}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify member is inactive
      const finalGetResponse = await request(app).get(`/api/members/${memberId}`);
      expect(finalGetResponse.body.isActive).toBe(false);
    });

    it("should handle all endpoints with proper error responses", async () => {
      // GET non-existent
      const getResponse = await request(app).get("/api/members/non-existent");
      expect(getResponse.status).toBe(404);
      expect(getResponse.body.code).toBe("NOT_FOUND");

      // PUT non-existent
      const putResponse = await request(app)
        .put("/api/members/non-existent")
        .send({ firstName: "Test" });
      expect(putResponse.status).toBe(404);
      expect(putResponse.body.code).toBe("NOT_FOUND");

      // PATCH non-existent
      const patchResponse = await request(app)
        .patch("/api/members/non-existent")
        .send({ firstName: "Test" });
      expect(patchResponse.status).toBe(404);
      expect(patchResponse.body.code).toBe("NOT_FOUND");

      // DELETE non-existent
      const deleteResponse = await request(app).delete("/api/members/non-existent");
      expect(deleteResponse.status).toBe(404);
      expect(deleteResponse.body.code).toBe("NOT_FOUND");
    });
  });
});
