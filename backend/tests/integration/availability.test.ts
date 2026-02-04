/**
 * Integration tests for availability checking
 * Tests caching, time range overlap detection in availability
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
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), `pta-avail-${Date.now()}-${Math.random().toString(36).substring(7)}-`));
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

describe("Availability Integration Tests", () => {
  it("should return availability for all courts", async () => {
    const response = await request(app).get(
      "/api/availability?date=2026-02-01"
    );

    expect(response.status).toBe(200);
    expect(response.body.date).toBe("2026-02-01");
    expect(Array.isArray(response.body.availability)).toBe(true);
    expect(response.body.availability.length).toBeGreaterThan(0);

    // Check structure
    const court = response.body.availability[0];
    expect(court).toHaveProperty("courtId");
    expect(court).toHaveProperty("courtName");
    expect(court).toHaveProperty("courtType");
    expect(court).toHaveProperty("slots");
    expect(Array.isArray(court.slots)).toBe(true);
  });

  it("should mark slots as unavailable when reserved", async () => {
    const date = "2026-02-02";
    const timeSlot = { start: "10:00", end: "11:00" };

    // Create a reservation
    const payload = {
      courtId: "1",
      date,
      timeSlot,
      customerName: "Availability Test",
      customerEmail: "avail@example.com",
      customerPhone: "401-555-0000",
    };

    await request(app).post("/api/reservations").send(payload);

    // Check availability
    const response = await request(app).get(
      `/api/availability?date=${date}`
    );

    expect(response.status).toBe(200);
    
    // Find court 1
    const court1 = response.body.availability.find(
      (c: any) => c.courtId === "1"
    );
    expect(court1).toBeDefined();

    // Find the reserved slot
    const reservedSlot = court1.slots.find(
      (s: any) => s.start === timeSlot.start && s.end === timeSlot.end
    );
    expect(reservedSlot).toBeDefined();
    expect(reservedSlot.available).toBe(false);
  });

  it("should mark overlapping slots as unavailable", async () => {
    const date = "2026-02-03";
    
    // Create reservation 10:00-11:00
    const payload = {
      courtId: "2",
      date,
      timeSlot: { start: "10:00", end: "11:00" },
      customerName: "Overlap Test",
      customerEmail: "overlap@example.com",
      customerPhone: "401-555-1111",
    };

    await request(app).post("/api/reservations").send(payload);

    // Check availability
    const response = await request(app).get(
      `/api/availability?date=${date}`
    );

    const court2 = response.body.availability.find(
      (c: any) => c.courtId === "2"
    );

    // Slot 10:00-11:00 should be unavailable
    const slot1 = court2.slots.find(
      (s: any) => s.start === "10:00" && s.end === "11:00"
    );
    expect(slot1.available).toBe(false);

    // Slot 10:30-11:30 should also be unavailable (overlaps)
    const slot2 = court2.slots.find(
      (s: any) => s.start === "10:30" && s.end === "11:30"
    );
    if (slot2) {
      expect(slot2.available).toBe(false);
    }
  });

  it("should return 400 for invalid date format", async () => {
    const response = await request(app).get(
      "/api/availability?date=invalid-date"
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Invalid date format");
  });

  it("should return 400 for missing date parameter", async () => {
    const response = await request(app).get("/api/availability");

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Date parameter is required");
  });

  it("should update availability after cancellation", async () => {
    const date = "2026-02-04";
    const timeSlot = { start: "12:00", end: "13:00" };

    // Create reservation
    const payload = {
      courtId: "3",
      date,
      timeSlot,
      customerName: "Cancel Avail Test",
      customerEmail: "cancelavail@example.com",
      customerPhone: "401-555-2222",
    };

    const createResponse = await request(app)
      .post("/api/reservations")
      .send(payload);
    const reservationId = createResponse.body.id;

    // Check availability - slot should be unavailable
    const response1 = await request(app).get(
      `/api/availability?date=${date}`
    );
    const court3Before = response1.body.availability.find(
      (c: any) => c.courtId === "3"
    );
    const slotBefore = court3Before.slots.find(
      (s: any) => s.start === timeSlot.start && s.end === timeSlot.end
    );
    expect(slotBefore.available).toBe(false);

    // Cancel reservation
    await request(app).delete(`/api/reservations/${reservationId}`);

    // Check availability again - slot should be available
    const response2 = await request(app).get(
      `/api/availability?date=${date}`
    );
    const court3After = response2.body.availability.find(
      (c: any) => c.courtId === "3"
    );
    const slotAfter = court3After.slots.find(
      (s: any) => s.start === timeSlot.start && s.end === timeSlot.end
    );
    expect(slotAfter.available).toBe(true);
  });
});
