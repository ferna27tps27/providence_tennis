/**
 * API tests for member endpoints
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import app from "../../app";
import { memberCache } from "../../lib/cache/member-cache";
import { reservationCache } from "../../lib/cache/reservation-cache";

let tempDir = "";

beforeAll(async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "pta-members-api-"));
  tempDir = baseDir;
  process.env.DATA_DIR = tempDir;
});

beforeEach(async () => {
  // Clear caches before each test
  memberCache.clear();
  reservationCache.clear();
  
  if (!tempDir) return;
  try {
    // Ensure directory exists
    await fs.mkdir(tempDir, { recursive: true });
    
    // Clear members file
    const membersFile = path.join(tempDir, "members.json");
    const membersLockFile = path.join(tempDir, "members.json.lock");
    
    // Remove lock file if it exists
    await new Promise(resolve => setTimeout(resolve, 20));
    await fs.unlink(membersLockFile).catch(() => {});
    
    // Clear members file - write empty array
    await fs.writeFile(membersFile, JSON.stringify([], null, 2));
    
    // Clear reservations file
    const reservationsFile = path.join(tempDir, "reservations.json");
    const reservationsLockFile = path.join(tempDir, "reservations.json.lock");
    
    await fs.unlink(reservationsLockFile).catch(() => {});
    await fs.writeFile(reservationsFile, JSON.stringify([], null, 2));
    
    // Small delay to ensure file operations complete
    await new Promise(resolve => setTimeout(resolve, 50));
  } catch (error) {
    console.error("Error in beforeEach cleanup:", error);
  }
});

afterEach(async () => {
  // Clear caches after each test
  memberCache.clear();
  reservationCache.clear();
});

describe("Member API Endpoints", () => {
  describe("GET /api/members", () => {
    it("should return empty array when no members exist", async () => {
      const response = await request(app).get("/api/members");
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it("should return all members", async () => {
      const uniqueId = Date.now();
      
      // Create first member
      const member1 = await request(app)
        .post("/api/members")
        .send({
          firstName: "John",
          lastName: "Doe",
          email: `john-${uniqueId}@example.com`,
          phone: "401-555-1111",
        });

      // Create second member
      const member2 = await request(app)
        .post("/api/members")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: `jane-${uniqueId}@example.com`,
          phone: "401-555-2222",
        });

      const response = await request(app).get("/api/members");
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it("should filter by active status", async () => {
      const uniqueId = Date.now();
      
      // Create active member
      await request(app)
        .post("/api/members")
        .send({
          firstName: "Active",
          lastName: "Member",
          email: `active-${uniqueId}@example.com`,
          phone: "401-555-1111",
          isActive: true,
        });

      // Create inactive member
      await request(app)
        .post("/api/members")
        .send({
          firstName: "Inactive",
          lastName: "Member",
          email: `inactive-${uniqueId}@example.com`,
          phone: "401-555-2222",
          isActive: false,
        });

      const activeResponse = await request(app).get("/api/members?filter=active");
      const inactiveResponse = await request(app).get("/api/members?filter=inactive");
      
      expect(activeResponse.status).toBe(200);
      expect(activeResponse.body.length).toBe(1);
      expect(activeResponse.body[0].isActive).toBe(true);
      
      expect(inactiveResponse.status).toBe(200);
      expect(inactiveResponse.body.length).toBe(1);
      expect(inactiveResponse.body[0].isActive).toBe(false);
    });

    it("should search members by query", async () => {
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
          lastName: "User",
          email: `other-${uniqueId}@example.com`,
          phone: "401-555-2222",
        });

      const response = await request(app).get("/api/members?search=Searchable");
      
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].firstName).toBe("Searchable");
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
    });
  });

  describe("GET /api/members/:id", () => {
    it("should return member by ID", async () => {
      const uniqueId = Date.now();
      
      const createResponse = await request(app)
        .post("/api/members")
        .send({
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
      expect(response.body.email).toBe(`get-${uniqueId}@example.com`);
    });

    it("should return 404 for non-existent member", async () => {
      const response = await request(app).get("/api/members/non-existent-id");
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("NOT_FOUND");
    });
  });

  describe("POST /api/members", () => {
    it("should create a new member", async () => {
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
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe("DUPLICATE_EMAIL");
    });

    it("should accept optional fields", async () => {
      const uniqueId = Date.now();
      const payload = {
        firstName: "Optional",
        lastName: "Fields",
        email: `optional-${uniqueId}@example.com`,
        phone: "401-555-1234",
        dateOfBirth: "1990-01-15",
        gender: "Male",
        address: "123 Main St",
        notes: "Test notes",
        ntrpRating: "4.5",
        ustaNumber: "12345",
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
  });

  describe("PUT /api/members/:id", () => {
    it("should update member", async () => {
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
      const updateResponse = await request(app)
        .put(`/api/members/${memberId}`)
        .send({
          firstName: "Updated",
          notes: "Updated notes",
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.firstName).toBe("Updated");
      expect(updateResponse.body.notes).toBe("Updated notes");
      expect(updateResponse.body.id).toBe(memberId);
    });

    it("should return 400 for no update data", async () => {
      const uniqueId = Date.now();
      
      const createResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "No",
          lastName: "Update",
          email: `no-update-${uniqueId}@example.com`,
          phone: "401-555-1111",
        });

      const memberId = createResponse.body.id;
      const response = await request(app)
        .put(`/api/members/${memberId}`)
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

  describe("PATCH /api/members/:id", () => {
    it("should partially update member", async () => {
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
      const patchResponse = await request(app)
        .patch(`/api/members/${memberId}`)
        .send({
          isActive: false,
        });

      expect(patchResponse.status).toBe(200);
      expect(patchResponse.body.isActive).toBe(false);
      expect(patchResponse.body.firstName).toBe("Patch"); // Other fields unchanged
    });

    it("should return 400 for no update data", async () => {
      const uniqueId = Date.now();
      
      const createResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "No",
          lastName: "Patch",
          email: `no-patch-${uniqueId}@example.com`,
          phone: "401-555-1111",
        });

      const memberId = createResponse.body.id;
      const response = await request(app)
        .patch(`/api/members/${memberId}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("No update data provided");
    });
  });

  describe("DELETE /api/members/:id", () => {
    it("should soft delete member (set isActive to false)", async () => {
      const uniqueId = Date.now();
      
      const createResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Delete",
          lastName: "Test",
          email: `delete-${uniqueId}@example.com`,
          phone: "401-555-1111",
          isActive: true,
        });

      const memberId = createResponse.body.id;
      const deleteResponse = await request(app)
        .delete(`/api/members/${memberId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify member is still accessible but inactive
      const getResponse = await request(app).get(`/api/members/${memberId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.isActive).toBe(false);
    });

    it("should return 404 for non-existent member", async () => {
      const response = await request(app)
        .delete("/api/members/non-existent-id");

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Member not found");
    });
  });

  describe("GET /api/members/:id/reservations", () => {
    it("should return member's reservations", async () => {
      const uniqueId = Date.now();
      
      // Create member
      const memberResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Reservation",
          lastName: "Test",
          email: `reservation-${uniqueId}@example.com`,
          phone: "401-555-1111",
        });

      const memberId = memberResponse.body.id;

      // Note: This endpoint currently returns empty array since reservations
      // don't have memberId yet (that's Phase 3 integration)
      const response = await request(app)
        .get(`/api/members/${memberId}/reservations`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should return 404 for non-existent member", async () => {
      const response = await request(app)
        .get("/api/members/non-existent-id/reservations");

      expect(response.status).toBe(404);
      expect(response.body.code).toBe("NOT_FOUND");
    });
  });
});
