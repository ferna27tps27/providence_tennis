/**
 * Payment type definitions
 */

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed" | "cancelled";

export type PaymentType = "court_booking" | "membership" | "other";

export interface Payment {
  id: string;                      // Unique payment ID
  memberId?: string;              // Member who made payment (optional for guest payments)
  reservationId?: string;         // Associated reservation (if applicable)
  type: PaymentType;              // Type of payment
  amount: number;                  // Payment amount in cents
  currency: string;               // Currency code (default: "usd")
  status: PaymentStatus;          // Payment status
  stripePaymentIntentId?: string; // Stripe PaymentIntent ID
  stripeChargeId?: string;        // Stripe Charge ID
  description?: string;            // Payment description
  metadata?: Record<string, string>; // Additional metadata
  createdAt: string;              // ISO 8601 timestamp
  lastModified: string;           // ISO 8601 timestamp
  paidAt?: string;                // When payment was completed
  refundedAt?: string;            // When payment was refunded
  refundAmount?: number;          // Refund amount in cents
}

export interface PaymentRequest {
  memberId?: string;              // Member ID (optional for guests)
  reservationId?: string;         // Reservation ID (if applicable)
  type: PaymentType;
  amount: number;                 // Amount in cents
  currency?: string;              // Default: "usd"
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentRequest {
  amount: number;                 // Amount in cents
  currency?: string;              // Default: "usd"
  memberId?: string;             // Member ID
  reservationId?: string;        // Reservation ID
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResponse {
  clientSecret: string;           // Stripe client secret for frontend
  paymentIntentId: string;       // Stripe PaymentIntent ID
  amount: number;
  currency: string;
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;        // Stripe PaymentIntent ID
  paymentMethodId?: string;       // Payment method ID (if not already attached)
  reservationId?: string;         // Reservation ID to link
}

export interface RefundRequest {
  paymentId: string;              // Payment ID
  amount?: number;                 // Partial refund amount (if not provided, full refund)
  reason?: string;                // Refund reason
}

export interface PaymentFilter {
  memberId?: string;              // Filter by member
  status?: PaymentStatus;         // Filter by status
  type?: PaymentType;             // Filter by type
  startDate?: string;             // Start date (YYYY-MM-DD)
  endDate?: string;               // End date (YYYY-MM-DD)
}
