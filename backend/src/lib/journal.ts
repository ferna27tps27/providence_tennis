/**
 * Business logic layer for journal operations
 */

import { JournalEntry, JournalEntryRequest, JournalFilter } from "../types/journal";
import { journalRepository } from "./repositories/file-journal-repository";
import {
  JournalEntryNotFoundError,
  JournalValidationError,
  JournalAuthorizationError,
} from "./errors/journal-errors";
import { getMember } from "./members";
import { MemberNotFoundError } from "./errors/member-errors";
import { normalizeRole } from "./utils/role-utils";

/**
 * Validate journal entry data
 */
function validateJournalEntry(data: JournalEntryRequest): void {
  if (!data.playerId) {
    throw new JournalValidationError("playerId is required");
  }
  
  // Ensure playerId is a string (handle case where object might be passed)
  if (typeof data.playerId !== "string") {
    throw new JournalValidationError(`playerId must be a string, got ${typeof data.playerId}`);
  }

  if (!data.sessionDate || typeof data.sessionDate !== "string") {
    throw new JournalValidationError("sessionDate is required");
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(data.sessionDate)) {
    throw new JournalValidationError("sessionDate must be in YYYY-MM-DD format");
  }

  if (!data.summary || typeof data.summary !== "string" || data.summary.trim().length === 0) {
    throw new JournalValidationError("summary is required");
  }

  if (!Array.isArray(data.areasWorkedOn)) {
    throw new JournalValidationError("areasWorkedOn must be an array");
  }

  if (!data.pointersForNextSession || typeof data.pointersForNextSession !== "string" || data.pointersForNextSession.trim().length === 0) {
    throw new JournalValidationError("pointersForNextSession is required");
  }

  // Validate sessionTime format if provided (HH:mm)
  if (data.sessionTime) {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.sessionTime)) {
      throw new JournalValidationError("sessionTime must be in HH:mm format");
    }
  }
}

/**
 * Create a new journal entry
 */
export async function createJournalEntry(
  data: JournalEntryRequest,
  coachId: string
): Promise<JournalEntry> {
  // Validate data
  validateJournalEntry(data);

  // Verify player exists
  try {
    await getMember(data.playerId);
  } catch (error) {
    if (error instanceof MemberNotFoundError) {
      throw new JournalValidationError(`Player with id ${data.playerId} not found`);
    }
    throw error;
  }

  // Verify coach exists
  try {
    const coach = await getMember(coachId);
    const coachRole = normalizeRole(coach.role);
    if (coachRole !== "coach" && coachRole !== "admin") {
      throw new JournalAuthorizationError("Only coaches and admins can create journal entries");
    }
  } catch (error) {
    if (error instanceof MemberNotFoundError) {
      throw new JournalValidationError(`Coach with id ${coachId} not found`);
    }
    throw error;
  }

  // Create entry via repository
  // Ensure playerId is a string (defensive check)
  const playerIdString = String(data.playerId);
  const coachIdString = String(coachId);
  
  return journalRepository.create({
    playerId: playerIdString,
    coachId: coachIdString,
    reservationId: data.reservationId,
    sessionDate: data.sessionDate,
    sessionTime: data.sessionTime,
    summary: data.summary.trim(),
    areasWorkedOn: data.areasWorkedOn.map((area) => area.trim()).filter((area) => area.length > 0),
    pointersForNextSession: data.pointersForNextSession.trim(),
    additionalNotes: data.additionalNotes?.trim(),
    createdBy: coachIdString,
  });
}

/**
 * Get journal entry by ID
 */
export async function getJournalEntry(id: string): Promise<JournalEntry> {
  const entry = await journalRepository.findById(id);

  if (!entry) {
    throw new JournalEntryNotFoundError(`Journal entry with id ${id} not found`);
  }

  return entry;
}

/**
 * Get journal entries with optional filtering
 */
export async function getJournalEntries(filter?: JournalFilter): Promise<JournalEntry[]> {
  return journalRepository.findAll(filter);
}

/**
 * Update journal entry
 */
export async function updateJournalEntry(
  id: string,
  updates: Partial<JournalEntryRequest>,
  userId: string
): Promise<JournalEntry> {
  const entry = await getJournalEntry(id);

  // Only creator (coach) can update
  if (entry.createdBy !== userId) {
    const user = await getMember(userId);
    const userRole = normalizeRole(user.role);
    if (userRole !== "admin") {
      throw new JournalAuthorizationError("Only the entry creator or admin can update journal entries");
    }
  }

  // Validate updates if provided
  if (updates.sessionDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(updates.sessionDate)) {
      throw new JournalValidationError("sessionDate must be in YYYY-MM-DD format");
    }
  }

  if (updates.sessionTime) {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(updates.sessionTime)) {
      throw new JournalValidationError("sessionTime must be in HH:mm format");
    }
  }

  // Prepare update object
  const updateData: Partial<JournalEntry> = {};
  if (updates.summary !== undefined) {
    updateData.summary = updates.summary.trim();
  }
  if (updates.areasWorkedOn !== undefined) {
    updateData.areasWorkedOn = updates.areasWorkedOn.map((area) => area.trim()).filter((area) => area.length > 0);
  }
  if (updates.pointersForNextSession !== undefined) {
    updateData.pointersForNextSession = updates.pointersForNextSession.trim();
  }
  if (updates.additionalNotes !== undefined) {
    updateData.additionalNotes = updates.additionalNotes?.trim();
  }
  if (updates.sessionDate !== undefined) {
    updateData.sessionDate = updates.sessionDate;
  }
  if (updates.sessionTime !== undefined) {
    updateData.sessionTime = updates.sessionTime;
  }
  if (updates.reservationId !== undefined) {
    updateData.reservationId = updates.reservationId;
  }

  return journalRepository.update(id, updateData);
}

/**
 * Delete journal entry
 */
export async function deleteJournalEntry(id: string, userId: string): Promise<boolean> {
  const entry = await getJournalEntry(id);

  // Only creator (coach) can delete
  if (entry.createdBy !== userId) {
    const user = await getMember(userId);
    const userRole = normalizeRole(user.role);
    if (userRole !== "admin") {
      throw new JournalAuthorizationError("Only the entry creator or admin can delete journal entries");
    }
  }

  return journalRepository.delete(id);
}

/**
 * Check if user can view journal entry
 */
export async function canViewJournalEntry(entryId: string, userId: string): Promise<boolean> {
  const entry = await getJournalEntry(entryId);
  const user = await getMember(userId);
  const userRole = normalizeRole(user.role);

  // Admins can view all
  if (userRole === "admin") {
    return true;
  }

  // Players can view their own entries
  if (entry.playerId === userId) {
    return true;
  }

  // Coaches can view entries for their players
  if (userRole === "coach" && entry.coachId === userId) {
    return true;
  }

  return false;
}
