/**
 * Unit tests for payment service helpers
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPaymentIntent } from "../../lib/payments/payments";
import * as paymentProcessor from "../../lib/payments/payment-processor";

vi.mock("../../lib/payments/payment-processor");

describe("Payments service helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps summer camp program fees to the program_fee payment type", async () => {
    vi.mocked(paymentProcessor.processPaymentRequest).mockResolvedValue({
      paymentIntentId: "pi_test_123",
      clientSecret: "secret_test_123",
    });

    const result = await createPaymentIntent({
      amount: 5000,
      currency: "usd",
      description: "Summer Camp Deposit",
      metadata: {
        type: "program_fee",
        category: "summer_camp",
        registrationId: "reg_123",
      },
    });

    expect(result.paymentIntentId).toBe("pi_test_123");
    expect(paymentProcessor.processPaymentRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "program_fee",
        amount: 5000,
        currency: "usd",
        description: "Summer Camp Deposit",
        metadata: expect.objectContaining({
          type: "program_fee",
          category: "summer_camp",
          registrationId: "reg_123",
        }),
      })
    );
  });
});
