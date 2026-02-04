/**
 * Stripe client wrapper
 */

import Stripe from "stripe";
import { PaymentIntentRequest, PaymentIntentResponse } from "../../types/payment";
import {
  StripeError,
  PaymentIntentError,
  PaymentConfirmationError,
  RefundError,
} from "../errors/payment-errors";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

if (!STRIPE_SECRET_KEY) {
  console.warn("WARNING: STRIPE_SECRET_KEY not set. Payment functionality will not work.");
}

// Initialize Stripe client
export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })
  : null;

/**
 * Create a Stripe PaymentIntent
 */
export async function createPaymentIntent(
  request: PaymentIntentRequest
): Promise<PaymentIntentResponse> {
  if (!stripe) {
    throw new StripeError("Stripe is not configured. Please set STRIPE_SECRET_KEY.");
  }

  try {
    const amount = request.amount;
    if (amount <= 0 || amount < 50) {
      // Minimum $0.50
      throw new PaymentIntentError("Payment amount must be at least $0.50");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: request.currency || "usd",
      description: request.description,
      metadata: {
        ...request.metadata,
        memberId: request.memberId || "",
        reservationId: request.reservationId || "",
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret || "",
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  } catch (error: any) {
    if (error instanceof PaymentIntentError) {
      throw error;
    }
    throw new StripeError(
      `Failed to create payment intent: ${error.message}`,
      error
    );
  }
}

/**
 * Confirm a Stripe PaymentIntent
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId?: string
): Promise<Stripe.PaymentIntent> {
  if (!stripe) {
    throw new StripeError("Stripe is not configured. Please set STRIPE_SECRET_KEY.");
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      return paymentIntent;
    }

    if (paymentMethodId) {
      await stripe.paymentIntents.update(paymentIntentId, {
        payment_method: paymentMethodId,
      });
    }

    const confirmed = await stripe.paymentIntents.confirm(paymentIntentId);

    if (confirmed.status !== "succeeded") {
      throw new PaymentConfirmationError(
        `Payment not succeeded. Status: ${confirmed.status}`
      );
    }

    return confirmed;
  } catch (error: any) {
    if (error instanceof PaymentConfirmationError) {
      throw error;
    }
    throw new StripeError(
      `Failed to confirm payment intent: ${error.message}`,
      error
    );
  }
}

/**
 * Retrieve a Stripe PaymentIntent
 */
export async function retrievePaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  if (!stripe) {
    throw new StripeError("Stripe is not configured. Please set STRIPE_SECRET_KEY.");
  }

  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error: any) {
    throw new StripeError(
      `Failed to retrieve payment intent: ${error.message}`,
      error
    );
  }
}

/**
 * Create a refund
 */
export async function createRefund(
  chargeId: string,
  amount?: number,
  reason?: string
): Promise<Stripe.Refund> {
  if (!stripe) {
    throw new StripeError("Stripe is not configured. Please set STRIPE_SECRET_KEY.");
  }

  try {
    const refundParams: Stripe.RefundCreateParams = {
      charge: chargeId,
    };

    if (amount) {
      refundParams.amount = amount;
    }

    if (reason) {
      refundParams.reason = reason as Stripe.RefundCreateParams.Reason;
    }

    return await stripe.refunds.create(refundParams);
  } catch (error: any) {
    throw new RefundError(`Failed to create refund: ${error.message}`);
  }
}

/**
 * Get charge ID from PaymentIntent
 */
export function getChargeId(paymentIntent: Stripe.PaymentIntent): string | null {
  if (paymentIntent.latest_charge) {
    return typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge.id;
  }
  return null;
}
