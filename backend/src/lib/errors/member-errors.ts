/**
 * Custom error classes for member operations
 */

export class MemberError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a member is not found
 */
export class MemberNotFoundError extends MemberError {
  constructor(message: string = "Member not found") {
    super(message, "NOT_FOUND");
  }
}

/**
 * Thrown when email already exists
 */
export class DuplicateEmailError extends MemberError {
  constructor(message: string = "Email already exists") {
    super(message, "DUPLICATE_EMAIL");
  }
}

/**
 * Thrown when member number already exists
 */
export class DuplicateMemberNumberError extends MemberError {
  constructor(message: string = "Member number already exists") {
    super(message, "DUPLICATE_MEMBER_NUMBER");
  }
}

/**
 * Thrown when member status is invalid for the operation
 */
export class InvalidMemberStatusError extends MemberError {
  constructor(message: string = "Member status invalid for this operation") {
    super(message, "INVALID_STATUS");
  }
}

/**
 * Thrown when member data validation fails
 */
export class MemberValidationError extends MemberError {
  constructor(message: string = "Member data validation failed") {
    super(message, "VALIDATION_ERROR");
  }
}

/**
 * Thrown when a file lock cannot be acquired
 */
export class MemberLockError extends MemberError {
  constructor(message: string = "Could not acquire file lock") {
    super(message, "LOCK_ERROR");
  }
}
