/**
 * Payment business logic
 */

import {
  Payment,
  PaymentRequest,
  PaymentIntentRequest,
  ConfirmPaymentRequest,
  RefundRequest,
  PaymentFilter,
} from "../../types/payment";
import { paymentRepository } from "../repositories/file-payment-repository";
import {
  processPaymentRequest,
  confirmPayment as confirmPaymentProcessor,
  syncPaymentStatus,
} from "./payment-processor";
import { createRefund, getChargeId, retrievePaymentIntent } from "./stripe-client";
import { generateInvoice } from "./invoice-generator";
import {
  PaymentNotFoundError,
  PaymentProcessingError,
  RefundError,
} from "../errors/payment-errors";
import { getMember } from "../members";

/**
 * Create a payment intent for a booking or membership
 */
export async function createPaymentIntent(
  request: PaymentIntentRequest
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  // Determine payment type based on request
  const type: PaymentRequest["type"] = request.reservationId
    ? "court_booking"
    : request.metadata?.type === "membership"
    ? "membership"
    : "other";

  const paymentRequest: PaymentRequest = {
    memberId: request.memberId,
    reservationId: request.reservationId,
    type,
    amount: request.amount,
    currency: request.currency,
    description: request.description,
    metadata: request.metadata,
  };

  const result = await processPaymentRequest(paymentRequest);

  return {
    clientSecret: result.clientSecret,
    paymentIntentId: result.paymentIntentId,
  };
}

/**
 * Confirm a payment
 */
export async function confirmPayment(
  request: ConfirmPaymentRequest
): Promise<Payment> {
  return confirmPaymentProcessor(request);
}

/**
 * Get payment by ID
 */
export async function getPayment(id: string): Promise<Payment> {
  const payment = await paymentRepository.findById(id);

  if (!payment) {
    throw new PaymentNotFoundError(`Payment with id ${id} not found`);
  }

  return payment;
}

/**
 * Get payments with optional filtering
 */
export async function getPayments(filter?: PaymentFilter): Promise<Payment[]> {
  return paymentRepository.findAll(filter);
}

/**
 * Get payments for a member
 */
export async function getMemberPayments(memberId: string): Promise<Payment[]> {
  return paymentRepository.findByMemberId(memberId);
}

/**
 * Get payments for a reservation
 */
export async function getReservationPayments(
  reservationId: string
): Promise<Payment[]> {
  return paymentRepository.findByReservationId(reservationId);
}

/**
 * Process a refund
 */
export async function processRefund(request: RefundRequest): Promise<Payment> {
  const payment = await getPayment(request.paymentId);

  if (payment.status !== "paid") {
    throw new RefundError(
      `Cannot refund payment with status: ${payment.status}. Payment must be paid.`
    );
  }

  if (!payment.stripeChargeId) {
    throw new RefundError("Payment does not have a charge ID");
  }

  // Calculate refund amount
  const refundAmount = request.amount || payment.amount;

  if (refundAmount > payment.amount) {
    throw new RefundError(
      `Refund amount (${refundAmount}) cannot exceed payment amount (${payment.amount})`
    );
  }

  // Create refund with Stripe
  const refund = await createRefund(
    payment.stripeChargeId,
    request.amount,
    request.reason
  );

  // Update payment record
  const updates: Partial<Payment> = {
    refundAmount: refund.amount,
    refundedAt: new Date().toISOString(),
  };

  // If full refund, mark as refunded; otherwise keep as paid
  if (refundAmount >= payment.amount) {
    updates.status = "refunded";
  }

  return paymentRepository.update(payment.id, updates);
}

/**
 * Get payment invoice
 */
export async function getPaymentInvoice(
  paymentId: string
): Promise<ReturnType<typeof generateInvoice>> {
  const payment = await getPayment(paymentId);

  // Get member info if memberId exists
  let memberName: string | undefined;
  let memberEmail: string | undefined;

  if (payment.memberId) {
    try {
      const member = await getMember(payment.memberId);
      memberName = `${member.firstName} ${member.lastName}`;
      memberEmail = member.email;
    } catch {
      // Member not found, continue without member info
    }
  }

  return generateInvoice(payment, memberName, memberEmail);
}

/**
 * Sync payment status with Stripe
 */
export async function syncPayment(paymentId: string): Promise<Payment> {
  return syncPaymentStatus(paymentId);
}
