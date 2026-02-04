/**
 * Phase 8: Reservation Integration - Comprehensive Test Suite
 * Tests all Phase 8 requirements:
 * 1. Reservation type updates (memberId, member, guest fields)
 * 2. Member validation in reservation creation
 * 3. Penalty cancellation tracking
 * 4. Guest reservation support (backward compatibility)
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
    path.join(os.tmpdir(), `pta-phase8-${Date.now()}-${Math.random().toString(36).substring(7)}-`)
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

describe("Phase 8: Reservation Integration Tests", () => {
  // Helper to generate unique time slots per test
  const getUniqueTimeSlot = (testIndex: number, uniqueId?: number) => {
    const baseHour = 10;
    const hourOffset = ((testIndex * 3) + (uniqueId ? Math.floor(uniqueId / 1000) % 10 : 0)) % 10;
    const hour = baseHour + hourOffset;
    return {
      start: `${String(hour).padStart(2, '0')}:00`,
      end: `${String(hour + 1).padStart(2, '0')}:00`,
    };
  };

  const getUniqueDate = (testIndex: number, uniqueId?: number) => {
    const baseDay = 1 + ((testIndex * 2) + (uniqueId ? Math.floor(uniqueId / 10000) % 28 : 0)) % 28;
    return `2026-07-${String(baseDay).padStart(2, '0')}`;
  };

  describe("8.1 Reservation Type Updates", () => {
    it("should create reservation with memberId field", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(0, uniqueId);
      const uniqueDate = getUniqueDate(0, uniqueId);
      
      // Create member
      const memberResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Type",
          lastName: "Test",
          email: `type-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      const memberId = memberResponse.body.id;

      // Create reservation with memberId
      const reservationResponse = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: timeSlot,
          memberId: memberId,
        });

      expect(reservationResponse.status).toBe(201);
      expect(reservationResponse.body.memberId).toBe(memberId);
      expect(reservationResponse.body.memberId).toBeDefined();
    });

    it("should create reservation with guest fields (guestName, guestEmail, guestPhone)", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(1, uniqueId);
      const uniqueDate = getUniqueDate(1, uniqueId);
      
      // Create guest reservation
      const reservationResponse = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: timeSlot,
          guestName: "Guest User",
          guestEmail: `guest-${uniqueId}@example.com`,
          guestPhone: "401-555-9999",
        });

      expect(reservationResponse.status).toBe(201);
      expect(reservationResponse.body.guestName).toBe("Guest User");
      expect(reservationResponse.body.guestEmail).toBe(`guest-${uniqueId}@example.com`);
      expect(reservationResponse.body.guestPhone).toBe("401-555-9999");
      expect(reservationResponse.body.memberId).toBeUndefined();
    });

    it("should not include memberId when creating guest reservation", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(2, uniqueId);
      const uniqueDate = getUniqueDate(2, uniqueId);
      
      const reservationResponse = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: timeSlot,
          guestName: "Guest",
          guestEmail: `guest2-${uniqueId}@example.com`,
          guestPhone: "401-555-8888",
        });

      expect(reservationResponse.status).toBe(201);
      expect(reservationResponse.body.memberId).toBeUndefined();
      expect(reservationResponse.body.member).toBeUndefined();
    });
  });

  describe("8.2 Member Validation in Reservation Creation", () => {
    it("should validate member is active before creating reservation", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(3, uniqueId);
      const uniqueDate = getUniqueDate(3, uniqueId);
      
      // Create active member
      const memberResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Active",
          lastName: "Member",
          email: `active-${uniqueId}@example.com`,
          phone: "401-555-1234",
          isActive: true,
        });

      const memberId = memberResponse.body.id;

      // Create reservation should succeed
      const reservationResponse = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: timeSlot,
          memberId: memberId,
        });

      expect(reservationResponse.status).toBe(201);
      expect(reservationResponse.body.memberId).toBe(memberId);
    });

    it("should reject reservation creation for inactive member", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(4, uniqueId);
      const uniqueDate = getUniqueDate(4, uniqueId);
      
      // Create inactive member
      const memberResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Inactive",
          lastName: "Member",
          email: `inactive-${uniqueId}@example.com`,
          phone: "401-555-1234",
          isActive: false,
        });

      const memberId = memberResponse.body.id;

      // Create reservation should fail
      const reservationResponse = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: timeSlot,
          memberId: memberId,
        });

      expect(reservationResponse.status).toBe(400);
      expect(reservationResponse.body.code).toBe("INVALID_STATUS");
      expect(reservationResponse.body.error).toContain("inactive");
    });

    it("should validate guest fields when no memberId provided", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(5, uniqueId);
      const uniqueDate = getUniqueDate(5, uniqueId);
      
      // Try to create reservation without memberId and without guest fields
      const reservationResponse = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: timeSlot,
          // Missing guest fields
        });

      expect(reservationResponse.status).toBe(400);
      expect(reservationResponse.body.error).toMatch(/Guest information|memberId or guest/i);
    });

    it("should accept guest reservation with all required guest fields", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(6, uniqueId);
      const uniqueDate = getUniqueDate(6, uniqueId);
      
      const reservationResponse = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: timeSlot,
          guestName: "Complete Guest",
          guestEmail: `complete-${uniqueId}@example.com`,
          guestPhone: "401-555-7777",
        });

      expect(reservationResponse.status).toBe(201);
      expect(reservationResponse.body.guestName).toBe("Complete Guest");
      expect(reservationResponse.body.guestEmail).toBe(`complete-${uniqueId}@example.com`);
      expect(reservationResponse.body.guestPhone).toBe("401-555-7777");
    });
  });

  describe("8.3 Penalty Cancellation Tracking", () => {
    it("should increment penaltyCancellations when member cancels reservation", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(7, uniqueId);
      const uniqueDate = getUniqueDate(7, uniqueId);
      
      // Create member
      const memberResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Penalty",
          lastName: "Test",
          email: `penalty-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      const memberId = memberResponse.body.id;
      expect(memberResponse.body.penaltyCancellations).toBe(0);

      // Create reservation
      const reservationResponse = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: timeSlot,
          memberId: memberId,
        });

      expect(reservationResponse.status).toBe(201);
      const reservationId = reservationResponse.body.id;

      // Cancel reservation
      const cancelResponse = await request(app)
        .delete(`/api/reservations/${reservationId}`);

      expect(cancelResponse.status).toBe(200);

      // Wait for member update to complete
      await new Promise(resolve => setTimeout(resolve, 150));
      memberCache.clear();

      // Check penalty cancellations increased
      const updatedMemberResponse = await request(app)
        .get(`/api/members/${memberId}`);

      expect(updatedMemberResponse.status).toBe(200);
      expect(updatedMemberResponse.body.penaltyCancellations).toBe(1);
    });

    it("should not increment penaltyCancellations for guest reservation cancellation", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(8, uniqueId);
      const uniqueDate = getUniqueDate(8, uniqueId);
      
      // Create guest reservation
      const reservationResponse = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: timeSlot,
          guestName: "Guest",
          guestEmail: `guest-penalty-${uniqueId}@example.com`,
          guestPhone: "401-555-9999",
        });

      const reservationId = reservationResponse.body.id;

      // Cancel reservation (should not affect any member)
      const cancelResponse = await request(app)
        .delete(`/api/reservations/${reservationId}`);

      expect(cancelResponse.status).toBe(200);
      // No member to check, but should not throw errors
    });

    it("should track multiple penalty cancellations", async () => {
      const uniqueId = Date.now();
      const timeSlot1 = getUniqueTimeSlot(9, uniqueId);
      const timeSlot2 = getUniqueTimeSlot(10, uniqueId + 1000);
      const uniqueDate1 = getUniqueDate(9, uniqueId);
      const uniqueDate2 = getUniqueDate(10, uniqueId + 1000);
      
      // Create member
      const memberResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Multiple",
          lastName: "Penalties",
          email: `multiple-penalties-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      const memberId = memberResponse.body.id;

      // Create and cancel first reservation
      const res1 = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate1,
          timeSlot: timeSlot1,
          memberId: memberId,
        });

      await request(app).delete(`/api/reservations/${res1.body.id}`);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create and cancel second reservation
      const res2 = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "2",
          date: uniqueDate2,
          timeSlot: timeSlot2,
          memberId: memberId,
        });

      await request(app).delete(`/api/reservations/${res2.body.id}`);
      await new Promise(resolve => setTimeout(resolve, 150));
      memberCache.clear();

      // Check penalty cancellations
      const updatedMemberResponse = await request(app)
        .get(`/api/members/${memberId}`);

      expect(updatedMemberResponse.status).toBe(200);
      expect(updatedMemberResponse.body.penaltyCancellations).toBe(2);
    });
  });

  describe("8.4 Backward Compatibility", () => {
    it("should support customerName/Email/Phone fields for guest reservations", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(11, uniqueId);
      const uniqueDate = getUniqueDate(11, uniqueId);
      
      // Create guest reservation using old field names
      const reservationResponse = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: timeSlot,
          customerName: "Old Format",
          customerEmail: `old-${uniqueId}@example.com`,
          customerPhone: "401-555-6666",
        });

      expect(reservationResponse.status).toBe(201);
      expect(reservationResponse.body.customerName).toBe("Old Format");
      expect(reservationResponse.body.customerEmail).toBe(`old-${uniqueId}@example.com`);
      expect(reservationResponse.body.customerPhone).toBe("401-555-6666");
    });

    it("should support both guest* and customer* field names", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(12, uniqueId);
      const uniqueDate = getUniqueDate(12, uniqueId);
      
      // Create guest reservation using new field names
      const reservationResponse = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: timeSlot,
          guestName: "New Format",
          guestEmail: `new-${uniqueId}@example.com`,
          guestPhone: "401-555-5555",
        });

      expect(reservationResponse.status).toBe(201);
      expect(reservationResponse.body.guestName).toBe("New Format");
      expect(reservationResponse.body.guestEmail).toBe(`new-${uniqueId}@example.com`);
      expect(reservationResponse.body.guestPhone).toBe("401-555-5555");
      // Should also populate customer fields for backward compatibility
      expect(reservationResponse.body.customerName).toBe("New Format");
      expect(reservationResponse.body.customerEmail).toBe(`new-${uniqueId}@example.com`);
    });
  });

  describe("8.5 Integration Scenarios", () => {
    it("should handle member reservation lifecycle (create, retrieve, cancel)", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(13, uniqueId);
      const uniqueDate = getUniqueDate(13, uniqueId);
      
      // Create member
      const memberResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Lifecycle",
          lastName: "Test",
          email: `lifecycle-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      const memberId = memberResponse.body.id;

      // Create reservation
      const createResponse = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: timeSlot,
          memberId: memberId,
        });

      expect(createResponse.status).toBe(201);
      const reservationId = createResponse.body.id;

      // Retrieve member's reservations
      const memberReservationsResponse = await request(app)
        .get(`/api/members/${memberId}/reservations`);

      expect(memberReservationsResponse.status).toBe(200);
      expect(memberReservationsResponse.body.length).toBe(1);
      expect(memberReservationsResponse.body[0].id).toBe(reservationId);
      expect(memberReservationsResponse.body[0].memberId).toBe(memberId);

      // Cancel reservation
      const cancelResponse = await request(app)
        .delete(`/api/reservations/${reservationId}`);

      expect(cancelResponse.status).toBe(200);

      // Verify penalty was tracked
      await new Promise(resolve => setTimeout(resolve, 150));
      memberCache.clear();
      const updatedMemberResponse = await request(app)
        .get(`/api/members/${memberId}`);

      expect(updatedMemberResponse.body.penaltyCancellations).toBe(1);
    });

    it("should handle mixed member and guest reservations", async () => {
      const uniqueId = Date.now();
      const timeSlot1 = getUniqueTimeSlot(14, uniqueId);
      const timeSlot2 = getUniqueTimeSlot(15, uniqueId + 2000);
      const uniqueDate1 = getUniqueDate(14, uniqueId);
      const uniqueDate2 = getUniqueDate(15, uniqueId + 2000);
      
      // Create member
      const memberResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Mixed",
          lastName: "Test",
          email: `mixed-${uniqueId}@example.com`,
          phone: "401-555-1111",
        });

      const memberId = memberResponse.body.id;

      // Create member reservation
      const memberRes = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate1,
          timeSlot: timeSlot1,
          memberId: memberId,
        });

      // Create guest reservation
      const guestRes = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "2",
          date: uniqueDate2,
          timeSlot: timeSlot2,
          guestName: "Guest",
          guestEmail: `guest-mixed-${uniqueId}@example.com`,
          guestPhone: "401-555-9999",
        });

      expect(memberRes.status).toBe(201);
      expect(memberRes.body.memberId).toBe(memberId);
      
      expect(guestRes.status).toBe(201);
      expect(guestRes.body.memberId).toBeUndefined();
      expect(guestRes.body.guestName).toBe("Guest");
    });
  });
});
