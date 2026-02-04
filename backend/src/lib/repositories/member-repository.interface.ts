/**
 * Repository interface for member data access
 * 
 * This abstraction allows us to swap storage implementations
 * (file-based, database, etc.) without changing business logic
 */

import { Member, MemberFilter } from "../../types/member";

export interface IMemberRepository {
  /**
   * Get all members with optional filtering
   * @param filter Optional filter for status and search
   * @returns Array of members matching the filter
   */
  findAll(filter?: MemberFilter): Promise<Member[]>;

  /**
   * Get member by ID
   * @param id Member ID
   * @returns Member or null if not found
   */
  findById(id: string): Promise<Member | null>;

  /**
   * Get member by email (for login/validation)
   * @param email Member email
   * @returns Member or null if not found
   */
  findByEmail(email: string): Promise<Member | null>;

  /**
   * Get member by member number (for validation)
   * @param memberNumber Member number
   * @returns Member or null if not found
   */
  findByMemberNumber(memberNumber: string): Promise<Member | null>;

  /**
   * Search members by name, email, phone, or member number
   * @param query Search query
   * @returns Array of matching members
   */
  search(query: string): Promise<Member[]>;

  /**
   * Create new member
   * @param member Member data (without id, createdAt, lastModified)
   * @returns Created member with generated id and timestamps
   * @throws DuplicateEmailError if email already exists
   * @throws DuplicateMemberNumberError if member number already exists
   * @throws LockError if lock cannot be acquired
   */
  create(
    member: Omit<Member, "id" | "createdAt" | "lastModified">
  ): Promise<Member>;

  /**
   * Update an existing member
   * @param id Member ID
   * @param updates Partial member data to update
   * @returns Updated member
   * @throws MemberNotFoundError if member not found
   * @throws DuplicateEmailError if email update conflicts
   * @throws LockError if lock cannot be acquired
   */
  update(id: string, updates: Partial<Member>): Promise<Member>;

  /**
   * Delete/deactivate a member (soft delete by setting isActive: false)
   * @param id Member ID
   * @returns true if deleted, false if not found
   * @throws LockError if lock cannot be acquired
   */
  delete(id: string): Promise<boolean>;
}
