/**
 * Custom error classes for reservation operations
 */

export class ReservationError extends Error {
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
 * Thrown when a reservation conflicts with an existing one
 */
export class ConflictError extends ReservationError {
  constructor(message: string = 'Time slot is already reserved') {
    super(message, 'CONFLICT');
  }
}

/**
 * Thrown when input validation fails
 */
export class ValidationError extends ReservationError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

/**
 * Thrown when a resource is not found
 */
export class NotFoundError extends ReservationError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND');
  }
}

/**
 * Thrown when a file lock cannot be acquired
 */
export class LockError extends ReservationError {
  constructor(message: string = 'Could not acquire lock') {
    super(message, 'LOCK_ERROR');
  }
}
