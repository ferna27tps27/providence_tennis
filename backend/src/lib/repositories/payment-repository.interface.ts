/**
 * Payment repository interface
 */

import { Payment, PaymentFilter } from "../../types/payment";

export interface IPaymentRepository {
  /**
   * Find all payments with optional filtering
   */
  findAll(filter?: PaymentFilter): Promise<Payment[]>;

  /**
   * Find payment by ID
   */
  findById(id: string): Promise<Payment | null>;

  /**
   * Find payments by member ID
   */
  findByMemberId(memberId: string): Promise<Payment[]>;

  /**
   * Find payments by reservation ID
   */
  findByReservationId(reservationId: string): Promise<Payment[]>;

  /**
   * Find payments by Stripe PaymentIntent ID
   */
  findByPaymentIntentId(paymentIntentId: string): Promise<Payment | null>;

  /**
   * Create a new payment
   */
  create(paymentData: Omit<Payment, "id" | "createdAt" | "lastModified">): Promise<Payment>;

  /**
   * Update a payment
   */
  update(id: string, updates: Partial<Payment>): Promise<Payment>;

  /**
   * Delete a payment (soft delete by setting status to cancelled)
   */
  delete(id: string): Promise<boolean>;
}
