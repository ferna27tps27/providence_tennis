/**
 * Hybrid payment repository.
 *
 * Uses Prisma/Postgres when DATABASE_URL is configured and falls back to the
 * legacy JSON file store otherwise.
 */

import {
  PaymentStatus as PrismaPaymentStatus,
  PaymentType as PrismaPaymentType,
  Prisma,
} from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

import { Payment, PaymentFilter } from "../../types/payment";
import { IPaymentRepository } from "./payment-repository.interface";
import { FileLock } from "../utils/file-lock";
import {
  PaymentNotFoundError,
  PaymentProcessingError,
} from "../errors/payment-errors";
import { ensurePrismaMember } from "../db/prisma-legacy-sync";
import { getPrismaClient } from "../db/prisma-client";

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

function getUtcDateBoundary(date: string, boundary: "start" | "end"): Date {
  const time = boundary === "start" ? "00:00:00.000" : "23:59:59.999";
  return new Date(`${date}T${time}Z`);
}

function mapPaymentStatus(status: PrismaPaymentStatus): Payment["status"] {
  switch (status) {
    case PrismaPaymentStatus.PAID:
      return "paid";
    case PrismaPaymentStatus.REFUNDED:
      return "refunded";
    case PrismaPaymentStatus.FAILED:
      return "failed";
    case PrismaPaymentStatus.CANCELLED:
      return "cancelled";
    default:
      return "pending";
  }
}

function toPaymentStatus(status: Payment["status"]): PrismaPaymentStatus {
  switch (status) {
    case "paid":
      return PrismaPaymentStatus.PAID;
    case "refunded":
      return PrismaPaymentStatus.REFUNDED;
    case "failed":
      return PrismaPaymentStatus.FAILED;
    case "cancelled":
      return PrismaPaymentStatus.CANCELLED;
    default:
      return PrismaPaymentStatus.PENDING;
  }
}

function mapPaymentType(type: PrismaPaymentType): Payment["type"] {
  switch (type) {
    case PrismaPaymentType.COURT_BOOKING:
      return "court_booking";
    case PrismaPaymentType.MEMBERSHIP:
      return "membership";
    case PrismaPaymentType.LESSON_PACKAGE:
      return "lesson_package";
    case PrismaPaymentType.PRIVATE_LESSON:
      return "private_lesson";
    case PrismaPaymentType.PROGRAM_FEE:
      return "program_fee";
    case PrismaPaymentType.REFUND:
      return "refund";
    case PrismaPaymentType.MANUAL_CHARGE:
      return "manual_charge";
    default:
      return "other";
  }
}

function toPaymentType(type: Payment["type"]): PrismaPaymentType {
  switch (type) {
    case "court_booking":
      return PrismaPaymentType.COURT_BOOKING;
    case "membership":
      return PrismaPaymentType.MEMBERSHIP;
    case "lesson_package":
      return PrismaPaymentType.LESSON_PACKAGE;
    case "private_lesson":
      return PrismaPaymentType.PRIVATE_LESSON;
    case "program_fee":
      return PrismaPaymentType.PROGRAM_FEE;
    case "refund":
      return PrismaPaymentType.REFUND;
    case "manual_charge":
      return PrismaPaymentType.MANUAL_CHARGE;
    default:
      return PrismaPaymentType.OTHER;
  }
}

function mapPrismaPayment(payment: {
  id: string;
  memberId: string | null;
  reservationId: string | null;
  type: PrismaPaymentType;
  amount: number;
  currency: string;
  status: PrismaPaymentStatus;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  description: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
  refundedAt: Date | null;
  refundAmount: number | null;
}): Payment {
  return {
    id: payment.id,
    memberId: payment.memberId || undefined,
    reservationId: payment.reservationId || undefined,
    type: mapPaymentType(payment.type),
    amount: payment.amount,
    currency: payment.currency,
    status: mapPaymentStatus(payment.status),
    stripePaymentIntentId: payment.stripePaymentIntentId || undefined,
    stripeChargeId: payment.stripeChargeId || undefined,
    description: payment.description || undefined,
    metadata: (payment.metadata as Record<string, string> | null) || undefined,
    createdAt: payment.createdAt.toISOString(),
    lastModified: payment.updatedAt.toISOString(),
    paidAt: payment.paidAt?.toISOString(),
    refundedAt: payment.refundedAt?.toISOString(),
    refundAmount: payment.refundAmount ?? undefined,
  };
}

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

async function writePayments(payments: Payment[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(getPaymentsFile(), JSON.stringify(payments, null, 2));
}

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
    const start = getUtcDateBoundary(filter.startDate, "start");
    filtered = filtered.filter((p) => new Date(p.createdAt) >= start);
  }

  if (filter.endDate) {
    const end = getUtcDateBoundary(filter.endDate, "end");
    filtered = filtered.filter((p) => new Date(p.createdAt) <= end);
  }

  return filtered;
}

function toPrismaJson(
  value: Record<string, string> | Prisma.JsonValue | null | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

export class FilePaymentRepository implements IPaymentRepository {
  async findAll(filter?: PaymentFilter): Promise<Payment[]> {
    const prisma = getPrismaClient();

    if (prisma) {
      const payments = await prisma.payment.findMany({
        where: {
          ...(filter?.memberId ? { memberId: filter.memberId } : {}),
          ...(filter?.status ? { status: toPaymentStatus(filter.status) } : {}),
          ...(filter?.type ? { type: toPaymentType(filter.type) } : {}),
          ...(filter?.startDate || filter?.endDate
            ? {
                createdAt: {
                  ...(filter.startDate ? { gte: getUtcDateBoundary(filter.startDate, "start") } : {}),
                  ...(filter.endDate ? { lte: getUtcDateBoundary(filter.endDate, "end") } : {}),
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
      });

      return payments.map(mapPrismaPayment);
    }

    const payments = await readPayments();
    return filterPayments(payments, filter);
  }

  async findById(id: string): Promise<Payment | null> {
    const prisma = getPrismaClient();

    if (prisma) {
      const payment = await prisma.payment.findUnique({ where: { id } });
      return payment ? mapPrismaPayment(payment) : null;
    }

    const payments = await readPayments();
    return payments.find((p) => p.id === id) || null;
  }

  async findByMemberId(memberId: string): Promise<Payment[]> {
    return this.findAll({ memberId });
  }

  async findByReservationId(reservationId: string): Promise<Payment[]> {
    const prisma = getPrismaClient();

    if (prisma) {
      const payments = await prisma.payment.findMany({
        where: { reservationId },
        orderBy: { createdAt: "desc" },
      });

      return payments.map(mapPrismaPayment);
    }

    const payments = await readPayments();
    return payments.filter((p) => p.reservationId === reservationId);
  }

  async findByPaymentIntentId(paymentIntentId: string): Promise<Payment | null> {
    const prisma = getPrismaClient();

    if (prisma) {
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      return payment ? mapPrismaPayment(payment) : null;
    }

    const payments = await readPayments();
    return payments.find((p) => p.stripePaymentIntentId === paymentIntentId) || null;
  }

  async create(
    paymentData: Omit<Payment, "id" | "createdAt" | "lastModified">
  ): Promise<Payment> {
    const prisma = getPrismaClient();

    if (prisma) {
      await ensurePrismaMember(paymentData.memberId);

      const memberExists = paymentData.memberId
        ? await prisma.user.findUnique({
            where: { id: paymentData.memberId },
            select: { id: true },
          })
        : null;
      const reservationExists = paymentData.reservationId
        ? await prisma.courtReservation.findUnique({
            where: { id: paymentData.reservationId },
            select: { id: true },
          })
        : null;

      const payment = await prisma.payment.create({
        data: {
          memberId: memberExists ? paymentData.memberId : null,
          reservationId: reservationExists ? paymentData.reservationId : null,
          type: toPaymentType(paymentData.type),
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: toPaymentStatus(paymentData.status),
          stripePaymentIntentId: paymentData.stripePaymentIntentId,
          stripeChargeId: paymentData.stripeChargeId,
          description: paymentData.description,
          metadata: toPrismaJson(paymentData.metadata),
          paidAt: paymentData.paidAt ? new Date(paymentData.paidAt) : null,
          refundedAt: paymentData.refundedAt ? new Date(paymentData.refundedAt) : null,
          refundAmount: paymentData.refundAmount,
        },
      });

      return mapPrismaPayment(payment);
    }

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
      const payment: Payment = {
        ...paymentData,
        id: Date.now().toString(),
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

  async update(id: string, updates: Partial<Payment>): Promise<Payment> {
    const prisma = getPrismaClient();

    if (prisma) {
      const existing = await prisma.payment.findUnique({ where: { id } });

      if (!existing) {
        throw new PaymentNotFoundError(`Payment with id ${id} not found`);
      }

      if (updates.memberId) {
        await ensurePrismaMember(updates.memberId);
      }

      const memberId = updates.memberId !== undefined ? updates.memberId : existing.memberId;
      const reservationId =
        updates.reservationId !== undefined ? updates.reservationId : existing.reservationId;
      const memberExists = memberId
        ? await prisma.user.findUnique({
            where: { id: memberId },
            select: { id: true },
          })
        : null;
      const reservationExists = reservationId
        ? await prisma.courtReservation.findUnique({
            where: { id: reservationId },
            select: { id: true },
          })
        : null;

      const updated = await prisma.payment.update({
        where: { id },
        data: {
          memberId: memberExists ? memberId : null,
          reservationId: reservationExists ? reservationId : null,
          type: updates.type ? toPaymentType(updates.type) : existing.type,
          amount: updates.amount !== undefined ? updates.amount : existing.amount,
          currency: updates.currency !== undefined ? updates.currency : existing.currency,
          status: updates.status ? toPaymentStatus(updates.status) : existing.status,
          stripePaymentIntentId:
            updates.stripePaymentIntentId !== undefined
              ? updates.stripePaymentIntentId
              : existing.stripePaymentIntentId,
          stripeChargeId:
            updates.stripeChargeId !== undefined ? updates.stripeChargeId : existing.stripeChargeId,
          description: updates.description !== undefined ? updates.description : existing.description,
          metadata:
            updates.metadata !== undefined
              ? toPrismaJson(updates.metadata)
              : toPrismaJson(existing.metadata),
          paidAt:
            updates.paidAt !== undefined
              ? updates.paidAt
                ? new Date(updates.paidAt)
                : null
              : existing.paidAt,
          refundedAt:
            updates.refundedAt !== undefined
              ? updates.refundedAt
                ? new Date(updates.refundedAt)
                : null
              : existing.refundedAt,
          refundAmount:
            updates.refundAmount !== undefined ? updates.refundAmount : existing.refundAmount,
          updatedAt: new Date(),
        },
      });

      return mapPrismaPayment(updated);
    }

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
        id,
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

  async delete(id: string): Promise<boolean> {
    await this.update(id, { status: "cancelled" });
    return true;
  }
}

export const paymentRepository = new FilePaymentRepository();
