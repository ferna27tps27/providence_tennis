/**
 * Custom error classes for journal operations
 */

export class JournalError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a journal entry is not found
 */
export class JournalEntryNotFoundError extends JournalError {
  constructor(message: string = "Journal entry not found") {
    super(message, "NOT_FOUND");
  }
}

/**
 * Thrown when journal entry data validation fails
 */
export class JournalValidationError extends JournalError {
  constructor(message: string = "Journal entry data validation failed") {
    super(message, "VALIDATION_ERROR");
  }
}

/**
 * Thrown when user is not authorized to perform the operation
 */
export class JournalAuthorizationError extends JournalError {
  constructor(message: string = "Not authorized to perform this operation") {
    super(message, "UNAUTHORIZED");
  }
}

/**
 * Thrown when a file lock cannot be acquired
 */
export class JournalLockError extends JournalError {
  constructor(message: string = "Could not acquire file lock") {
    super(message, "LOCK_ERROR");
  }
}
