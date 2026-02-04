/**
 * Integration tests for payment repository (Phase 3)
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import { paymentRepository } from "../../src/lib/repositories/file-payment-repository";
import { Payment } from "../../src/types/payment";

let tempDir = "";
let originalDataDir: string | undefined;

beforeAll(async () => {
  originalDataDir = process.env.DATA_DIR;
  
  const baseDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `pta-payment-repo-${Date.now()}-${Math.random().toString(36).substring(7)}-`)
  );
  tempDir = baseDir;
  process.env.DATA_DIR = tempDir;
  await fs.mkdir(tempDir, { recursive: true });
});

beforeEach(async () => {
  if (tempDir) {
    try {
      const paymentsFile = path.join(tempDir, "payments.json");
      const paymentsLockFile = path.join(tempDir, "payments.json.lock");
      
      await fs.unlink(paymentsLockFile).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 50));
      await fs.writeFile(paymentsFile, JSON.stringify([], null, 2)).catch(() => {});
    } catch {
      // ignore errors
    }
  }
});

afterEach(async () => {
  if (!tempDir) return;
  try {
    const paymentsLockFile = path.join(tempDir, "payments.json.lock");
    await fs.unlink(paymentsLockFile).catch(() => {});
  } catch {
    // ignore cleanup errors
  }
});

afterAll(async () => {
  if (originalDataDir !== undefined) {
    process.env.DATA_DIR = originalDataDir;
  } else {
    delete process.env.DATA_DIR;
  }
  
  if (tempDir) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
});

describe("Payment Repository Integration Tests (Phase 3)", () => {
  describe("Payment CRUD Operations", () => {
    it("should create a payment", async () => {
      const payment = await paymentRepository.create({
        memberId: "member123",
        type: "court_booking",
        amount: 5000,
        currency: "usd",
        status: "pending",
        description: "Court Booking",
      });

      expect(payment.id).toBeDefined();
      expect(payment.memberId).toBe("member123");
      expect(payment.amount).toBe(5000);
      expect(payment.status).toBe("pending");
      expect(payment.createdAt).toBeDefined();
    });

    it("should retrieve payment by ID", async () => {
      const created = await paymentRepository.create({
        memberId: "member123",
        type: "court_booking",
        amount: 5000,
        currency: "usd",
        status: "pending",
      });

      const retrieved = await paymentRepository.findById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.amount).toBe(5000);
    });

    it("should return null for non-existent payment", async () => {
      const retrieved = await paymentRepository.findById("nonexistent");
      expect(retrieved).toBeNull();
    });

    it("should update payment", async () => {
      const created = await paymentRepository.create({
        memberId: "member123",
        type: "court_booking",
        amount: 5000,
        currency: "usd",
        status: "pending",
      });

      const updated = await paymentRepository.update(created.id, {
        status: "paid",
        paidAt: new Date().toISOString(),
        stripeChargeId: "ch_test_123",
      });

      expect(updated.status).toBe("paid");
      expect(updated.paidAt).toBeDefined();
      expect(updated.stripeChargeId).toBe("ch_test_123");
      expect(updated.lastModified).not.toBe(created.lastModified);
    });

    it("should delete payment (soft delete)", async () => {
      const created = await paymentRepository.create({
        memberId: "member123",
        type: "court_booking",
        amount: 5000,
        currency: "usd",
        status: "paid",
      });

      const deleted = await paymentRepository.delete(created.id);
      expect(deleted).toBe(true);

      const retrieved = await paymentRepository.findById(created.id);
      expect(retrieved?.status).toBe("cancelled");
    });
  });

  describe("Payment Queries", () => {
    beforeEach(async () => {
      // Create test payments
      await paymentRepository.create({
        memberId: "member1",
        type: "court_booking",
        amount: 5000,
        currency: "usd",
        status: "paid",
      });

      await paymentRepository.create({
        memberId: "member1",
        type: "membership",
        amount: 10000,
        currency: "usd",
        status: "paid",
      });

      await paymentRepository.create({
        memberId: "member2",
        type: "court_booking",
        amount: 5000,
        currency: "usd",
        status: "pending",
      });

      await paymentRepository.create({
        memberId: "member1",
        type: "court_booking",
        amount: 3000,
        currency: "usd",
        status: "refunded",
        refundAmount: 3000,
      });
    });

    it("should find payments by member ID", async () => {
      const payments = await paymentRepository.findByMemberId("member1");

      expect(payments.length).toBe(3);
      payments.forEach((p) => {
        expect(p.memberId).toBe("member1");
      });
    });

    it("should find payments by reservation ID", async () => {
      const payment = await paymentRepository.create({
        memberId: "member1",
        reservationId: "reservation123",
        type: "court_booking",
        amount: 5000,
        currency: "usd",
        status: "paid",
      });

      const payments = await paymentRepository.findByReservationId("reservation123");

      expect(payments.length).toBe(1);
      expect(payments[0].id).toBe(payment.id);
    });

    it("should find payment by PaymentIntent ID", async () => {
      const payment = await paymentRepository.create({
        memberId: "member1",
        type: "court_booking",
        amount: 5000,
        currency: "usd",
        status: "pending",
        stripePaymentIntentId: "pi_test_123",
      });

      const found = await paymentRepository.findByPaymentIntentId("pi_test_123");

      expect(found).not.toBeNull();
      expect(found?.id).toBe(payment.id);
    });

    it("should filter payments by status", async () => {
      const paidPayments = await paymentRepository.findAll({ status: "paid" });

      expect(paidPayments.length).toBeGreaterThan(0);
      paidPayments.forEach((p) => {
        expect(p.status).toBe("paid");
      });
    });

    it("should filter payments by type", async () => {
      const courtBookings = await paymentRepository.findAll({ type: "court_booking" });

      expect(courtBookings.length).toBeGreaterThan(0);
      courtBookings.forEach((p) => {
        expect(p.type).toBe("court_booking");
      });
    });

    it("should filter payments by member ID", async () => {
      const payments = await paymentRepository.findAll({ memberId: "member1" });

      expect(payments.length).toBe(3);
      payments.forEach((p) => {
        expect(p.memberId).toBe("member1");
      });
    });

    it("should filter payments by date range", async () => {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const payments = await paymentRepository.findAll({
        startDate: yesterday,
        endDate: today,
      });

      expect(Array.isArray(payments)).toBe(true);
      // All payments created in beforeEach should be in range
      expect(payments.length).toBeGreaterThanOrEqual(4);
    });

    it("should combine multiple filters", async () => {
      const payments = await paymentRepository.findAll({
        memberId: "member1",
        status: "paid",
        type: "court_booking",
      });

      expect(payments.length).toBe(1);
      expect(payments[0].memberId).toBe("member1");
      expect(payments[0].status).toBe("paid");
      expect(payments[0].type).toBe("court_booking");
    });
  });

  describe("Payment Status Management", () => {
    it("should track payment status changes", async () => {
      const payment = await paymentRepository.create({
        memberId: "member123",
        type: "court_booking",
        amount: 5000,
        currency: "usd",
        status: "pending",
      });

      expect(payment.status).toBe("pending");

      // Update to paid
      const paid = await paymentRepository.update(payment.id, {
        status: "paid",
        paidAt: new Date().toISOString(),
      });

      expect(paid.status).toBe("paid");
      expect(paid.paidAt).toBeDefined();

      // Update to refunded
      const refunded = await paymentRepository.update(payment.id, {
        status: "refunded",
        refundAmount: 5000,
        refundedAt: new Date().toISOString(),
      });

      expect(refunded.status).toBe("refunded");
      expect(refunded.refundAmount).toBe(5000);
      expect(refunded.refundedAt).toBeDefined();
    });
  });

  describe("Payment Metadata", () => {
    it("should store and retrieve payment metadata", async () => {
      const payment = await paymentRepository.create({
        memberId: "member123",
        type: "court_booking",
        amount: 5000,
        currency: "usd",
        status: "pending",
        metadata: {
          courtId: "court1",
          date: "2026-01-24",
          timeSlot: "10:00-11:00",
        },
      });

      expect(payment.metadata).toBeDefined();
      expect(payment.metadata?.courtId).toBe("court1");
      expect(payment.metadata?.date).toBe("2026-01-24");

      const retrieved = await paymentRepository.findById(payment.id);
      expect(retrieved?.metadata?.courtId).toBe("court1");
    });
  });
});
