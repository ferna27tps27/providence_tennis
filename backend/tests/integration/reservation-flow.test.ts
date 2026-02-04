/**
 * Integration tests for the complete reservation flow
 * Tests the end-to-end functionality including conflict detection,
 * file locking, and caching
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import app from "../../src/app";
import { reservationCache } from "../../src/lib/cache/reservation-cache";

let tempDir = "";
let originalDataDir: string | undefined;

beforeAll(async () => {
  // Save original DATA_DIR
  originalDataDir = process.env.DATA_DIR;
  
  // Create unique temp directory for this test file
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), `pta-flow-${Date.now()}-${Math.random().toString(36).substring(7)}-`));
  tempDir = baseDir;
  process.env.DATA_DIR = tempDir;
  // Ensure directory exists
  await fs.mkdir(tempDir, { recursive: true });
});

beforeEach(async () => {
  // Clear cache before each test
  reservationCache.clear();
  
  // Ensure clean state - clear reservations file
  if (tempDir) {
    try {
      const reservationsFile = path.join(tempDir, "reservations.json");
      const lockFile = path.join(tempDir, "reservations.json.lock");
      
      // Remove lock file if it exists
      await fs.unlink(lockFile).catch(() => {});
      
      // Clear reservations file
      await fs.writeFile(reservationsFile, JSON.stringify([], null, 2)).catch(() => {});
    } catch {
      // ignore errors
    }
  }
});

afterEach(async () => {
  // Clear cache after each test
  reservationCache.clear();
  
  if (!tempDir) return;
  try {
    // Remove lock files
    const lockFile = path.join(tempDir, "reservations.json.lock");
    await fs.unlink(lockFile).catch(() => {});
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

describe("Reservation Flow Integration Tests", () => {
  // Use unique base date for each test run to avoid conflicts
  const baseDate = `2026-02-${String(10 + (Date.now() % 20)).padStart(2, '0')}`;
  
  describe("Conflict Detection", () => {
    it("should prevent overlapping time slot reservations", async () => {
      const date = `${baseDate.split('-')[0]}-${baseDate.split('-')[1]}-01`;
      const payload = {
        courtId: "1",
        date,
        timeSlot: { start: "10:00", end: "11:00" },
        customerName: "First User",
        customerEmail: "first@example.com",
        customerPhone: "401-555-1111",
      };

      // Create first reservation
      const response1 = await request(app)
        .post("/api/reservations")
        .send(payload);
      expect(response1.status).toBe(201);

      // Try to create overlapping reservation (10:30-11:30 overlaps with 10:00-11:00)
      const overlappingPayload = {
        ...payload,
        date, // Use same date
        timeSlot: { start: "10:30", end: "11:30" },
        customerEmail: "second@example.com",
      };

      const response2 = await request(app)
        .post("/api/reservations")
        .send(overlappingPayload);
      
      expect(response2.status).toBe(409); // Conflict
      expect(response2.body.code).toBe("CONFLICT");
      expect(response2.body.error).toContain("conflicts");
    });

    it("should prevent contained time slot reservations", async () => {
      const date = `${baseDate.split('-')[0]}-${baseDate.split('-')[1]}-02`;
      const payload = {
        courtId: "2",
        date,
        timeSlot: { start: "10:00", end: "12:00" },
        customerName: "Long Reservation",
        customerEmail: "long@example.com",
        customerPhone: "401-555-2222",
      };

      // Create first reservation (2 hours)
      const response1 = await request(app)
        .post("/api/reservations")
        .send(payload);
      expect(response1.status).toBe(201);

      // Try to create contained reservation (10:30-11:30 is contained in 10:00-12:00)
      const containedPayload = {
        ...payload,
        date, // Use same date
        timeSlot: { start: "10:30", end: "11:30" },
        customerEmail: "contained@example.com",
      };

      const response2 = await request(app)
        .post("/api/reservations")
        .send(containedPayload);
      
      expect(response2.status).toBe(409); // Conflict
    });

    it("should allow non-overlapping reservations on same court", async () => {
      const date = `${baseDate.split('-')[0]}-${baseDate.split('-')[1]}-03`;
      const payload1 = {
        courtId: "3",
        date,
        timeSlot: { start: "10:00", end: "11:00" },
        customerName: "User One",
        customerEmail: "user1@example.com",
        customerPhone: "401-555-3333",
      };

      const payload2 = {
        ...payload1,
        date, // Use same date
        timeSlot: { start: "11:00", end: "12:00" }, // Adjacent, non-overlapping
        customerEmail: "user2@example.com",
      };

      const response1 = await request(app)
        .post("/api/reservations")
        .send(payload1);
      expect(response1.status).toBe(201);

      const response2 = await request(app)
        .post("/api/reservations")
        .send(payload2);
      expect(response2.status).toBe(201); // Should succeed
    });

    it("should allow overlapping reservations on different courts", async () => {
      const date = `${baseDate.split('-')[0]}-${baseDate.split('-')[1]}-04`;
      const payload1 = {
        courtId: "4",
        date,
        timeSlot: { start: "10:00", end: "11:00" },
        customerName: "Court 4 User",
        customerEmail: "court4@example.com",
        customerPhone: "401-555-4444",
      };

      const payload2 = {
        ...payload1,
        date, // Use same date
        courtId: "5", // Different court
        customerEmail: "court5@example.com",
      };

      const response1 = await request(app)
        .post("/api/reservations")
        .send(payload1);
      expect(response1.status).toBe(201);

      const response2 = await request(app)
        .post("/api/reservations")
        .send(payload2);
      expect(response2.status).toBe(201); // Should succeed - different court
    });
  });

  describe("Caching", () => {
    it("should cache availability results", async () => {
      const date = `${baseDate.split('-')[0]}-${baseDate.split('-')[1]}-05`;
      // First request - should be cache miss
      const response1 = await request(app).get(
        `/api/availability?date=${date}`
      );
      expect(response1.status).toBe(200);
      
      const cacheStats1 = reservationCache.getStats();
      expect(cacheStats1.size).toBeGreaterThan(0);

      // Second request - should be cache hit (faster)
      const response2 = await request(app).get(
        `/api/availability?date=${date}`
      );
      expect(response2.status).toBe(200);
      expect(response2.body).toEqual(response1.body);
    });

    it("should invalidate cache when reservation is created", async () => {
      const date = `${baseDate.split('-')[0]}-${baseDate.split('-')[1]}-06`;
      const cacheKey = `availability:${date}`;
      
      // Clear cache first to ensure clean state
      reservationCache.invalidate(`availability:${date}`);
      
      // Get availability (populates cache)
      await request(app).get(`/api/availability?date=${date}`);
      const cachedBefore = reservationCache.get(cacheKey);
      expect(cachedBefore).not.toBeNull(); // Should be cached

      // Create reservation
      const payload = {
        courtId: "1",
        date,
        timeSlot: { start: "14:00", end: "15:00" },
        customerName: "Cache Test User",
        customerEmail: "cache@example.com",
        customerPhone: "401-555-5555",
      };

      const createResponse = await request(app).post("/api/reservations").send(payload);
      expect(createResponse.status).toBe(201);

      // Cache should be invalidated - check immediately after creation
      // The invalidation happens in createReservation, so cache should be empty
      const cachedAfter = reservationCache.get(cacheKey);
      expect(cachedAfter).toBeNull(); // Should be cleared by invalidation
    });

    it("should invalidate cache when reservation is cancelled", async () => {
      const date = `${baseDate.split('-')[0]}-${baseDate.split('-')[1]}-07`;
      
      // Create reservation first
      const payload = {
        courtId: "2",
        date,
        timeSlot: { start: "15:00", end: "16:00" },
        customerName: "Cancel Cache User",
        customerEmail: "cancelcache@example.com",
        customerPhone: "401-555-6666",
      };

      const createResponse = await request(app)
        .post("/api/reservations")
        .send(payload);
      const reservationId = createResponse.body.id;

      // Get availability (populates cache)
      await request(app).get(`/api/availability?date=${date}`);

      // Cancel reservation
      await request(app).delete(`/api/reservations/${reservationId}`);

      // Cache should be invalidated
      const cached = reservationCache.get(`availability:${date}`);
      expect(cached).toBeNull();
    });
  });

  describe("Concurrency", () => {
    it("should handle concurrent reservation attempts", async () => {
      // Use unique time slot for this test
      const uniqueMs = Date.now() % 1000;
      const startHour = 16 + Math.floor(uniqueMs / 60);
      const startMin = uniqueMs % 60;
      const endHour = startHour + 1;
      const endMin = startMin;
      const date = `${baseDate.split('-')[0]}-${baseDate.split('-')[1]}-08`;
      
      const payload = {
        courtId: "6",
        date,
        timeSlot: { 
          start: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`, 
          end: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}` 
        },
        customerName: "Concurrent User",
        customerEmail: "concurrent@example.com",
        customerPhone: "401-555-7777",
      };

      // Attempt to create the same reservation concurrently
      const promises = Array.from({ length: 5 }, () =>
        request(app).post("/api/reservations").send(payload)
      );

      const results = await Promise.all(promises);

      // Only one should succeed (201), others should conflict (409) or fail with lock error (503)
      const successCount = results.filter((r) => r.status === 201).length;
      const conflictOrLockCount = results.filter((r) => r.status === 409 || r.status === 503).length;

      expect(successCount).toBe(1); // Only one should succeed
      expect(conflictOrLockCount).toBe(4); // Others should conflict or hit lock timeout
    }, 15000); // Increase timeout for concurrent test
  });

  describe("Error Handling", () => {
    it("should return 409 for conflicts", async () => {
      const date = `${baseDate.split('-')[0]}-${baseDate.split('-')[1]}-09`;
      const payload = {
        courtId: "7",
        date,
        timeSlot: { start: "17:00", end: "18:00" },
        customerName: "Error Test User",
        customerEmail: "error@example.com",
        customerPhone: "401-555-8888",
      };

      await request(app).post("/api/reservations").send(payload);

      // Try to create overlapping reservation
      const overlappingPayload = {
        ...payload,
        date, // Use same date
        timeSlot: { start: "17:30", end: "18:30" },
      };

      const response = await request(app)
        .post("/api/reservations")
        .send(overlappingPayload);

      expect(response.status).toBe(409);
      expect(response.body.code).toBe("CONFLICT");
      expect(response.body.error).toBeDefined();
    });

    it("should return 400 for missing required fields", async () => {
      const date = `${baseDate.split('-')[0]}-${baseDate.split('-')[1]}-10`;
      const incompletePayload = {
        courtId: "1",
        date,
        // Missing timeSlot, customerName, etc.
      };

      const response = await request(app)
        .post("/api/reservations")
        .send(incompletePayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Missing required fields");
    });

    it("should return 400 for invalid email", async () => {
      const date = `${baseDate.split('-')[0]}-${baseDate.split('-')[1]}-11`;
      const payload = {
        courtId: "1",
        date,
        timeSlot: { start: "18:00", end: "19:00" },
        customerName: "Invalid Email User",
        customerEmail: "invalid-email", // Invalid format
        customerPhone: "401-555-9999",
      };

      const response = await request(app)
        .post("/api/reservations")
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid email");
    });
  });
});
