/**
 * Repository interface for reservation data access
 * 
 * This abstraction allows us to swap storage implementations
 * (file-based, database, etc.) without changing business logic
 */

import { Reservation } from "../../types/reservation";

export interface IReservationRepository {
  /**
   * Get all reservations
   * @returns Array of all reservations
   */
  findAll(): Promise<Reservation[]>;

  /**
   * Get reservations for a specific date
   * @param date Date in YYYY-MM-DD format
   * @returns Array of reservations for the date
   */
  findByDate(date: string): Promise<Reservation[]>;

  /**
   * Get reservation by ID
   * @param id Reservation ID
   * @returns Reservation or null if not found
   */
  findById(id: string): Promise<Reservation | null>;

  /**
   * Create a new reservation
   * @param reservation Reservation data (without id, createdAt, status)
   * @returns Created reservation with generated id and timestamps
   * @throws ConflictError if time slot conflicts with existing reservation
   * @throws LockError if lock cannot be acquired
   */
  create(
    reservation: Omit<Reservation, "id" | "createdAt" | "status">
  ): Promise<Reservation>;

  /**
   * Update an existing reservation
   * @param id Reservation ID
   * @param updates Partial reservation data to update
   * @returns Updated reservation
   * @throws NotFoundError if reservation not found
   * @throws ConflictError if updated time slot conflicts
   * @throws LockError if lock cannot be acquired
   */
  update(id: string, updates: Partial<Reservation>): Promise<Reservation>;

  /**
   * Delete (cancel) a reservation
   * @param id Reservation ID
   * @returns true if deleted, false if not found
   * @throws LockError if lock cannot be acquired
   */
  delete(id: string): Promise<boolean>;

  /**
   * Check if a time slot is available for a given court and date
   * @param courtId Court ID to check
   * @param date Date in YYYY-MM-DD format
   * @param start Start time in HH:mm format
   * @param end End time in HH:mm format
   * @param excludeReservationId Optional reservation ID to exclude from check (useful for updates)
   * @returns true if available, false if conflicted
   */
  checkAvailability(
    courtId: string,
    date: string,
    start: string,
    end: string,
    excludeReservationId?: string
  ): Promise<boolean>;
}
