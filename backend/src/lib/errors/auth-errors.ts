/**
 * Custom error classes for authentication operations
 */

export class AuthError extends Error {
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
 * Thrown when authentication fails (invalid credentials)
 */
export class AuthenticationError extends AuthError {
  constructor(message: string = "Invalid email or password") {
    super(message, "AUTHENTICATION_FAILED");
  }
}

/**
 * Thrown when email is already registered
 */
export class EmailAlreadyExistsError extends AuthError {
  constructor(message: string = "Email already registered") {
    super(message, "EMAIL_EXISTS");
  }
}

/**
 * Thrown when email verification token is invalid or expired
 */
export class InvalidVerificationTokenError extends AuthError {
  constructor(message: string = "Invalid or expired verification token") {
    super(message, "INVALID_VERIFICATION_TOKEN");
  }
}

/**
 * Thrown when email is not verified
 */
export class EmailNotVerifiedError extends AuthError {
  constructor(message: string = "Email not verified") {
    super(message, "EMAIL_NOT_VERIFIED");
  }
}

/**
 * Thrown when password reset token is invalid or expired
 */
export class InvalidResetTokenError extends AuthError {
  constructor(message: string = "Invalid or expired reset token") {
    super(message, "INVALID_RESET_TOKEN");
  }
}

/**
 * Thrown when session is invalid or expired
 */
export class InvalidSessionError extends AuthError {
  constructor(message: string = "Invalid or expired session") {
    super(message, "INVALID_SESSION");
  }
}

/**
 * Thrown when authentication is required but not provided
 */
export class UnauthorizedError extends AuthError {
  constructor(message: string = "Authentication required") {
    super(message, "UNAUTHORIZED");
  }
}

/**
 * Thrown when user doesn't have required permissions
 */
export class ForbiddenError extends AuthError {
  constructor(message: string = "Insufficient permissions") {
    super(message, "FORBIDDEN");
  }
}
