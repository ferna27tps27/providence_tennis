/**
 * File-based implementation of IPaymentRepository
 */

import { promises as fs } from "fs";
import path from "path";
import { Payment, PaymentFilter } from "../../types/payment";
import { IPaymentRepository } from "./payment-repository.interface";
import { FileLock } from "../utils/file-lock";
import {
  PaymentNotFoundError,
  PaymentProcessingError,
} from "../errors/payment-errors";

function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.isAbsolute(process.env.DATA_DIR)
      ? process.env.DATA_DIR
      : path.join(process.cwd(), process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

function getPaymentsFile(): string {
  return path.join(getDataDir(), "payments.json");
}

/**
 * Ensure data directory and files exist
 */
async function ensureDataFiles(): Promise<void> {
  try {
    const dataDir = getDataDir();
    const paymentsFile = getPaymentsFile();
    await fs.mkdir(dataDir, { recursive: true });

    try {
      await fs.access(paymentsFile);
    } catch {
      await fs.writeFile(paymentsFile, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error("Error initializing payment data files:", error);
    throw error;
  }
}

/**
 * Read all payments from file
 */
async function readPayments(): Promise<Payment[]> {
  await ensureDataFiles();
  try {
    const data = await fs.readFile(getPaymentsFile(), "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading payments:", error);
    return [];
  }
}

/**
 * Write payments to file
 */
async function writePayments(payments: Payment[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(getPaymentsFile(), JSON.stringify(payments, null, 2));
}

/**
 * Filter payments by criteria
 */
function filterPayments(payments: Payment[], filter?: PaymentFilter): Payment[] {
  if (!filter) {
    return payments;
  }

  let filtered = payments;

  if (filter.memberId) {
    filtered = filtered.filter((p) => p.memberId === filter.memberId);
  }

  if (filter.status) {
    filtered = filtered.filter((p) => p.status === filter.status);
  }

  if (filter.type) {
    filtered = filtered.filter((p) => p.type === filter.type);
  }

  if (filter.startDate) {
    const start = new Date(filter.startDate);
    filtered = filtered.filter((p) => new Date(p.createdAt) >= start);
  }

  if (filter.endDate) {
    const end = new Date(filter.endDate);
    end.setHours(23, 59, 59, 999); // End of day
    filtered = filtered.filter((p) => new Date(p.createdAt) <= end);
  }

  return filtered;
}

/**
 * File-based payment repository implementation
 */
export class FilePaymentRepository implements IPaymentRepository {
  /**
   * Get all payments with optional filtering
   */
  async findAll(filter?: PaymentFilter): Promise<Payment[]> {
    const payments = await readPayments();
    return filterPayments(payments, filter);
  }

  /**
   * Get payment by ID
   */
  async findById(id: string): Promise<Payment | null> {
    const payments = await readPayments();
    return payments.find((p) => p.id === id) || null;
  }

  /**
   * Find payments by member ID
   */
  async findByMemberId(memberId: string): Promise<Payment[]> {
    const payments = await readPayments();
    return payments.filter((p) => p.memberId === memberId);
  }

  /**
   * Find payments by reservation ID
   */
  async findByReservationId(reservationId: string): Promise<Payment[]> {
    const payments = await readPayments();
    return payments.filter((p) => p.reservationId === reservationId);
  }

  /**
   * Find payment by Stripe PaymentIntent ID
   */
  async findByPaymentIntentId(paymentIntentId: string): Promise<Payment | null> {
    const payments = await readPayments();
    return payments.find((p) => p.stripePaymentIntentId === paymentIntentId) || null;
  }

  /**
   * Create a new payment
   */
  async create(
    paymentData: Omit<Payment, "id" | "createdAt" | "lastModified">
  ): Promise<Payment> {
    const lock = new FileLock(getPaymentsFile());
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error) {
      throw new PaymentProcessingError(
        `Could not acquire lock for payment creation: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const payments = await readPayments();

      // Generate payment ID (timestamp-based)
      const id = Date.now().toString();

      const payment: Payment = {
        ...paymentData,
        id,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      };

      payments.push(payment);
      await writePayments(payments);

      return payment;
    } finally {
      if (release) {
        await release();
      }
    }
  }

  /**
   * Update a payment
   */
  async update(id: string, updates: Partial<Payment>): Promise<Payment> {
    const lock = new FileLock(getPaymentsFile());
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error) {
      throw new PaymentProcessingError(
        `Could not acquire lock for payment update: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const payments = await readPayments();
      const index = payments.findIndex((p) => p.id === id);

      if (index === -1) {
        throw new PaymentNotFoundError(`Payment with id ${id} not found`);
      }

      const updated: Payment = {
        ...payments[index],
        ...updates,
        id, // Ensure ID doesn't change
        lastModified: new Date().toISOString(),
      };

      payments[index] = updated;
      await writePayments(payments);

      return updated;
    } finally {
      if (release) {
        await release();
      }
    }
  }

  /**
   * Delete a payment (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    return this.update(id, { status: "cancelled" }).then(() => true);
  }
}

// Export singleton instance
export const paymentRepository = new FilePaymentRepository();
