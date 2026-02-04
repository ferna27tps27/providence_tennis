import { Reservation, Court, ReservationRequest } from "../types/reservation";
import { promises as fs } from "fs";
import path from "path";
import { format, addMinutes, parse, isBefore, differenceInHours } from "date-fns";
import { timeRangesOverlap } from "./utils/time-ranges";
import { reservationRepository } from "./repositories/file-reservation-repository";
import { reservationCache } from "./cache/reservation-cache";
import { validateMemberActive, getMember, updateMember } from "./members";
import { ValidationError } from "./errors/reservation-errors";
import { getPayment, processRefund } from "./payments/payments";
import { PaymentNotFoundError, RefundError } from "./errors/payment-errors";

const resolvedDataDir = process.env.DATA_DIR
  ? path.isAbsolute(process.env.DATA_DIR)
    ? process.env.DATA_DIR
    : path.join(process.cwd(), process.env.DATA_DIR)
  : path.join(process.cwd(), "data");
const DATA_DIR = resolvedDataDir;
const RESERVATIONS_FILE = path.join(DATA_DIR, "reservations.json");
const COURTS_FILE = path.join(DATA_DIR, "courts.json");

function generateTimeSlots(): Array<{ start: string; end: string }> {
  const slots: Array<{ start: string; end: string }> = [];
  const startTime = parse("08:00", "HH:mm", new Date());
  const endTime = parse("21:00", "HH:mm", new Date());
  let currentTime = startTime;

  while (isBefore(currentTime, endTime)) {
    const slotEnd = addMinutes(currentTime, 60);

    if (isBefore(slotEnd, endTime) || format(slotEnd, "HH:mm") === "21:00") {
      slots.push({
        start: format(currentTime, "HH:mm"),
        end: format(slotEnd, "HH:mm"),
      });
    }

    currentTime = slotEnd;
  }

  return slots;
}

async function ensureDataFiles() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
      await fs.access(RESERVATIONS_FILE);
    } catch {
      await fs.writeFile(RESERVATIONS_FILE, JSON.stringify([], null, 2));
    }

    try {
      await fs.access(COURTS_FILE);
    } catch {
      const defaultCourts: Court[] = [
        { id: "1", name: "Court 1", type: "clay", available: true },
        { id: "2", name: "Court 2", type: "clay", available: true },
        { id: "3", name: "Court 3", type: "clay", available: true },
        { id: "4", name: "Court 4", type: "clay", available: true },
        { id: "5", name: "Court 5", type: "clay", available: true },
        { id: "6", name: "Court 6", type: "clay", available: true },
        { id: "7", name: "Court 7", type: "clay", available: true },
        { id: "8", name: "Court 8", type: "clay", available: true },
        { id: "9", name: "Court 9", type: "clay", available: true },
        { id: "10", name: "Court 10", type: "clay", available: true },
      ];
      await fs.writeFile(COURTS_FILE, JSON.stringify(defaultCourts, null, 2));
    }
  } catch (error) {
    console.error("Error initializing data files:", error);
  }
}

/**
 * Get all reservations
 * @deprecated Use reservationRepository.findAll() directly
 * Kept for backward compatibility
 */
export async function getAllReservations(): Promise<Reservation[]> {
  return reservationRepository.findAll();
}

/**
 * Get reservations for a specific date
 * @deprecated Use reservationRepository.findByDate() directly
 * Kept for backward compatibility
 */
export async function getReservationsByDate(
  date: string
): Promise<Reservation[]> {
  return reservationRepository.findByDate(date);
}

export async function getAvailabilityByDate(date: string) {
  // Check cache first
  const cacheKey = `availability:${date}`;
  const cached = reservationCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const [courts, reservations] = await Promise.all([
    getAllCourts(),
    getReservationsByDate(date),
  ]);

  const timeSlots = generateTimeSlots();

  const availability = courts.map((court) => {
    const courtReservations = reservations.filter((r) => r.courtId === court.id);

    const slots = timeSlots.map((slot) => {
      // Use time range overlap detection instead of exact match
      const isReserved = courtReservations.some((r) =>
        timeRangesOverlap(
          slot.start,
          slot.end,
          r.timeSlot.start,
          r.timeSlot.end
        )
      );

      return {
        ...slot,
        available: !isReserved && court.available,
      };
    });

    return {
      courtId: court.id,
      courtName: court.name,
      courtType: court.type,
      slots,
    };
  });

  // Cache the result
  reservationCache.set(cacheKey, availability);

  return availability;
}

/**
 * Create a new reservation
 * Supports both member and guest reservations
 * Phase 4: Integrates payment validation - if paymentId is provided, payment must be paid
 */
export async function createReservation(
  reservationData: ReservationRequest
): Promise<Reservation> {
  // Validate member if memberId provided
  if (reservationData.memberId) {
    await validateMemberActive(reservationData.memberId);
  } else {
    // Validate guest fields (support both naming conventions for backward compatibility)
    const guestName = reservationData.guestName || reservationData.customerName;
    const guestEmail = reservationData.guestEmail || reservationData.customerEmail;
    const guestPhone = reservationData.guestPhone || reservationData.customerPhone;
    
    if (!guestName || !guestEmail || !guestPhone) {
      throw new ValidationError("Guest information (name, email, phone) required for non-member reservations");
    }
  }

  // Phase 4: Validate payment if paymentId is provided
  let paymentId: string | undefined;
  let paymentStatus: "pending" | "paid" | "refunded" | "failed" | undefined;
  let paymentAmount: number | undefined;

  if (reservationData.paymentId) {
    try {
      const payment = await getPayment(reservationData.paymentId);
      
      // Verify payment is for the correct member (if member reservation)
      if (reservationData.memberId && payment.memberId !== reservationData.memberId) {
        throw new ValidationError("Payment does not belong to the specified member");
      }

      // Verify payment is paid
      if (payment.status !== "paid") {
        throw new ValidationError(`Payment must be paid before creating reservation. Current status: ${payment.status}`);
      }

      // Verify payment is for court booking type
      if (payment.type !== "court_booking") {
        throw new ValidationError(`Payment type must be 'court_booking' for reservations. Current type: ${payment.type}`);
      }

      paymentId = payment.id;
      paymentStatus = payment.status as "pending" | "paid" | "refunded" | "failed";
      paymentAmount = payment.amount;
    } catch (error) {
      if (error instanceof PaymentNotFoundError) {
        throw new ValidationError(`Payment with id ${reservationData.paymentId} not found`);
      }
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Failed to validate payment: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  // Get court to populate courtName
  const court = await getCourt(reservationData.courtId);
  if (!court) {
    throw new ValidationError(`Court ${reservationData.courtId} not found`);
  }

  // Prepare reservation data for repository
  const reservationPayload: Omit<Reservation, "id" | "createdAt" | "status"> = {
    courtId: reservationData.courtId,
    courtName: court.name,
    date: reservationData.date,
    timeSlot: reservationData.timeSlot,
    notes: reservationData.notes,
  };

  // Add payment fields (Phase 4)
  if (paymentId) {
    reservationPayload.paymentId = paymentId;
    reservationPayload.paymentStatus = paymentStatus;
    reservationPayload.paymentAmount = paymentAmount;
  }

  // Add member or guest information
  if (reservationData.memberId) {
    reservationPayload.memberId = reservationData.memberId;
  } else {
    // Use guest fields, prefer new naming but support old for backward compatibility
    reservationPayload.guestName = reservationData.guestName || reservationData.customerName;
    reservationPayload.guestEmail = reservationData.guestEmail || reservationData.customerEmail;
    reservationPayload.guestPhone = reservationData.guestPhone || reservationData.customerPhone;
    
    // Also set customer fields for backward compatibility
    reservationPayload.customerName = reservationPayload.guestName;
    reservationPayload.customerEmail = reservationPayload.guestEmail;
    reservationPayload.customerPhone = reservationPayload.guestPhone;
  }

  return reservationRepository.create(reservationPayload);
}

/**
 * Cancel a reservation
 * Tracks penalty cancellations for member reservations
 * Phase 4: Handles refunds based on cancellation policy
 */
export async function cancelReservation(reservationId: string): Promise<boolean> {
  // Get reservation before deleting
  const reservation = await reservationRepository.findById(reservationId);
  
  if (!reservation) {
    return false;
  }

  // Phase 4: Process refund if payment exists
  if (reservation.paymentId && reservation.paymentStatus === "paid") {
    try {
      // Calculate hours until reservation
      const reservationDate = new Date(`${reservation.date}T${reservation.timeSlot.start}`);
      const now = new Date();
      const hoursUntilReservation = differenceInHours(reservationDate, now);

      // Cancellation policy:
      // - Full refund if cancelled 24+ hours before reservation
      // - 50% refund if cancelled 12-24 hours before reservation
      // - No refund if cancelled less than 12 hours before reservation
      let refundAmount: number | undefined;
      let refundReason: string;

      if (hoursUntilReservation >= 24) {
        // Full refund
        refundAmount = reservation.paymentAmount;
        refundReason = "Cancellation 24+ hours before reservation";
      } else if (hoursUntilReservation >= 12) {
        // 50% refund
        refundAmount = Math.floor((reservation.paymentAmount || 0) * 0.5);
        refundReason = "Cancellation 12-24 hours before reservation (50% refund)";
      } else {
        // No refund
        refundReason = "Cancellation less than 12 hours before reservation (no refund)";
      }

      // Process refund if applicable
      if (refundAmount && refundAmount > 0) {
        try {
          await processRefund({
            paymentId: reservation.paymentId,
            amount: refundAmount,
            reason: refundReason,
          });
        } catch (refundError) {
          // Log refund error but don't fail cancellation
          console.error(`Failed to process refund for payment ${reservation.paymentId}:`, refundError);
          // Update reservation payment status to indicate refund attempt failed
          // (reservation will still be cancelled)
        }
      }
    } catch (error) {
      // Log payment error but don't fail cancellation
      console.error(`Failed to process refund for reservation ${reservationId}:`, error);
    }
  }

  // Increment penalty cancellations if member reservation
  if (reservation.memberId) {
    try {
      const member = await getMember(reservation.memberId);
      await updateMember(reservation.memberId, {
        penaltyCancellations: (member.penaltyCancellations || 0) + 1,
      });
    } catch (error) {
      // Log error but don't fail cancellation if member update fails
      console.error(`Failed to update penalty cancellations for member ${reservation.memberId}:`, error);
    }
  }

  return reservationRepository.delete(reservationId);
}

export async function getAllCourts(): Promise<Court[]> {
  await ensureDataFiles();
  try {
    const data = await fs.readFile(COURTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading courts:", error);
    return [];
  }
}

export async function getCourt(courtId: string): Promise<Court | null> {
  const courts = await getAllCourts();
  return courts.find((c) => c.id === courtId) || null;
}

/**
 * Check if a time slot is available for a given court and date
 * @deprecated Use reservationRepository.checkAvailability() directly
 * Kept for backward compatibility
 */
export async function checkAvailability(
  courtId: string,
  date: string,
  start: string,
  end: string,
  excludeReservationId?: string
): Promise<boolean> {
  return reservationRepository.checkAvailability(
    courtId,
    date,
    start,
    end,
    excludeReservationId
  );
}
