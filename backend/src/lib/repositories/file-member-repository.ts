/**
 * File-based implementation of IMemberRepository
 * 
 * Uses JSON file storage with file locking for concurrency control
 */

import { promises as fs } from "fs";
import path from "path";
import { Member, MemberFilter } from "../../types/member";
import { IMemberRepository } from "./member-repository.interface";
import { FileLock } from "../utils/file-lock";
import { memberCache } from "../cache/member-cache";
import {
  MemberNotFoundError,
  DuplicateEmailError,
  DuplicateMemberNumberError,
  MemberLockError,
} from "../errors/member-errors";
import { normalizeEmail } from "../utils/member-validation";

function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.isAbsolute(process.env.DATA_DIR)
      ? process.env.DATA_DIR
      : path.join(process.cwd(), process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

function getMembersFile(): string {
  return path.join(getDataDir(), "members.json");
}

/**
 * Ensure data directory and files exist
 */
async function ensureDataFiles(): Promise<void> {
  try {
    const dataDir = getDataDir();
    const membersFile = getMembersFile();
    await fs.mkdir(dataDir, { recursive: true });

    try {
      await fs.access(membersFile);
    } catch {
      await fs.writeFile(membersFile, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error("Error initializing member data files:", error);
    throw error;
  }
}

/**
 * Read all members from file
 */
async function readMembers(): Promise<Member[]> {
  await ensureDataFiles();
  try {
    const data = await fs.readFile(getMembersFile(), "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading members:", error);
    return [];
  }
}

/**
 * Write members to file
 */
async function writeMembers(members: Member[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(getMembersFile(), JSON.stringify(members, null, 2));
}

/**
 * Generate sequential member number (MEM-0001, MEM-0002, etc.)
 */
async function generateMemberNumber(): Promise<string> {
  const members = await readMembers();
  
  // Find the highest member number
  let maxNumber = 0;
  for (const member of members) {
    const match = member.memberNumber.match(/^MEM-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }
  
  // Generate next number
  const nextNumber = maxNumber + 1;
  return `MEM-${String(nextNumber).padStart(4, "0")}`;
}

/**
 * Search members by query (name, email, phone, member number)
 */
function searchMembers(members: Member[], query: string): Member[] {
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) {
    return members;
  }
  
  return members.filter((member) => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    const email = member.email.toLowerCase();
    const phone = member.phone.toLowerCase();
    const memberNumber = member.memberNumber.toLowerCase();
    
    return (
      fullName.includes(lowerQuery) ||
      email.includes(lowerQuery) ||
      phone.includes(lowerQuery) ||
      memberNumber.includes(lowerQuery)
    );
  });
}

/**
 * Filter members by status
 */
function filterByStatus(members: Member[], status?: "all" | "active" | "inactive"): Member[] {
  if (!status || status === "all") {
    return members;
  }
  
  return members.filter((member) => {
    if (status === "active") {
      return member.isActive === true;
    } else {
      return member.isActive === false;
    }
  });
}

/**
 * File-based member repository implementation
 */
export class FileMemberRepository implements IMemberRepository {
  /**
   * Get all members with optional filtering
   */
  async findAll(filter?: MemberFilter): Promise<Member[]> {
    const cacheKey = filter?.status 
      ? `member:${filter.status}` 
      : "member:all";
    
    // Check cache first
    const cached = memberCache.get<Member[]>(cacheKey);
    if (cached) {
      // Apply search filter if provided
      if (filter?.search) {
        return searchMembers(cached, filter.search);
      }
      return cached;
    }
    
    let members = await readMembers();
    
    // Apply status filter
    if (filter?.status) {
      members = filterByStatus(members, filter.status);
    }
    
    // Apply search filter
    if (filter?.search) {
      members = searchMembers(members, filter.search);
    }
    
    // Cache the result (only if no search, as search results vary)
    if (!filter?.search) {
      memberCache.set(cacheKey, members);
    }
    
    return members;
  }

  /**
   * Get member by ID
   */
  async findById(id: string): Promise<Member | null> {
    const cacheKey = `member:${id}`;
    
    // Check cache first
    const cached = memberCache.get<Member>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const members = await readMembers();
    const member = members.find((m) => m.id === id) || null;
    
    // Cache if found
    if (member) {
      memberCache.set(cacheKey, member);
    }
    
    return member;
  }

  /**
   * Get member by email
   */
  async findByEmail(email: string): Promise<Member | null> {
    const normalizedEmail = normalizeEmail(email);
    const cacheKey = `member:email:${normalizedEmail}`;
    
    // Check cache first
    const cached = memberCache.get<Member>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const members = await readMembers();
    const member = members.find((m) => normalizeEmail(m.email) === normalizedEmail) || null;
    
    // Cache if found
    if (member) {
      memberCache.set(cacheKey, member);
    }
    
    return member;
  }

  /**
   * Get member by member number
   */
  async findByMemberNumber(memberNumber: string): Promise<Member | null> {
    const cacheKey = `member:number:${memberNumber}`;
    
    // Check cache first
    const cached = memberCache.get<Member>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const members = await readMembers();
    const member = members.find((m) => m.memberNumber === memberNumber) || null;
    
    // Cache if found
    if (member) {
      memberCache.set(cacheKey, member);
    }
    
    return member;
  }

  /**
   * Search members by query
   */
  async search(query: string): Promise<Member[]> {
    const members = await readMembers();
    return searchMembers(members, query);
  }

  /**
   * Create a new member
   */
  async create(
    memberData: Omit<Member, "id" | "createdAt" | "lastModified">
  ): Promise<Member> {
      // Acquire file lock to prevent race conditions
    const lock = new FileLock(getMembersFile());
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error) {
      throw new MemberLockError(
        `Could not acquire lock for member creation: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const members = await readMembers();
      const normalizedEmail = normalizeEmail(memberData.email);

      // Check for duplicate email
      const existingByEmail = members.find(
        (m) => normalizeEmail(m.email) === normalizedEmail
      );
      if (existingByEmail) {
        throw new DuplicateEmailError(
          `Email ${memberData.email} is already registered`
        );
      }

      // Generate member number if not provided
      let memberNumber = memberData.memberNumber;
      if (!memberNumber) {
        memberNumber = await generateMemberNumber();
      }

      // Check for duplicate member number
      const existingByNumber = members.find(
        (m) => m.memberNumber === memberNumber
      );
      if (existingByNumber) {
        throw new DuplicateMemberNumberError(
          `Member number ${memberNumber} already exists`
        );
      }

      const newMember: Member = {
        id: Date.now().toString(),
        ...memberData,
        email: normalizedEmail, // Store normalized email
        memberNumber,
        isActive: memberData.isActive !== undefined ? memberData.isActive : true,
        penaltyCancellations: memberData.penaltyCancellations || 0,
        unsubscribeEmail: memberData.unsubscribeEmail || false,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      };

      members.push(newMember);
      await writeMembers(members);

      // Invalidate relevant caches
      // Invalidate status-specific cache based on new member's status
      if (newMember.isActive) {
        memberCache.invalidate("member:active");
      } else {
        memberCache.invalidate("member:inactive");
      }
      // Always invalidate "all" cache
      memberCache.invalidate("member:all");

      return newMember;
    } finally {
      // Always release the lock
      if (release) {
        await release();
      }
    }
  }

  /**
   * Update an existing member
   */
  async update(id: string, updates: Partial<Member>): Promise<Member> {
    // Acquire file lock
    const lock = new FileLock(getMembersFile());
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error) {
      throw new MemberLockError(
        `Could not acquire lock for member update: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const members = await readMembers();
      const index = members.findIndex((m) => m.id === id);

      if (index === -1) {
        throw new MemberNotFoundError(`Member with id ${id}`);
      }

      const existingMember = members[index];

      // If email is being updated, check for duplicates
      if (updates.email) {
        const normalizedEmail = normalizeEmail(updates.email);
        const existingByEmail = members.find(
          (m) => m.id !== id && normalizeEmail(m.email) === normalizedEmail
        );
        if (existingByEmail) {
          throw new DuplicateEmailError(
            `Email ${updates.email} is already registered`
          );
        }
        updates.email = normalizedEmail; // Store normalized email
      }

      // If member number is being updated, check for duplicates
      if (updates.memberNumber) {
        const existingByNumber = members.find(
          (m) => m.id !== id && m.memberNumber === updates.memberNumber
        );
        if (existingByNumber) {
          throw new DuplicateMemberNumberError(
            `Member number ${updates.memberNumber} already exists`
          );
        }
      }

      const updatedMember: Member = {
        ...existingMember,
        ...updates,
        lastModified: new Date().toISOString(),
      };

      members[index] = updatedMember;
      await writeMembers(members);

      // Invalidate specific caches
      memberCache.invalidate(`member:${id}`);
      memberCache.invalidate(`member:email:${normalizeEmail(existingMember.email)}`);
      if (existingMember.email !== updatedMember.email && updates.email) {
        memberCache.invalidate(`member:email:${normalizeEmail(updates.email)}`);
      }
      memberCache.invalidate(`member:number:${existingMember.memberNumber}`);
      if (updates.memberNumber && existingMember.memberNumber !== updates.memberNumber) {
        memberCache.invalidate(`member:number:${updates.memberNumber}`);
      }
      
      // If status changed, invalidate status-specific caches
      if (updates.isActive !== undefined && existingMember.isActive !== updates.isActive) {
        memberCache.invalidate("member:active");
        memberCache.invalidate("member:inactive");
      }
      
      // Always invalidate "all" cache on any update
      memberCache.invalidate("member:all");

      return updatedMember;
    } finally {
      if (release) {
        await release();
      }
    }
  }

  /**
   * Delete/deactivate a member (soft delete by setting isActive: false)
   */
  async delete(id: string): Promise<boolean> {
    // Acquire file lock
    const lock = new FileLock(getMembersFile());
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error) {
      throw new MemberLockError(
        `Could not acquire lock for member deletion: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const members = await readMembers();
      const index = members.findIndex((m) => m.id === id);

      if (index === -1) {
        return false;
      }

      const member = members[index];
      
      // Soft delete: set isActive to false
      members[index].isActive = false;
      members[index].lastModified = new Date().toISOString();
      await writeMembers(members);

      // Invalidate specific caches
      memberCache.invalidate(`member:${id}`);
      memberCache.invalidate(`member:email:${normalizeEmail(member.email)}`);
      memberCache.invalidate(`member:number:${member.memberNumber}`);
      // Status changed to inactive, invalidate both status caches
      memberCache.invalidate("member:active");
      memberCache.invalidate("member:inactive");
      // Always invalidate "all" cache
      memberCache.invalidate("member:all");

      return true;
    } finally {
      if (release) {
        await release();
      }
    }
  }
}

// Export singleton instance
export const memberRepository: IMemberRepository = new FileMemberRepository();
