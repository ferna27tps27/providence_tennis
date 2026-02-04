/**
 * Unit tests for FileReservationRepository
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import { FileReservationRepository } from "../../lib/repositories/file-reservation-repository";
import { Reservation } from "../../types/reservation";
import { reservationCache } from "../../lib/cache/reservation-cache";
import { ConflictError, NotFoundError } from "../../lib/errors/reservation-errors";

let tempDir = "";
let repository: FileReservationRepository;

beforeAll(async () => {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), `pta-repo-${uniqueId}-`));
  tempDir = baseDir;
  process.env.DATA_DIR = tempDir;
});

beforeEach(async () => {
  reservationCache.clear();
  
  if (!tempDir) return;
  try {
    // Ensure directory exists
    await fs.mkdir(tempDir, { recursive: true });
    
    const reservationsFile = path.join(tempDir, "reservations.json");
    const lockFile = path.join(tempDir, "reservations.json.lock");
    
    // Remove lock file if it exists
    await fs.unlink(lockFile).catch(() => {});
    
    // Wait a bit for locks to release
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Clear reservations file - write empty array
    await fs.writeFile(reservationsFile, JSON.stringify([], null, 2));
    
    // Verify file is empty
    const content = await fs.readFile(reservationsFile, "utf-8");
    const data = JSON.parse(content);
    if (data.length > 0) {
      // Force clear if not empty
      await fs.writeFile(reservationsFile, JSON.stringify([], null, 2));
    }
    
    // Create fresh repository instance after cleanup
    repository = new FileReservationRepository();
    
    // Small delay to ensure file operations complete
    await new Promise(resolve => setTimeout(resolve, 50));
  } catch (error) {
    console.error("Error in beforeEach:", error);
    // Still create repository even if cleanup fails
    repository = new FileReservationRepository();
  }
});

afterEach(async () => {
  reservationCache.clear();
});

describe("FileReservationRepository", () => {
  describe("create", () => {
    it("should create a new reservation", async () => {
      // Use unique time based on test execution
      const uniqueId = Date.now() % 1000;
      const hour = 10 + Math.floor(uniqueId / 60);
      const min = uniqueId % 60;
      
      const reservationData = {
        courtId: "1",
        courtName: "Court 1",
        date: "2026-02-10",
        timeSlot: { 
          start: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`, 
          end: `${String(hour + 1).padStart(2, '0')}:${String(min).padStart(2, '0')}` 
        },
        customerName: "Test User",
        customerEmail: "test@example.com",
        customerPhone: "401-555-0000",
      };

      const reservation = await repository.create(reservationData);

      expect(reservation.id).toBeDefined();
      expect(reservation.status).toBe("confirmed");
      expect(reservation.createdAt).toBeDefined();
      expect(reservation.customerEmail).toBe(reservationData.customerEmail);
    });

    it("should throw ConflictError for overlapping time slots", async () => {
      const uniqueId = (Date.now() + 100) % 1000;
      const hour = 10 + Math.floor(uniqueId / 60);
      const min = uniqueId % 60;
      
      const reservationData = {
        courtId: "1",
        courtName: "Court 1",
        date: "2026-02-11",
        timeSlot: { 
          start: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`, 
          end: `${String(hour + 1).padStart(2, '0')}:${String(min).padStart(2, '0')}` 
        },
        customerName: "First User",
        customerEmail: "first@example.com",
        customerPhone: "401-555-1111",
      };

      await repository.create(reservationData);

      // Try to create overlapping reservation (30 min offset)
      const overlapMin = (min + 30) % 60;
      const overlapHour = min + 30 >= 60 ? hour + 1 : hour;
      const overlappingData = {
        ...reservationData,
        timeSlot: { 
          start: `${String(overlapHour).padStart(2, '0')}:${String(overlapMin).padStart(2, '0')}`, 
          end: `${String(overlapHour + 1).padStart(2, '0')}:${String(overlapMin).padStart(2, '0')}` 
        },
        customerEmail: "second@example.com",
      };

      await expect(repository.create(overlappingData)).rejects.toThrow(
        ConflictError
      );
    });

    it("should allow overlapping reservations on different courts", async () => {
      const uniqueId = (Date.now() + 200) % 1000;
      const hour = 10 + Math.floor(uniqueId / 60);
      const min = uniqueId % 60;
      
      const reservationData1 = {
        courtId: "1",
        courtName: "Court 1",
        date: "2026-02-12",
        timeSlot: { 
          start: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`, 
          end: `${String(hour + 1).padStart(2, '0')}:${String(min).padStart(2, '0')}` 
        },
        customerName: "Court 1 User",
        customerEmail: "court1@example.com",
        customerPhone: "401-555-2222",
      };

      const reservationData2 = {
        ...reservationData1,
        courtId: "2",
        courtName: "Court 2",
        customerEmail: "court2@example.com",
      };

      const res1 = await repository.create(reservationData1);
      const res2 = await repository.create(reservationData2);

      expect(res1.id).toBeDefined();
      expect(res2.id).toBeDefined();
      expect(res1.courtId).toBe("1");
      expect(res2.courtId).toBe("2");
    });
  });

  describe("findById", () => {
    it("should return reservation by ID", async () => {
      const uniqueId = (Date.now() + 300) % 1000;
      const hour = 10 + Math.floor(uniqueId / 60);
      const min = uniqueId % 60;
      
      const reservationData = {
        courtId: "1",
        courtName: "Court 1",
        date: "2026-02-13",
        timeSlot: { 
          start: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`, 
          end: `${String(hour + 1).padStart(2, '0')}:${String(min).padStart(2, '0')}` 
        },
        customerName: "Find Test",
        customerEmail: "find@example.com",
        customerPhone: "401-555-3333",
      };

      const created = await repository.create(reservationData);
      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.customerEmail).toBe(reservationData.customerEmail);
    });

    it("should return null for non-existent ID", async () => {
      const found = await repository.findById("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("findByDate", () => {
    it("should return reservations for a specific date", async () => {
      const date = "2026-02-14";
      // Use more unique time slots to avoid conflicts
      const uniqueId = Date.now() % 10000;
      const hour1 = 10 + (uniqueId % 5);
      const hour2 = 15 + (uniqueId % 5);

      const reservationData1 = {
        courtId: "1",
        courtName: "Court 1",
        date,
        timeSlot: { 
          start: `${String(hour1).padStart(2, '0')}:00`, 
          end: `${String(hour1 + 1).padStart(2, '0')}:00` 
        },
        customerName: "Date Test 1",
        customerEmail: `date1-${uniqueId}@example.com`,
        customerPhone: "401-555-4444",
      };

      const reservationData2 = {
        ...reservationData1,
        courtId: "2", // Different court to avoid conflicts
        timeSlot: { 
          start: `${String(hour2).padStart(2, '0')}:00`, 
          end: `${String(hour2 + 1).padStart(2, '0')}:00` 
        },
        customerEmail: `date2-${uniqueId}@example.com`,
      };

      await repository.create(reservationData1);
      await repository.create(reservationData2);

      const reservations = await repository.findByDate(date);

      expect(reservations.length).toBe(2);
      expect(reservations.every((r) => r.date === date)).toBe(true);
      expect(reservations.every((r) => r.status === "confirmed")).toBe(true);
    });

    it("should not return cancelled reservations", async () => {
      const date = "2026-02-15";
      const uniqueId = Date.now() % 10000;
      const hour = 10 + (uniqueId % 5);
      
      const reservationData = {
        courtId: "1",
        courtName: "Court 1",
        date,
        timeSlot: { 
          start: `${String(hour).padStart(2, '0')}:00`, 
          end: `${String(hour + 1).padStart(2, '0')}:00` 
        },
        customerName: "Cancel Test",
        customerEmail: `cancel-${uniqueId}@example.com`,
        customerPhone: "401-555-5555",
      };

      const created = await repository.create(reservationData);
      await repository.delete(created.id);

      const reservations = await repository.findByDate(date);
      expect(reservations.length).toBe(0);
    });
  });

  describe("update", () => {
    it("should update reservation fields", async () => {
      const uniqueId = (Date.now() + 600) % 1000;
      const hour = 10 + Math.floor(uniqueId / 60);
      const min = uniqueId % 60;
      
      const reservationData = {
        courtId: "1",
        courtName: "Court 1",
        date: "2026-02-16",
        timeSlot: { 
          start: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`, 
          end: `${String(hour + 1).padStart(2, '0')}:${String(min).padStart(2, '0')}` 
        },
        customerName: "Update Test",
        customerEmail: "update@example.com",
        customerPhone: "401-555-6666",
      };

      const created = await repository.create(reservationData);
      const updated = await repository.update(created.id, {
        customerName: "Updated Name",
        notes: "Updated notes",
      });

      expect(updated.customerName).toBe("Updated Name");
      expect(updated.notes).toBe("Updated notes");
      expect(updated.id).toBe(created.id);
    });

    it("should throw NotFoundError for non-existent reservation", async () => {
      await expect(
        repository.update("non-existent-id", { customerName: "New Name" })
      ).rejects.toThrow(NotFoundError);
    });

    it("should check for conflicts when updating time slot", async () => {
      const date = "2026-02-17";
      const uniqueId = (Date.now() + 700) % 1000;
      const hour1 = 10 + Math.floor(uniqueId / 60);
      const min1 = uniqueId % 60;
      const hour2 = hour1 + 2; // Non-overlapping initially
      const min2 = min1;

      const reservationData1 = {
        courtId: "1",
        courtName: "Court 1",
        date,
        timeSlot: { 
          start: `${String(hour1).padStart(2, '0')}:${String(min1).padStart(2, '0')}`, 
          end: `${String(hour1 + 1).padStart(2, '0')}:${String(min1).padStart(2, '0')}` 
        },
        customerName: "Conflict Test 1",
        customerEmail: "conflict1@example.com",
        customerPhone: "401-555-7777",
      };

      const reservationData2 = {
        ...reservationData1,
        timeSlot: { 
          start: `${String(hour2).padStart(2, '0')}:${String(min2).padStart(2, '0')}`, 
          end: `${String(hour2 + 1).padStart(2, '0')}:${String(min2).padStart(2, '0')}` 
        },
        customerEmail: "conflict2@example.com",
      };

      const res1 = await repository.create(reservationData1);
      const res2 = await repository.create(reservationData2);

      // Try to update res2 to overlap with res1 (30 min offset to create overlap)
      const overlapMin = (min1 + 30) % 60;
      const overlapHour = min1 + 30 >= 60 ? hour1 + 1 : hour1;
      await expect(
        repository.update(res2.id, {
          timeSlot: { 
            start: `${String(overlapHour).padStart(2, '0')}:${String(overlapMin).padStart(2, '0')}`, 
            end: `${String(overlapHour + 1).padStart(2, '0')}:${String(overlapMin).padStart(2, '0')}` 
          },
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("delete", () => {
    it("should cancel a reservation", async () => {
      const uniqueId = (Date.now() + 800) % 1000;
      const hour = 10 + Math.floor(uniqueId / 60);
      const min = uniqueId % 60;
      
      const reservationData = {
        courtId: "1",
        courtName: "Court 1",
        date: "2026-02-18",
        timeSlot: { 
          start: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`, 
          end: `${String(hour + 1).padStart(2, '0')}:${String(min).padStart(2, '0')}` 
        },
        customerName: "Delete Test",
        customerEmail: "delete@example.com",
        customerPhone: "401-555-8888",
      };

      const created = await repository.create(reservationData);
      const deleted = await repository.delete(created.id);

      expect(deleted).toBe(true);

      const found = await repository.findById(created.id);
      expect(found?.status).toBe("cancelled");
    });

    it("should return false for non-existent reservation", async () => {
      const deleted = await repository.delete("non-existent-id");
      expect(deleted).toBe(false);
    });
  });

  describe("checkAvailability", () => {
    it("should return true for available time slot", async () => {
      const available = await repository.checkAvailability(
        "1",
        "2026-02-19",
        "10:00",
        "11:00"
      );
      expect(available).toBe(true);
    });

    it("should return false for conflicted time slot", async () => {
      const uniqueId = (Date.now() + 900) % 1000;
      const hour = 10 + Math.floor(uniqueId / 60);
      const min = uniqueId % 60;
      
      const reservationData = {
        courtId: "1",
        courtName: "Court 1",
        date: "2026-02-20",
        timeSlot: { 
          start: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`, 
          end: `${String(hour + 1).padStart(2, '0')}:${String(min).padStart(2, '0')}` 
        },
        customerName: "Avail Test",
        customerEmail: "avail@example.com",
        customerPhone: "401-555-9999",
      };

      await repository.create(reservationData);

      // Check overlapping time (30 min offset)
      const overlapMin = (min + 30) % 60;
      const overlapHour = min + 30 >= 60 ? hour + 1 : hour;
      const available = await repository.checkAvailability(
        "1",
        "2026-02-20",
        `${String(overlapHour).padStart(2, '0')}:${String(overlapMin).padStart(2, '0')}`,
        `${String(overlapHour + 1).padStart(2, '0')}:${String(overlapMin).padStart(2, '0')}`
      );
      expect(available).toBe(false);
    });

    it("should exclude reservation ID when checking availability", async () => {
      const uniqueId = (Date.now() + 950) % 1000;
      const hour = 10 + Math.floor(uniqueId / 60);
      const min = uniqueId % 60;
      
      const reservationData = {
        courtId: "1",
        courtName: "Court 1",
        date: "2026-02-21",
        timeSlot: { 
          start: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`, 
          end: `${String(hour + 1).padStart(2, '0')}:${String(min).padStart(2, '0')}` 
        },
        customerName: "Exclude Test",
        customerEmail: "exclude@example.com",
        customerPhone: "401-555-0000",
      };

      const created = await repository.create(reservationData);

      // Should be available when excluding the reservation itself
      const available = await repository.checkAvailability(
        "1",
        "2026-02-21",
        `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
        `${String(hour + 1).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
        created.id
      );
      expect(available).toBe(true);
    });
  });
});
