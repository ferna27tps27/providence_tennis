/**
 * Unit tests for payment processor
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PaymentRequest, ConfirmPaymentRequest } from "../../types/payment";
import {
  processPaymentRequest,
  confirmPayment,
} from "../../lib/payments/payment-processor";
import * as stripeClient from "../../lib/payments/stripe-client";
import * as paymentRepository from "../../lib/repositories/file-payment-repository";
import {
  InvalidAmountError,
  PaymentConfirmationError,
} from "../../lib/errors/payment-errors";

// Mock dependencies
vi.mock("../../lib/payments/stripe-client");
vi.mock("../../lib/repositories/file-payment-repository");

describe("Payment Processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processPaymentRequest", () => {
    it("should process valid payment request", async () => {
      const request: PaymentRequest = {
        memberId: "member123",
        type: "court_booking",
        amount: 5000, // $50.00
        currency: "usd",
        description: "Court Booking",
      };

      const mockIntentResponse = {
        clientSecret: "pi_test_secret",
        paymentIntentId: "pi_test_123",
        amount: 5000,
        currency: "usd",
      };

      const mockPayment = {
        id: "payment123",
        ...request,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      };

      vi.mocked(stripeClient.createPaymentIntent).mockResolvedValue(mockIntentResponse);
      vi.mocked(paymentRepository.paymentRepository.create).mockResolvedValue(mockPayment as any);

      const result = await processPaymentRequest(request);

      expect(result.paymentIntentId).toBe("pi_test_123");
      expect(result.clientSecret).toBe("pi_test_secret");
      expect(stripeClient.createPaymentIntent).toHaveBeenCalledWith({
        amount: 5000,
        currency: "usd",
        memberId: "member123",
        reservationId: undefined,
        description: "Court Booking",
        metadata: undefined,
      });
    });

    it("should reject zero amount", async () => {
      const request: PaymentRequest = {
        type: "court_booking",
        amount: 0,
      };

      await expect(processPaymentRequest(request)).rejects.toThrow(InvalidAmountError);
    });

    it("should reject negative amount", async () => {
      const request: PaymentRequest = {
        type: "court_booking",
        amount: -100,
      };

      await expect(processPaymentRequest(request)).rejects.toThrow(InvalidAmountError);
    });

    it("should reject amount less than minimum", async () => {
      const request: PaymentRequest = {
        type: "court_booking",
        amount: 49, // Less than $0.50
      };

      await expect(processPaymentRequest(request)).rejects.toThrow(InvalidAmountError);
    });
  });

  describe("confirmPayment", () => {
    it("should confirm payment successfully", async () => {
      const request: ConfirmPaymentRequest = {
        paymentIntentId: "pi_test_123",
      };

      const mockPayment = {
        id: "payment123",
        stripePaymentIntentId: "pi_test_123",
        status: "pending" as const,
        amount: 5000,
        currency: "usd",
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      };

      const mockPaymentIntent = {
        id: "pi_test_123",
        status: "succeeded",
        latest_charge: "ch_test_123",
      } as any;

      vi.mocked(paymentRepository.paymentRepository.findByPaymentIntentId).mockResolvedValue(mockPayment as any);
      vi.mocked(stripeClient.confirmPaymentIntent).mockResolvedValue(mockPaymentIntent);
      vi.mocked(paymentRepository.paymentRepository.update).mockResolvedValue({
        ...mockPayment,
        status: "paid",
        stripeChargeId: "ch_test_123",
        paidAt: new Date().toISOString(),
      } as any);

      const result = await confirmPayment(request);

      expect(result.status).toBe("paid");
      expect(stripeClient.confirmPaymentIntent).toHaveBeenCalledWith("pi_test_123", undefined);
    });

    it("should throw error if payment not found", async () => {
      const request: ConfirmPaymentRequest = {
        paymentIntentId: "pi_nonexistent",
      };

      vi.mocked(paymentRepository.paymentRepository.findByPaymentIntentId).mockResolvedValue(null);

      await expect(confirmPayment(request)).rejects.toThrow(PaymentConfirmationError);
    });
  });
});
