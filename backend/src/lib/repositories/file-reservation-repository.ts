/**
 * Hybrid reservation repository.
 *
 * Uses Prisma/Postgres when DATABASE_URL is configured and falls back to the
 * legacy JSON file store otherwise.
 */

import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

import { Reservation } from "../../types/reservation";
import { IReservationRepository } from "./reservation-repository.interface";
import { timeRangesOverlap } from "../utils/time-ranges";
import { FileLock } from "../utils/file-lock";
import { reservationCache } from "../cache/reservation-cache";
import { ConflictError, NotFoundError, LockError } from "../errors/reservation-errors";
import { ensurePrismaCourt, ensurePrismaMember } from "../db/prisma-legacy-sync";
import { getPrismaClient } from "../db/prisma-client";

function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.isAbsolute(process.env.DATA_DIR)
      ? process.env.DATA_DIR
      : path.join(process.cwd(), process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

function getReservationsFile(): string {
  return path.join(getDataDir(), "reservations.json");
}

function blocksAvailability(status: Reservation["status"]): boolean {
  return status === "confirmed" || status === "pending_payment";
}

function mapReservationStatus(status: ReservationStatus): Reservation["status"] {
  switch (status) {
    case ReservationStatus.PENDING_PAYMENT:
      return "pending_payment";
    case ReservationStatus.CANCELLED:
      return "cancelled";
    default:
      return "confirmed";
  }
}

function toReservationStatus(status: Reservation["status"]): ReservationStatus {
  switch (status) {
    case "pending_payment":
      return ReservationStatus.PENDING_PAYMENT;
    case "cancelled":
      return ReservationStatus.CANCELLED;
    default:
      return ReservationStatus.CONFIRMED;
  }
}

function mapPaymentStatus(status: PaymentStatus | null): Reservation["paymentStatus"] | undefined {
  if (!status) {
    return undefined;
  }

  switch (status) {
    case PaymentStatus.PAID:
      return "paid";
    case PaymentStatus.REFUNDED:
      return "refunded";
    case PaymentStatus.FAILED:
    case PaymentStatus.CANCELLED:
      return "failed";
    default:
      return "pending";
  }
}

function toPaymentStatus(status?: Reservation["paymentStatus"]): PaymentStatus | null {
  if (!status) {
    return null;
  }

  switch (status) {
    case "paid":
      return PaymentStatus.PAID;
    case "refunded":
      return PaymentStatus.REFUNDED;
    case "failed":
      return PaymentStatus.FAILED;
    default:
      return PaymentStatus.PENDING;
  }
}

function mapPrismaReservation(reservation: {
  id: string;
  courtId: string;
  courtName: string | null;
  reservationDate: string;
  startTime: string;
  endTime: string;
  playerUserId: string | null;
  bookedByUserId: string | null;
  legacyMemberId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
  status: ReservationStatus;
  paymentId: string | null;
  paymentStatus: PaymentStatus | null;
  paymentAmount: number | null;
  createdAt: Date;
}): Reservation {
  const memberId = reservation.playerUserId || reservation.bookedByUserId || reservation.legacyMemberId;

  return {
    id: reservation.id,
    courtId: reservation.courtId,
    courtName: reservation.courtName || "",
    date: reservation.reservationDate,
    timeSlot: {
      start: reservation.startTime,
      end: reservation.endTime,
    },
    memberId: memberId || undefined,
    guestName: reservation.guestName || undefined,
    guestEmail: reservation.guestEmail || undefined,
    guestPhone: reservation.guestPhone || undefined,
    customerName: reservation.customerName || reservation.guestName || undefined,
    customerEmail: reservation.customerEmail || reservation.guestEmail || undefined,
    customerPhone: reservation.customerPhone || reservation.guestPhone || undefined,
    notes: reservation.notes || undefined,
    createdAt: reservation.createdAt.toISOString(),
    status: mapReservationStatus(reservation.status),
    paymentId: reservation.paymentId || undefined,
    paymentStatus: mapPaymentStatus(reservation.paymentStatus),
    paymentAmount: reservation.paymentAmount ?? undefined,
  };
}

async function ensureDataFiles(): Promise<void> {
  try {
    const dataDir = getDataDir();
    const reservationsFile = getReservationsFile();
    await fs.mkdir(dataDir, { recursive: true });

    try {
      await fs.access(reservationsFile);
    } catch {
      await fs.writeFile(reservationsFile, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error("Error initializing data files:", error);
    throw error;
  }
}

async function readReservations(): Promise<Reservation[]> {
  await ensureDataFiles();
  try {
    const data = await fs.readFile(getReservationsFile(), "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading reservations:", error);
    return [];
  }
}

async function writeReservations(reservations: Reservation[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(getReservationsFile(), JSON.stringify(reservations, null, 2));
}

async function resolvePrismaMemberFields(memberId?: string): Promise<{
  bookedByUserId: string | null;
  playerUserId: string | null;
  legacyMemberId: string | null;
}> {
  if (!memberId) {
    return {
      bookedByUserId: null,
      playerUserId: null,
      legacyMemberId: null,
    };
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return {
      bookedByUserId: null,
      playerUserId: null,
      legacyMemberId: memberId,
    };
  }

  await ensurePrismaMember(memberId);
  const user = await prisma.user.findUnique({
    where: { id: memberId },
    select: { id: true },
  });

  if (!user) {
    return {
      bookedByUserId: null,
      playerUserId: null,
      legacyMemberId: memberId,
    };
  }

  return {
    bookedByUserId: memberId,
    playerUserId: memberId,
    legacyMemberId: null,
  };
}

export class FileReservationRepository implements IReservationRepository {
  async findAll(): Promise<Reservation[]> {
    const prisma = getPrismaClient();

    if (prisma) {
      const reservations = await prisma.courtReservation.findMany({
        orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }],
      });

      return reservations.map(mapPrismaReservation);
    }

    return readReservations();
  }

  async findByDate(date: string): Promise<Reservation[]> {
    const prisma = getPrismaClient();

    if (prisma) {
      const reservations = await prisma.courtReservation.findMany({
        where: {
          reservationDate: date,
          status: {
            in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING_PAYMENT],
          },
        },
        orderBy: { startTime: "asc" },
      });

      return reservations.map(mapPrismaReservation);
    }

    const reservations = await this.findAll();
    return reservations.filter((r) => r.date === date && blocksAvailability(r.status));
  }

  async findById(id: string): Promise<Reservation | null> {
    const prisma = getPrismaClient();

    if (prisma) {
      const reservation = await prisma.courtReservation.findUnique({ where: { id } });
      return reservation ? mapPrismaReservation(reservation) : null;
    }

    const reservations = await this.findAll();
    return reservations.find((r) => r.id === id) || null;
  }

  async create(
    reservationData: Omit<Reservation, "id" | "createdAt" | "status"> & {
      status?: Reservation["status"];
    }
  ): Promise<Reservation> {
    const prisma = getPrismaClient();

    if (prisma) {
      await ensurePrismaCourt(reservationData.courtId);
      await ensurePrismaMember(reservationData.memberId);

      const available = await this.checkAvailability(
        reservationData.courtId,
        reservationData.date,
        reservationData.timeSlot.start,
        reservationData.timeSlot.end
      );

      if (!available) {
        throw new ConflictError(
          `Time slot ${reservationData.timeSlot.start}-${reservationData.timeSlot.end} conflicts with an existing reservation`
        );
      }

      const memberFields = await resolvePrismaMemberFields(reservationData.memberId);

      const reservation = await prisma.courtReservation.create({
        data: {
          courtId: reservationData.courtId,
          courtName: reservationData.courtName,
          reservationDate: reservationData.date,
          startTime: reservationData.timeSlot.start,
          endTime: reservationData.timeSlot.end,
          ...memberFields,
          guestName: reservationData.guestName,
          guestEmail: reservationData.guestEmail,
          guestPhone: reservationData.guestPhone,
          customerName: reservationData.customerName,
          customerEmail: reservationData.customerEmail,
          customerPhone: reservationData.customerPhone,
          notes: reservationData.notes,
          status: toReservationStatus(reservationData.status ?? "confirmed"),
          paymentId: reservationData.paymentId,
          paymentStatus: toPaymentStatus(reservationData.paymentStatus),
          paymentAmount: reservationData.paymentAmount,
        },
      });

      reservationCache.invalidate(`availability:${reservationData.date}`);
      return mapPrismaReservation(reservation);
    }

    const lock = new FileLock(getReservationsFile());
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error) {
      throw new LockError(
        `Could not acquire lock for reservation creation: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const reservations = await readReservations();

      const conflict = reservations.find(
        (r) =>
          r.courtId === reservationData.courtId &&
          r.date === reservationData.date &&
          blocksAvailability(r.status) &&
          timeRangesOverlap(
            reservationData.timeSlot.start,
            reservationData.timeSlot.end,
            r.timeSlot.start,
            r.timeSlot.end
          )
      );

      if (conflict) {
        throw new ConflictError(
          `Time slot ${reservationData.timeSlot.start}-${reservationData.timeSlot.end} conflicts with existing reservation ${conflict.timeSlot.start}-${conflict.timeSlot.end}`
        );
      }

      const newReservation: Reservation = {
        id: Date.now().toString(),
        ...reservationData,
        createdAt: new Date().toISOString(),
        status: reservationData.status ?? "confirmed",
      };

      reservations.push(newReservation);
      await writeReservations(reservations);
      reservationCache.invalidate(`availability:${reservationData.date}`);
      return newReservation;
    } finally {
      if (release) {
        await release();
      }
    }
  }

  async update(id: string, updates: Partial<Reservation>): Promise<Reservation> {
    const prisma = getPrismaClient();

    if (prisma) {
      const existing = await prisma.courtReservation.findUnique({ where: { id } });

      if (!existing) {
        throw new NotFoundError(`Reservation with id ${id}`);
      }

      const nextDate = updates.date || existing.reservationDate;
      const nextCourtId = updates.courtId || existing.courtId;
      const nextStart = updates.timeSlot?.start || existing.startTime;
      const nextEnd = updates.timeSlot?.end || existing.endTime;

      const available = await this.checkAvailability(
        nextCourtId,
        nextDate,
        nextStart,
        nextEnd,
        id
      );

      if (!available) {
        throw new ConflictError(
          `Updated time slot ${nextStart}-${nextEnd} conflicts with an existing reservation`
        );
      }

      if (updates.courtId) {
        await ensurePrismaCourt(updates.courtId);
      }
      if (updates.memberId !== undefined) {
        await ensurePrismaMember(updates.memberId);
      }

      const memberId = updates.memberId !== undefined
        ? updates.memberId
        : existing.playerUserId || existing.bookedByUserId || existing.legacyMemberId || undefined;
      const memberFields = await resolvePrismaMemberFields(memberId);

      const updated = await prisma.courtReservation.update({
        where: { id },
        data: {
          courtId: nextCourtId,
          courtName: updates.courtName ?? existing.courtName,
          reservationDate: nextDate,
          startTime: nextStart,
          endTime: nextEnd,
          ...memberFields,
          guestName: updates.guestName !== undefined ? updates.guestName : existing.guestName,
          guestEmail: updates.guestEmail !== undefined ? updates.guestEmail : existing.guestEmail,
          guestPhone: updates.guestPhone !== undefined ? updates.guestPhone : existing.guestPhone,
          customerName:
            updates.customerName !== undefined ? updates.customerName : existing.customerName,
          customerEmail:
            updates.customerEmail !== undefined ? updates.customerEmail : existing.customerEmail,
          customerPhone:
            updates.customerPhone !== undefined ? updates.customerPhone : existing.customerPhone,
          notes: updates.notes !== undefined ? updates.notes : existing.notes,
          status: updates.status ? toReservationStatus(updates.status) : existing.status,
          paymentId: updates.paymentId !== undefined ? updates.paymentId : existing.paymentId,
          paymentStatus:
            updates.paymentStatus !== undefined
              ? toPaymentStatus(updates.paymentStatus)
              : existing.paymentStatus,
          paymentAmount:
            updates.paymentAmount !== undefined ? updates.paymentAmount : existing.paymentAmount,
          updatedAt: new Date(),
        },
      });

      reservationCache.invalidate(`availability:${existing.reservationDate}`);
      if (nextDate !== existing.reservationDate) {
        reservationCache.invalidate(`availability:${nextDate}`);
      }

      return mapPrismaReservation(updated);
    }

    const lock = new FileLock(getReservationsFile());
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error) {
      throw new LockError(
        `Could not acquire lock for reservation update: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const reservations = await readReservations();
      const index = reservations.findIndex((r) => r.id === id);

      if (index === -1) {
        throw new NotFoundError(`Reservation with id ${id}`);
      }

      const existingReservation = reservations[index];
      const updatedReservation = { ...existingReservation, ...updates };

      if (updates.timeSlot || updates.courtId || updates.date) {
        const checkDate = updates.date || existingReservation.date;
        const checkCourtId = updates.courtId || existingReservation.courtId;
        const checkTimeSlot = updates.timeSlot || existingReservation.timeSlot;

        const conflict = reservations.find(
          (r) =>
            r.id !== id &&
            r.courtId === checkCourtId &&
            r.date === checkDate &&
            blocksAvailability(r.status) &&
            timeRangesOverlap(
              checkTimeSlot.start,
              checkTimeSlot.end,
              r.timeSlot.start,
              r.timeSlot.end
            )
        );

        if (conflict) {
          throw new ConflictError(
            `Updated time slot ${checkTimeSlot.start}-${checkTimeSlot.end} conflicts with existing reservation ${conflict.timeSlot.start}-${conflict.timeSlot.end}`
          );
        }
      }

      reservations[index] = updatedReservation;
      await writeReservations(reservations);
      reservationCache.invalidate(`availability:${existingReservation.date}`);
      if (updates.date && updates.date !== existingReservation.date) {
        reservationCache.invalidate(`availability:${updates.date}`);
      }

      return updatedReservation;
    } finally {
      if (release) {
        await release();
      }
    }
  }

  async delete(id: string): Promise<boolean> {
    const prisma = getPrismaClient();

    if (prisma) {
      const existing = await prisma.courtReservation.findUnique({ where: { id } });
      if (!existing) {
        return false;
      }

      await prisma.courtReservation.update({
        where: { id },
        data: {
          status: ReservationStatus.CANCELLED,
          updatedAt: new Date(),
        },
      });

      reservationCache.invalidate(`availability:${existing.reservationDate}`);
      return true;
    }

    const lock = new FileLock(getReservationsFile());
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error) {
      throw new LockError(
        `Could not acquire lock for reservation deletion: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const reservations = await readReservations();
      const index = reservations.findIndex((r) => r.id === id);

      if (index === -1) {
        return false;
      }

      const reservation = reservations[index];
      reservations[index].status = "cancelled";
      await writeReservations(reservations);
      reservationCache.invalidate(`availability:${reservation.date}`);
      return true;
    } finally {
      if (release) {
        await release();
      }
    }
  }

  async checkAvailability(
    courtId: string,
    date: string,
    start: string,
    end: string,
    excludeReservationId?: string
  ): Promise<boolean> {
    const prisma = getPrismaClient();

    if (prisma) {
      const reservations = await prisma.courtReservation.findMany({
        where: {
          courtId,
          reservationDate: date,
          status: {
            in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING_PAYMENT],
          },
          ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
        },
        select: {
          startTime: true,
          endTime: true,
        },
      });

      return !reservations.some((reservation) =>
        timeRangesOverlap(start, end, reservation.startTime, reservation.endTime)
      );
    }

    const reservations = await this.findByDate(date);
    const conflictingReservation = reservations.find(
      (r) =>
        r.courtId === courtId &&
        blocksAvailability(r.status) &&
        (!excludeReservationId || r.id !== excludeReservationId) &&
        timeRangesOverlap(start, end, r.timeSlot.start, r.timeSlot.end)
    );

    return !conflictingReservation;
  }
}

export const reservationRepository: IReservationRepository =
  new FileReservationRepository();
