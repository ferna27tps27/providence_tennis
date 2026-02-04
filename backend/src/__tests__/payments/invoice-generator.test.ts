/**
 * Unit tests for invoice generator
 */

import { describe, it, expect } from "vitest";
import { generateInvoice, formatInvoiceAsText, formatInvoiceAsJSON } from "../../lib/payments/invoice-generator";
import { Payment } from "../../types/payment";

describe("Invoice Generator", () => {
  const basePayment: Payment = {
    id: "payment123",
    memberId: "member123",
    type: "court_booking",
    amount: 5000, // $50.00 in cents
    currency: "usd",
    status: "paid",
    createdAt: "2026-01-24T10:00:00.000Z",
    lastModified: "2026-01-24T10:00:00.000Z",
    paidAt: "2026-01-24T10:05:00.000Z",
    description: "Court Booking - Court 1",
  };

  describe("generateInvoice", () => {
    it("should generate invoice from payment", () => {
      const invoice = generateInvoice(basePayment, "John Doe", "john@example.com");

      expect(invoice.paymentId).toBe("payment123");
      expect(invoice.memberId).toBe("member123");
      expect(invoice.memberName).toBe("John Doe");
      expect(invoice.memberEmail).toBe("john@example.com");
      expect(invoice.amount).toBe(50.0);
      expect(invoice.currency).toBe("USD");
      expect(invoice.status).toBe("paid");
      expect(invoice.invoiceNumber).toContain("INV-");
      expect(invoice.items).toHaveLength(1);
    });

    it("should generate invoice without member info", () => {
      const invoice = generateInvoice(basePayment);

      expect(invoice.memberName).toBeUndefined();
      expect(invoice.memberEmail).toBeUndefined();
      expect(invoice.amount).toBe(50.0);
    });

    it("should include refund item for refunded payment", () => {
      const refundedPayment: Payment = {
        ...basePayment,
        status: "refunded",
        refundAmount: 5000,
      };

      const invoice = generateInvoice(refundedPayment);

      expect(invoice.items).toHaveLength(2);
      expect(invoice.items[1].description).toBe("Refund");
      expect(invoice.items[1].total).toBe(-50.0);
    });

    it("should handle partial refund", () => {
      const partialRefund: Payment = {
        ...basePayment,
        status: "paid",
        refundAmount: 2500, // $25.00 refund
        refundedAt: "2026-01-24T10:10:00.000Z",
      };

      const invoice = generateInvoice(partialRefund);

      expect(invoice.items).toHaveLength(2);
      expect(invoice.items[1].total).toBe(-25.0);
    });

    it("should use payment description or default", () => {
      const paymentWithDescription: Payment = {
        ...basePayment,
        description: "Custom Description",
      };

      const invoice = generateInvoice(paymentWithDescription);
      expect(invoice.items[0].description).toBe("Custom Description");

      const paymentWithoutDescription: Payment = {
        ...basePayment,
        description: undefined,
      };

      const invoice2 = generateInvoice(paymentWithoutDescription);
      expect(invoice2.items[0].description).toBe("Court Booking");
    });

    it("should handle different payment types", () => {
      const membershipPayment: Payment = {
        ...basePayment,
        type: "membership",
        description: undefined,
      };

      const invoice = generateInvoice(membershipPayment);
      expect(invoice.items[0].description).toBe("Membership Fee");
    });
  });

  describe("formatInvoiceAsText", () => {
    it("should format invoice as text", () => {
      const invoice = generateInvoice(basePayment, "John Doe", "john@example.com");
      const text = formatInvoiceAsText(invoice);

      expect(text).toContain("INVOICE");
      expect(text).toContain(invoice.invoiceNumber);
      expect(text).toContain("John Doe");
      expect(text).toContain("john@example.com");
      expect(text).toContain("$50.00");
      expect(text).toContain("USD");
    });

    it("should format invoice without member info", () => {
      const invoice = generateInvoice(basePayment);
      const text = formatInvoiceAsText(invoice);

      expect(text).toContain("INVOICE");
      expect(text).not.toContain("Bill To:");
    });
  });

  describe("formatInvoiceAsJSON", () => {
    it("should format invoice as JSON", () => {
      const invoice = generateInvoice(basePayment, "John Doe", "john@example.com");
      const json = formatInvoiceAsJSON(invoice);

      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed.paymentId).toBe("payment123");
      expect(parsed.amount).toBe(50.0);
    });
  });
});
