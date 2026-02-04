/**
 * Custom error classes for payment operations
 */

export class PaymentError extends Error {
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
 * Thrown when payment is not found
 */
export class PaymentNotFoundError extends PaymentError {
  constructor(message: string = "Payment not found") {
    super(message, "NOT_FOUND");
  }
}

/**
 * Thrown when payment processing fails
 */
export class PaymentProcessingError extends PaymentError {
  constructor(message: string = "Payment processing failed") {
    super(message, "PROCESSING_ERROR");
  }
}

/**
 * Thrown when payment intent creation fails
 */
export class PaymentIntentError extends PaymentError {
  constructor(message: string = "Failed to create payment intent") {
    super(message, "INTENT_ERROR");
  }
}

/**
 * Thrown when payment confirmation fails
 */
export class PaymentConfirmationError extends PaymentError {
  constructor(message: string = "Payment confirmation failed") {
    super(message, "CONFIRMATION_ERROR");
  }
}

/**
 * Thrown when refund fails
 */
export class RefundError extends PaymentError {
  constructor(message: string = "Refund failed") {
    super(message, "REFUND_ERROR");
  }
}

/**
 * Thrown when payment amount is invalid
 */
export class InvalidAmountError extends PaymentError {
  constructor(message: string = "Invalid payment amount") {
    super(message, "INVALID_AMOUNT");
  }
}

/**
 * Thrown when Stripe operation fails
 */
export class StripeError extends PaymentError {
  constructor(
    message: string,
    public readonly stripeError?: any
  ) {
    super(message, "STRIPE_ERROR");
  }
}
