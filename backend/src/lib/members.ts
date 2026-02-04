/**
 * Business logic layer for member operations
 * 
 * Provides high-level functions for member management
 */

import { Member, MemberRequest, MemberFilter } from "../types/member";
import { memberRepository } from "./repositories/file-member-repository";
import {
  MemberNotFoundError,
  InvalidMemberStatusError,
  MemberValidationError,
} from "./errors/member-errors";
import { validateMemberData, validateMemberUpdate } from "./utils/member-validation";
import { normalizeRole, isValidRole, MemberRole } from "./utils/role-utils";

/**
 * Create a new member with validation
 */
export async function createMember(data: MemberRequest): Promise<Member> {
  // Validate member data
  validateMemberData(data);
  
  // Normalize role
  const role = normalizeRole(data.role);
  
  // Create member via repository
  return memberRepository.create({
    memberNumber: data.memberNumber,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    isActive: data.isActive !== undefined ? data.isActive : true,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    address: data.address,
    notes: data.notes,
    ntrpRating: data.ntrpRating,
    ustaNumber: data.ustaNumber,
    role: role,
    penaltyCancellations: 0,
    unsubscribeEmail: false,
  });
}

/**
 * Get member by ID
 */
export async function getMember(id: string): Promise<Member> {
  const member = await memberRepository.findById(id);
  
  if (!member) {
    throw new MemberNotFoundError(`Member with id ${id} not found`);
  }
  
  return member;
}

/**
 * Get member by email
 */
export async function getMemberByEmail(email: string): Promise<Member | null> {
  return memberRepository.findByEmail(email);
}

/**
 * Update member
 */
export async function updateMember(
  id: string,
  updates: Partial<Member>
): Promise<Member> {
  // Validate update data
  validateMemberUpdate(updates);
  
  // Update via repository
  return memberRepository.update(id, updates);
}

/**
 * Delete/deactivate member
 */
export async function deleteMember(id: string): Promise<boolean> {
  return memberRepository.delete(id);
}

/**
 * List members with optional filtering
 */
export async function listMembers(filter?: MemberFilter): Promise<Member[]> {
  return memberRepository.findAll(filter);
}

/**
 * Search members by query
 */
export async function searchMembers(query: string): Promise<Member[]> {
  return memberRepository.search(query);
}

/**
 * Validate member is active (throws if not)
 * Critical for reservation integration
 */
export async function validateMemberActive(id: string): Promise<void> {
  const member = await memberRepository.findById(id);
  
  if (!member) {
    throw new MemberNotFoundError(`Member with id ${id} not found`);
  }
  
  if (!member.isActive) {
    throw new InvalidMemberStatusError(
      `Member ${id} is inactive and cannot perform this operation`
    );
  }
}

/**
 * Update member role
 */
export async function updateMemberRole(
  id: string,
  role: MemberRole
): Promise<Member> {
  // Validate role
  if (!isValidRole(role)) {
    throw new MemberValidationError(`Invalid role: ${role}`);
  }
  
  return updateMember(id, { role });
}

/**
 * Get members by role
 */
export async function getMembersByRole(role: MemberRole): Promise<Member[]> {
  const allMembers = await listMembers();
  return allMembers.filter((m) => normalizeRole(m.role) === role);
}

/**
 * Check if member has role
 */
export async function memberHasRole(
  id: string,
  role: MemberRole | MemberRole[]
): Promise<boolean> {
  const member = await getMember(id);
  const memberRole = normalizeRole(member.role);
  const requiredRoles = Array.isArray(role) ? role : [role];
  
  return requiredRoles.includes(memberRole);
}
