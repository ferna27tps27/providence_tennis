/**
 * Payment processing logic
 */

import { Payment, PaymentRequest, ConfirmPaymentRequest } from "../../types/payment";
import { paymentRepository } from "../repositories/file-payment-repository";
import {
  createPaymentIntent,
  confirmPaymentIntent,
  retrievePaymentIntent,
  getChargeId,
} from "./stripe-client";
import {
  PaymentProcessingError,
  PaymentConfirmationError,
  InvalidAmountError,
} from "../errors/payment-errors";

/**
 * Process a payment request and create payment intent
 */
export async function processPaymentRequest(
  request: PaymentRequest
): Promise<{ paymentIntentId: string; clientSecret: string }> {
  // Validate amount
  if (request.amount <= 0) {
    throw new InvalidAmountError("Payment amount must be greater than 0");
  }

  if (request.amount < 50) {
    // Minimum $0.50
    throw new InvalidAmountError("Payment amount must be at least $0.50");
  }

  // Create payment intent with Stripe
  const intentResponse = await createPaymentIntent({
    amount: request.amount,
    currency: request.currency || "usd",
    memberId: request.memberId,
    reservationId: request.reservationId,
    description: request.description,
    metadata: request.metadata,
  });

  // Create payment record with pending status
  const payment = await paymentRepository.create({
    memberId: request.memberId,
    reservationId: request.reservationId,
    type: request.type,
    amount: request.amount,
    currency: request.currency || "usd",
    status: "pending",
    stripePaymentIntentId: intentResponse.paymentIntentId,
    description: request.description,
    metadata: request.metadata,
  });

  return {
    paymentIntentId: intentResponse.paymentIntentId,
    clientSecret: intentResponse.clientSecret,
  };
}

/**
 * Confirm a payment
 */
export async function confirmPayment(
  request: ConfirmPaymentRequest
): Promise<Payment> {
  // Find payment by PaymentIntent ID
  const payment = await paymentRepository.findByPaymentIntentId(
    request.paymentIntentId
  );

  if (!payment) {
    throw new PaymentConfirmationError(
      `Payment not found for PaymentIntent ${request.paymentIntentId}`
    );
  }

  // Confirm payment with Stripe
  const confirmedIntent = await confirmPaymentIntent(
    request.paymentIntentId,
    request.paymentMethodId
  );

  // Get charge ID
  const chargeId = getChargeId(confirmedIntent);

  // Update payment record
  const updates: Partial<Payment> = {
    status: "paid",
    stripeChargeId: chargeId || undefined,
    paidAt: new Date().toISOString(),
  };

  // Link reservation if provided
  if (request.reservationId) {
    updates.reservationId = request.reservationId;
  }

  return paymentRepository.update(payment.id, updates);
}

/**
 * Get payment status from Stripe
 */
export async function syncPaymentStatus(paymentId: string): Promise<Payment> {
  const payment = await paymentRepository.findById(paymentId);

  if (!payment) {
    throw new PaymentProcessingError(`Payment ${paymentId} not found`);
  }

  if (!payment.stripePaymentIntentId) {
    return payment;
  }

  // Retrieve latest status from Stripe
  const intent = await retrievePaymentIntent(payment.stripePaymentIntentId);

  let status: Payment["status"] = payment.status;
  let updates: Partial<Payment> = {};

  switch (intent.status) {
    case "succeeded":
      status = "paid";
      if (payment.status !== "paid") {
        updates.paidAt = new Date().toISOString();
        const chargeId = getChargeId(intent);
        if (chargeId) {
          updates.stripeChargeId = chargeId;
        }
      }
      break;
    case "canceled":
      status = "cancelled";
      break;
    case "processing":
    case "requires_payment_method":
    case "requires_confirmation":
    case "requires_action":
    case "requires_capture":
      status = "pending";
      break;
    default:
      status = "failed";
  }

  if (status !== payment.status) {
    updates.status = status;
    return paymentRepository.update(payment.id, updates);
  }

  return payment;
}
