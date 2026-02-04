/**
 * Integration tests for member-reservation integration
 * Tests the end-to-end functionality of linking members to reservations,
 * member validation, and penalty tracking
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
    path.join(os.tmpdir(), `pta-member-res-${Date.now()}-${Math.random().toString(36).substring(7)}-`)
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

describe("Member-Reservation Integration Tests", () => {
  // Helper to generate unique time slots per test
  const getUniqueTimeSlot = (testIndex: number, uniqueId?: number) => {
    const baseHour = 10;
    const hourOffset = ((testIndex * 3) + (uniqueId ? Math.floor(uniqueId / 1000) % 10 : 0)) % 10; // More spread
    const hour = baseHour + hourOffset;
    return {
      start: `${String(hour).padStart(2, '0')}:00`,
      end: `${String(hour + 1).padStart(2, '0')}:00`,
    };
  };

  const getUniqueDate = (testIndex: number, uniqueId?: number) => {
    const baseDay = 1 + ((testIndex * 2) + (uniqueId ? Math.floor(uniqueId / 10000) % 28 : 0)) % 28;
    return `2026-06-${String(baseDay).padStart(2, '0')}`;
  };

  describe("Member Reservations", () => {
    it("should create reservation with memberId", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(0, uniqueId);
      const uniqueDate = getUniqueDate(0, uniqueId);
      
      // Create member
      const memberResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Member",
          lastName: "Reservation",
          email: `member-res-${uniqueId}@example.com`,
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
      expect(reservationResponse.body.guestName).toBeUndefined();
      expect(reservationResponse.body.guestEmail).toBeUndefined();
    });

    it("should prevent inactive member from creating reservation", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(1, uniqueId);
      const uniqueDate = getUniqueDate(1, uniqueId);
      
      // Create inactive member
      const memberResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Inactive",
          lastName: "Member",
          email: `inactive-res-${uniqueId}@example.com`,
          phone: "401-555-1234",
          isActive: false,
        });

      const memberId = memberResponse.body.id;

      // Try to create reservation with inactive member
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
    });

    it("should return member's reservations", async () => {
      const uniqueId = Date.now();
      const timeSlot1 = getUniqueTimeSlot(2, uniqueId);
      const timeSlot2 = getUniqueTimeSlot(3, uniqueId + 1000);
      const uniqueDate1 = getUniqueDate(2, uniqueId);
      const uniqueDate2 = getUniqueDate(3, uniqueId + 1000);
      
      // Create member
      const memberResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Multiple",
          lastName: "Reservations",
          email: `multiple-res-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      const memberId = memberResponse.body.id;

      // Create first reservation
      const res1 = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate1,
          timeSlot: timeSlot1,
          memberId: memberId,
        });

      // Create second reservation
      const res2 = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "2",
          date: uniqueDate2,
          timeSlot: timeSlot2,
          memberId: memberId,
        });

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);

      // Get member's reservations
      const memberReservationsResponse = await request(app)
        .get(`/api/members/${memberId}/reservations`);

      expect(memberReservationsResponse.status).toBe(200);
      expect(Array.isArray(memberReservationsResponse.body)).toBe(true);
      expect(memberReservationsResponse.body.length).toBe(2);
      expect(memberReservationsResponse.body.every((r: any) => r.memberId === memberId)).toBe(true);
    });
  });

  describe("Guest Reservations (Backward Compatibility)", () => {
    it("should still support guest reservations with customerName/Email/Phone", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(4, uniqueId);
      const uniqueDate = getUniqueDate(4, uniqueId);
      
      // Create guest reservation using old field names
      const reservationResponse = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: timeSlot,
          customerName: "Guest User",
          customerEmail: `guest-${uniqueId}@example.com`,
          customerPhone: "401-555-9999",
        });

      expect(reservationResponse.status).toBe(201);
      expect(reservationResponse.body.memberId).toBeUndefined();
      expect(reservationResponse.body.customerName).toBe("Guest User");
      expect(reservationResponse.body.customerEmail).toBe(`guest-${uniqueId}@example.com`);
    });

    it("should support guest reservations with guestName/Email/Phone", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(5, uniqueId);
      const uniqueDate = getUniqueDate(5, uniqueId);
      
      // Create guest reservation using new field names
      const reservationResponse = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: timeSlot,
          guestName: "Guest User",
          guestEmail: `guest-new-${uniqueId}@example.com`,
          guestPhone: "401-555-8888",
        });

      expect(reservationResponse.status).toBe(201);
      expect(reservationResponse.body.memberId).toBeUndefined();
      expect(reservationResponse.body.guestName).toBe("Guest User");
      expect(reservationResponse.body.guestEmail).toBe(`guest-new-${uniqueId}@example.com`);
    });
  });

  describe("Penalty Cancellation Tracking", () => {
    it("should increment penalty cancellations when member cancels reservation", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(6, uniqueId);
      const uniqueDate = getUniqueDate(6, uniqueId);
      
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
      expect(reservationId).toBeDefined();

      // Verify reservation exists before cancelling
      const getResResponse = await request(app).get(`/api/reservations/${reservationId}`);
      expect(getResResponse.status).toBe(200);
      expect(getResResponse.body.memberId).toBe(memberId);

      // Cancel reservation
      const cancelResponse = await request(app).delete(`/api/reservations/${reservationId}`);
      expect(cancelResponse.status).toBe(200);

      // Small delay to ensure member update and cache invalidation completes
      await new Promise(resolve => setTimeout(resolve, 150));

      // Clear member cache to ensure we get fresh data
      memberCache.clear();

      // Check penalty cancellations increased
      const updatedMemberResponse = await request(app).get(`/api/members/${memberId}`);
      expect(updatedMemberResponse.status).toBe(200);
      expect(updatedMemberResponse.body.penaltyCancellations).toBe(1);
    });

    it("should not increment penalty for guest reservation cancellation", async () => {
      const uniqueId = Date.now();
      const timeSlot = getUniqueTimeSlot(7, uniqueId);
      const uniqueDate = getUniqueDate(7, uniqueId);
      
      // Create guest reservation
      const reservationResponse = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate,
          timeSlot: timeSlot,
          customerName: "Guest",
          customerEmail: `guest-${uniqueId}@example.com`,
          customerPhone: "401-555-9999",
        });

      const reservationId = reservationResponse.body.id;

      // Cancel reservation (should not affect any member)
      const cancelResponse = await request(app).delete(`/api/reservations/${reservationId}`);
      expect(cancelResponse.status).toBe(200);
      
      // No member to check, but should not throw errors
    });
  });

  describe("Member Status Changes", () => {
    it("should prevent reservation creation after member is deactivated", async () => {
      const uniqueId = Date.now();
      const timeSlot1 = getUniqueTimeSlot(8, uniqueId);
      const timeSlot2 = getUniqueTimeSlot(9, uniqueId + 2000);
      const uniqueDate1 = getUniqueDate(8, uniqueId);
      const uniqueDate2 = getUniqueDate(9, uniqueId + 2000);
      
      // Create active member
      const memberResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Status",
          lastName: "Change",
          email: `status-change-${uniqueId}@example.com`,
          phone: "401-555-1234",
          isActive: true,
        });

      const memberId = memberResponse.body.id;

      // Create first reservation (should succeed)
      const res1 = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "1",
          date: uniqueDate1,
          timeSlot: timeSlot1,
          memberId: memberId,
        });

      expect(res1.status).toBe(201);

      // Deactivate member
      await request(app)
        .patch(`/api/members/${memberId}`)
        .send({ isActive: false });

      // Try to create second reservation (should fail)
      const res2 = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "2",
          date: uniqueDate2,
          timeSlot: timeSlot2,
          memberId: memberId,
        });

      expect(res2.status).toBe(400);
      expect(res2.body.code).toBe("INVALID_STATUS");
    });
  });

  describe("Mixed Member and Guest Reservations", () => {
    it("should handle both member and guest reservations in the system", async () => {
      const uniqueId = Date.now();
      const timeSlot1 = getUniqueTimeSlot(10, uniqueId);
      const timeSlot2 = getUniqueTimeSlot(11, uniqueId + 3000);
      const uniqueDate1 = getUniqueDate(10, uniqueId);
      const uniqueDate2 = getUniqueDate(11, uniqueId + 3000);
      
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

      // Create guest reservation on different date to avoid conflicts
      const guestRes = await request(app)
        .post("/api/reservations")
        .send({
          courtId: "2",
          date: uniqueDate2,
          timeSlot: timeSlot2,
          customerName: "Guest",
          customerEmail: `guest-${uniqueId}@example.com`,
          customerPhone: "401-555-9999",
        });

      expect(memberRes.status).toBe(201);
      expect(memberRes.body.memberId).toBe(memberId);
      
      expect(guestRes.status).toBe(201);
      expect(guestRes.body.memberId).toBeUndefined();
      expect(guestRes.body.customerName).toBe("Guest");
    });
  });
});
