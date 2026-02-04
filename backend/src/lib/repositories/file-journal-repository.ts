/**
 * File-based implementation of IJournalRepository
 * 
 * Uses JSON file storage with file locking for concurrency control
 */

import { promises as fs } from "fs";
import path from "path";
import { JournalEntry, JournalFilter } from "../../types/journal";
import { IJournalRepository } from "./journal-repository.interface";
import { FileLock } from "../utils/file-lock";
import {
  JournalEntryNotFoundError,
  JournalLockError,
} from "../errors/journal-errors";

function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.isAbsolute(process.env.DATA_DIR)
      ? process.env.DATA_DIR
      : path.join(process.cwd(), process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

function getJournalFile(): string {
  return path.join(getDataDir(), "journal-entries.json");
}

/**
 * Ensure data directory and files exist
 */
async function ensureDataFiles(): Promise<void> {
  try {
    const dataDir = getDataDir();
    const journalFile = getJournalFile();
    await fs.mkdir(dataDir, { recursive: true });

    try {
      await fs.access(journalFile);
    } catch {
      await fs.writeFile(journalFile, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error("Error initializing journal data files:", error);
    throw error;
  }
}

/**
 * Read all journal entries from file
 */
async function readJournalEntries(): Promise<JournalEntry[]> {
  await ensureDataFiles();
  try {
    const data = await fs.readFile(getJournalFile(), "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading journal entries:", error);
    return [];
  }
}

/**
 * Write journal entries to file
 */
async function writeJournalEntries(entries: JournalEntry[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(getJournalFile(), JSON.stringify(entries, null, 2));
}

/**
 * Filter journal entries
 */
function filterEntries(entries: JournalEntry[], filter?: JournalFilter): JournalEntry[] {
  if (!filter) {
    return entries;
  }

  let filtered = entries;

  if (filter.playerId) {
    filtered = filtered.filter((e) => e.playerId === filter.playerId);
  }

  if (filter.coachId) {
    filtered = filtered.filter((e) => e.coachId === filter.coachId);
  }

  if (filter.startDate) {
    filtered = filtered.filter((e) => e.sessionDate >= filter.startDate!);
  }

  if (filter.endDate) {
    filtered = filtered.filter((e) => e.sessionDate <= filter.endDate!);
  }

  if (filter.areaWorkedOn) {
    filtered = filtered.filter((e) =>
      e.areasWorkedOn.some((area) =>
        area.toLowerCase().includes(filter.areaWorkedOn!.toLowerCase())
      )
    );
  }

  return filtered;
}

/**
 * File-based journal repository implementation
 */
export class FileJournalRepository implements IJournalRepository {
  /**
   * Get all journal entries with optional filtering
   */
  async findAll(filter?: JournalFilter): Promise<JournalEntry[]> {
    const entries = await readJournalEntries();
    return filterEntries(entries, filter);
  }

  /**
   * Get journal entry by ID
   */
  async findById(id: string): Promise<JournalEntry | null> {
    const entries = await readJournalEntries();
    return entries.find((e) => e.id === id) || null;
  }

  /**
   * Get journal entries for a specific player
   */
  async findByPlayerId(playerId: string, filter?: JournalFilter): Promise<JournalEntry[]> {
    const allEntries = await this.findAll({ ...filter, playerId });
    return allEntries;
  }

  /**
   * Get journal entries for a specific coach
   */
  async findByCoachId(coachId: string, filter?: JournalFilter): Promise<JournalEntry[]> {
    const allEntries = await this.findAll({ ...filter, coachId });
    return allEntries;
  }

  /**
   * Create a new journal entry
   */
  async create(
    entry: Omit<JournalEntry, "id" | "createdAt" | "lastModified">
  ): Promise<JournalEntry> {
    const lock = new FileLock(getJournalFile());
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error: any) {
      throw new JournalLockError(
        `Could not acquire lock for journal entry creation: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const entries = await readJournalEntries();

      // Generate ID (timestamp-based)
      const id = `journal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const newEntry: JournalEntry = {
        ...entry,
        id,
        createdAt: now,
        lastModified: now,
      };

      entries.push(newEntry);
      await writeJournalEntries(entries);

      return newEntry;
    } catch (error: any) {
      if (error instanceof JournalLockError) {
        throw error;
      }
      throw error;
    } finally {
      if (release) {
        await release();
      }
    }
  }

  /**
   * Update an existing journal entry
   */
  async update(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry> {
    const lock = new FileLock(getJournalFile());
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error: any) {
      throw new JournalLockError(
        `Could not acquire lock for journal entry update: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const entries = await readJournalEntries();
      const index = entries.findIndex((e) => e.id === id);

      if (index === -1) {
        throw new JournalEntryNotFoundError(`Journal entry with id ${id} not found`);
      }

      const updatedEntry: JournalEntry = {
        ...entries[index],
        ...updates,
        id, // Ensure ID cannot be changed
        lastModified: new Date().toISOString(),
      };

      entries[index] = updatedEntry;
      await writeJournalEntries(entries);

      return updatedEntry;
    } catch (error: any) {
      if (error instanceof JournalLockError || error instanceof JournalEntryNotFoundError) {
        throw error;
      }
      throw error;
    } finally {
      if (release) {
        await release();
      }
    }
  }

  /**
   * Delete a journal entry
   */
  async delete(id: string): Promise<boolean> {
    const lock = new FileLock(getJournalFile());
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error: any) {
      throw new JournalLockError(
        `Could not acquire lock for journal entry deletion: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const entries = await readJournalEntries();
      const index = entries.findIndex((e) => e.id === id);

      if (index === -1) {
        return false;
      }

      entries.splice(index, 1);
      await writeJournalEntries(entries);

      return true;
    } catch (error: any) {
      if (error instanceof JournalLockError) {
        throw error;
      }
      throw error;
    } finally {
      if (release) {
        await release();
      }
    }
  }
}

// Export singleton instance
export const journalRepository = new FileJournalRepository();
