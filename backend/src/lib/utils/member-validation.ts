/**
 * Validation utilities for member data
 */

import { Member, MemberRequest } from "../../types/member";
import { MemberValidationError } from "../errors/member-errors";
import { isValidRole } from "./role-utils";

/**
 * Email validation regex pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 * @param email Email address to validate
 * @returns true if valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Normalize email (lowercase, trim)
 * @param email Email address to normalize
 * @returns Normalized email
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Validate member data for creation
 * @param data Member request data
 * @throws MemberValidationError if validation fails
 */
export function validateMemberData(data: MemberRequest): void {
  // Required fields
  if (!data.firstName || data.firstName.trim().length === 0) {
    throw new MemberValidationError("First name is required");
  }

  if (!data.lastName || data.lastName.trim().length === 0) {
    throw new MemberValidationError("Last name is required");
  }

  if (!data.email || data.email.trim().length === 0) {
    throw new MemberValidationError("Email is required");
  }

  // Normalize email before validation
  const normalizedEmail = normalizeEmail(data.email);
  if (!validateEmail(normalizedEmail)) {
    throw new MemberValidationError("Invalid email format");
  }

  if (!data.phone || data.phone.trim().length === 0) {
    throw new MemberValidationError("Phone number is required");
  }

  // Optional field validation
  if (data.dateOfBirth) {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.dateOfBirth)) {
      throw new MemberValidationError("Date of birth must be in YYYY-MM-DD format");
    }
  }

  // Validate role if provided
  if (data.role !== undefined && !isValidRole(data.role)) {
    throw new MemberValidationError(`Invalid role: ${data.role}. Must be one of: player, coach, parent, admin`);
  }
}

/**
 * Validate member update data
 * @param updates Partial member data to validate
 * @throws MemberValidationError if validation fails
 */
export function validateMemberUpdate(updates: Partial<Member>): void {
  // Validate email if provided
  if (updates.email !== undefined) {
    if (updates.email.trim().length === 0) {
      throw new MemberValidationError("Email cannot be empty");
    }
    // Normalize email before validation
    const normalizedEmail = normalizeEmail(updates.email);
    if (!validateEmail(normalizedEmail)) {
      throw new MemberValidationError("Invalid email format");
    }
  }

  // Validate required string fields if provided
  if (updates.firstName !== undefined && updates.firstName.trim().length === 0) {
    throw new MemberValidationError("First name cannot be empty");
  }

  if (updates.lastName !== undefined && updates.lastName.trim().length === 0) {
    throw new MemberValidationError("Last name cannot be empty");
  }

  if (updates.phone !== undefined && updates.phone.trim().length === 0) {
    throw new MemberValidationError("Phone number cannot be empty");
  }

  // Validate date format if provided
  if (updates.dateOfBirth !== undefined && updates.dateOfBirth) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(updates.dateOfBirth)) {
      throw new MemberValidationError("Date of birth must be in YYYY-MM-DD format");
    }
  }

  // Validate penalty cancellations is non-negative
  if (updates.penaltyCancellations !== undefined && updates.penaltyCancellations < 0) {
    throw new MemberValidationError("Penalty cancellations cannot be negative");
  }

  // Validate role if provided
  if (updates.role !== undefined && !isValidRole(updates.role)) {
    throw new MemberValidationError(`Invalid role: ${updates.role}. Must be one of: player, coach, parent, admin`);
  }
}
