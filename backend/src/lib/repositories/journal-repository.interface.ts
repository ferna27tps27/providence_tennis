/**
 * Repository interface for journal entry data access
 */

import { JournalEntry, JournalFilter } from "../../types/journal";

export interface IJournalRepository {
  /**
   * Get all journal entries with optional filtering
   */
  findAll(filter?: JournalFilter): Promise<JournalEntry[]>;

  /**
   * Get journal entry by ID
   */
  findById(id: string): Promise<JournalEntry | null>;

  /**
   * Get journal entries for a specific player
   */
  findByPlayerId(playerId: string, filter?: JournalFilter): Promise<JournalEntry[]>;

  /**
   * Get journal entries for a specific coach
   */
  findByCoachId(coachId: string, filter?: JournalFilter): Promise<JournalEntry[]>;

  /**
   * Create a new journal entry
   */
  create(
    entry: Omit<JournalEntry, "id" | "createdAt" | "lastModified">
  ): Promise<JournalEntry>;

  /**
   * Update an existing journal entry
   */
  update(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry>;

  /**
   * Delete a journal entry
   */
  delete(id: string): Promise<boolean>;
}
