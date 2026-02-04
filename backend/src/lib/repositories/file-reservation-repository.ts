/**
 * File-based implementation of IReservationRepository
 * 
 * Uses JSON file storage with file locking for concurrency control
 */

import { promises as fs } from "fs";
import path from "path";
import { Reservation } from "../../types/reservation";
import { IReservationRepository } from "./reservation-repository.interface";
import { timeRangesOverlap } from "../utils/time-ranges";
import { FileLock } from "../utils/file-lock";
import { reservationCache } from "../cache/reservation-cache";
import { ConflictError, NotFoundError, LockError } from "../errors/reservation-errors";

const resolvedDataDir = process.env.DATA_DIR
  ? path.isAbsolute(process.env.DATA_DIR)
    ? process.env.DATA_DIR
    : path.join(process.cwd(), process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

const DATA_DIR = resolvedDataDir;
const RESERVATIONS_FILE = path.join(DATA_DIR, "reservations.json");

/**
 * Ensure data directory and files exist
 */
async function ensureDataFiles(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
      await fs.access(RESERVATIONS_FILE);
    } catch {
      await fs.writeFile(RESERVATIONS_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error("Error initializing data files:", error);
    throw error;
  }
}

/**
 * Read all reservations from file
 */
async function readReservations(): Promise<Reservation[]> {
  await ensureDataFiles();
  try {
    const data = await fs.readFile(RESERVATIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading reservations:", error);
    return [];
  }
}

/**
 * Write reservations to file
 */
async function writeReservations(reservations: Reservation[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(
    RESERVATIONS_FILE,
    JSON.stringify(reservations, null, 2)
  );
}

/**
 * File-based reservation repository implementation
 */
export class FileReservationRepository implements IReservationRepository {
  /**
   * Get all reservations
   */
  async findAll(): Promise<Reservation[]> {
    return readReservations();
  }

  /**
   * Get reservations for a specific date
   */
  async findByDate(date: string): Promise<Reservation[]> {
    const reservations = await this.findAll();
    return reservations.filter(
      (r) => r.date === date && r.status === "confirmed"
    );
  }

  /**
   * Get reservation by ID
   */
  async findById(id: string): Promise<Reservation | null> {
    const reservations = await this.findAll();
    return reservations.find((r) => r.id === id) || null;
  }

  /**
   * Create a new reservation
   */
  async create(
    reservationData: Omit<Reservation, "id" | "createdAt" | "status">
  ): Promise<Reservation> {
    // Acquire file lock to prevent race conditions
    const lock = new FileLock(RESERVATIONS_FILE);
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error) {
      throw new LockError(
        `Could not acquire lock for reservation creation: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const reservations = await readReservations();

      // Check for conflicts using time range overlap detection
      const conflict = reservations.find(
        (r) =>
          r.courtId === reservationData.courtId &&
          r.date === reservationData.date &&
          r.status === "confirmed" &&
          timeRangesOverlap(
            reservationData.timeSlot.start,
            reservationData.timeSlot.end,
            r.timeSlot.start,
            r.timeSlot.end
          )
      );

      if (conflict) {
        throw new ConflictError(
          `Time slot ${reservationData.timeSlot.start}-${reservationData.timeSlot.end} conflicts with existing reservation ${conflict.timeSlot.start}-${conflict.timeSlot.end}`
        );
      }

      const newReservation: Reservation = {
        id: Date.now().toString(),
        ...reservationData,
        createdAt: new Date().toISOString(),
        status: "confirmed",
      };

      reservations.push(newReservation);
      await writeReservations(reservations);

      // Invalidate cache for the reservation date
      reservationCache.invalidate(`availability:${reservationData.date}`);

      return newReservation;
    } finally {
      // Always release the lock
      if (release) {
        await release();
      }
    }
  }

  /**
   * Update an existing reservation
   */
  async update(
    id: string,
    updates: Partial<Reservation>
  ): Promise<Reservation> {
    // Acquire file lock
    const lock = new FileLock(RESERVATIONS_FILE);
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error) {
      throw new LockError(
        `Could not acquire lock for reservation update: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const reservations = await readReservations();
      const index = reservations.findIndex((r) => r.id === id);

      if (index === -1) {
        throw new NotFoundError(`Reservation with id ${id}`);
      }

      const existingReservation = reservations[index];
      const updatedReservation = { ...existingReservation, ...updates };

      // If time slot is being updated, check for conflicts
      if (updates.timeSlot || updates.courtId || updates.date) {
        const checkDate = updates.date || existingReservation.date;
        const checkCourtId = updates.courtId || existingReservation.courtId;
        const checkTimeSlot = updates.timeSlot || existingReservation.timeSlot;

        const conflict = reservations.find(
          (r) =>
            r.id !== id && // Exclude current reservation
            r.courtId === checkCourtId &&
            r.date === checkDate &&
            r.status === "confirmed" &&
            timeRangesOverlap(
              checkTimeSlot.start,
              checkTimeSlot.end,
              r.timeSlot.start,
              r.timeSlot.end
            )
        );

        if (conflict) {
          throw new ConflictError(
            `Updated time slot ${checkTimeSlot.start}-${checkTimeSlot.end} conflicts with existing reservation ${conflict.timeSlot.start}-${conflict.timeSlot.end}`
          );
        }
      }

      reservations[index] = updatedReservation;
      await writeReservations(reservations);

      // Invalidate cache for both old and new dates
      reservationCache.invalidate(`availability:${existingReservation.date}`);
      if (updates.date && updates.date !== existingReservation.date) {
        reservationCache.invalidate(`availability:${updates.date}`);
      }

      return updatedReservation;
    } finally {
      if (release) {
        await release();
      }
    }
  }

  /**
   * Delete (cancel) a reservation
   */
  async delete(id: string): Promise<boolean> {
    // Acquire file lock
    const lock = new FileLock(RESERVATIONS_FILE);
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error) {
      throw new LockError(
        `Could not acquire lock for reservation deletion: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const reservations = await readReservations();
      const index = reservations.findIndex((r) => r.id === id);

      if (index === -1) {
        return false;
      }

      const reservation = reservations[index];
      reservations[index].status = "cancelled";
      await writeReservations(reservations);

      // Invalidate cache for the reservation date
      reservationCache.invalidate(`availability:${reservation.date}`);

      return true;
    } finally {
      if (release) {
        await release();
      }
    }
  }

  /**
   * Check if a time slot is available
   */
  async checkAvailability(
    courtId: string,
    date: string,
    start: string,
    end: string,
    excludeReservationId?: string
  ): Promise<boolean> {
    const reservations = await this.findByDate(date);

    const conflictingReservation = reservations.find(
      (r) =>
        r.courtId === courtId &&
        r.status === "confirmed" &&
        (!excludeReservationId || r.id !== excludeReservationId) &&
        timeRangesOverlap(start, end, r.timeSlot.start, r.timeSlot.end)
    );

    return !conflictingReservation;
  }
}

// Export singleton instance
export const reservationRepository: IReservationRepository =
  new FileReservationRepository();
