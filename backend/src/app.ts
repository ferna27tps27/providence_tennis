import "dotenv/config";
import express from "express";
import cors from "cors";
import { chatWithAgent, ChatMessage } from "./lib/ai-agent";
import {
  cancelReservation,
  createReservation,
  getAllCourts,
  getAllReservations,
  getAvailabilityByDate,
  getCourt,
  getReservationsByDate,
} from "./lib/reservations";
import { reservationRepository } from "./lib/repositories/file-reservation-repository";
import { ReservationRequest } from "./types/reservation";
import {
  ConflictError,
  LockError,
  NotFoundError,
  ReservationError,
  ValidationError,
} from "./lib/errors/reservation-errors";
import {
  createMember,
  getMember,
  getMemberByEmail,
  updateMember,
  deleteMember,
  listMembers,
  searchMembers,
  getMembersByRole,
} from "./lib/members";
import { MemberRequest } from "./types/member";
import {
  MemberNotFoundError,
  DuplicateEmailError,
  DuplicateMemberNumberError,
  MemberValidationError,
  MemberLockError,
  InvalidMemberStatusError,
  MemberError,
} from "./lib/errors/member-errors";
import {
  signUp,
  signIn,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getCurrentMember,
} from "./lib/auth/auth";
import {
  AuthenticationError,
  EmailAlreadyExistsError,
  InvalidVerificationTokenError,
  EmailNotVerifiedError,
  InvalidResetTokenError,
  UnauthorizedError,
} from "./lib/errors/auth-errors";
import { authenticate, requireRole } from "./lib/auth/auth-middleware";
import {
  createPaymentIntent as createPaymentIntentService,
  confirmPayment,
  getPayment,
  getPayments,
  getMemberPayments,
  processRefund,
  getPaymentInvoice,
  syncPayment,
} from "./lib/payments/payments";
import {
  PaymentNotFoundError,
  PaymentProcessingError,
  PaymentIntentError,
  PaymentConfirmationError,
  RefundError,
  InvalidAmountError,
  StripeError,
} from "./lib/errors/payment-errors";
import {
  createJournalEntry,
  getJournalEntry,
  getJournalEntries,
  updateJournalEntry,
  deleteJournalEntry,
  canViewJournalEntry,
} from "./lib/journal";
import { JournalEntryRequest, JournalFilter } from "./types/journal";
import {
  JournalEntryNotFoundError,
  JournalValidationError,
  JournalAuthorizationError,
  JournalLockError,
  JournalError,
} from "./lib/errors/journal-errors";
import { normalizeRole } from "./lib/utils/role-utils";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const validHistory: ChatMessage[] = (Array.isArray(conversationHistory)
      ? conversationHistory
      : []
    )
      .filter(
        (msg: any) => msg?.role === "user" || msg?.role === "assistant"
      )
      .map((msg: any) => ({
        role: msg.role,
        content: msg.content || "",
      }));

    const result = await chatWithAgent(message, validHistory);

    return res.json({
      response: result.response,
      sources: result.sources,
    });
  } catch (error: any) {
    console.error("Error in chat API:", error);
    return res.status(500).json({
      error: error.message || "Failed to process chat message",
    });
  }
});

app.get("/api/availability", async (req, res) => {
  try {
    const date = String(req.query.date || "");
    if (!date) {
      return res.status(400).json({ error: "Date parameter is required" });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res
        .status(400)
        .json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }

    const availability = await getAvailabilityByDate(date);
    return res.json({ date, availability });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return res.status(500).json({ error: "Failed to fetch availability" });
  }
});

app.get("/api/courts", async (_req, res) => {
  try {
    const courts = await getAllCourts();
    return res.json(courts);
  } catch (error) {
    console.error("Error fetching courts:", error);
    return res.status(500).json({ error: "Failed to fetch courts" });
  }
});

app.get("/api/reservations", async (req, res) => {
  try {
    const date = String(req.query.date || "");
    if (date) {
      const reservations = await getReservationsByDate(date);
      return res.json(reservations);
    }

    const reservations = await getAllReservations();
    return res.json(reservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return res.status(500).json({ error: "Failed to fetch reservations" });
  }
});

function normalizeQueryParam(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? "");
  }
  return String(value ?? "");
}

async function attachReservationContext(reservation: any) {
  const base = {
    ...reservation,
    contactName: "",
    contactEmail: "",
    member: null as null | {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role?: string;
    },
  };

  if (reservation.memberId) {
    try {
      const member = await getMember(reservation.memberId);
      const firstName = (member as any).firstName || "";
      const lastName = (member as any).lastName || "";
      base.member = {
        id: member.id,
        firstName,
        lastName,
        email: member.email,
        role: (member as any).role,
      };
      base.contactName = `${firstName} ${lastName}`.trim();
      base.contactEmail = member.email;
      return base;
    } catch (error) {
      // Fall back to guest fields if member lookup fails
    }
  }

  base.contactName =
    reservation.guestName ||
    reservation.customerName ||
    "";
  base.contactEmail =
    reservation.guestEmail ||
    reservation.customerEmail ||
    "";
  return base;
}

app.get("/api/admin/reservations", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const dateFrom = normalizeQueryParam(req.query.dateFrom);
    const dateTo = normalizeQueryParam(req.query.dateTo);
    const status = normalizeQueryParam(req.query.status);
    const courtId = normalizeQueryParam(req.query.courtId);
    const search = normalizeQueryParam(req.query.search).toLowerCase();

    let reservations = await getAllReservations();

    if (dateFrom) {
      reservations = reservations.filter((r) => r.date >= dateFrom);
    }
    if (dateTo) {
      reservations = reservations.filter((r) => r.date <= dateTo);
    }
    if (status) {
      reservations = reservations.filter((r) => r.status === status);
    }
    if (courtId) {
      reservations = reservations.filter((r) => r.courtId === courtId);
    }

    const enriched = await Promise.all(
      reservations.map((reservation) => attachReservationContext(reservation))
    );

    const filtered = search
      ? enriched.filter((reservation) => {
          const fields = [
            reservation.id,
            reservation.courtName,
            reservation.contactName,
            reservation.contactEmail,
          ]
            .filter(Boolean)
            .map((value: string) => value.toLowerCase());
          return fields.some((value) => value.includes(search));
        })
      : enriched;

    return res.json(filtered);
  } catch (error: any) {
    console.error("Error fetching admin reservations:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch reservations",
    });
  }
});

app.post("/api/admin/reservations", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const body: ReservationRequest = req.body;

    if (
      !body?.courtId ||
      !body?.date ||
      !body?.timeSlot?.start ||
      !body?.timeSlot?.end
    ) {
      return res.status(400).json({ error: "Missing required fields: courtId, date, timeSlot" });
    }

    const court = await getCourt(body.courtId);
    if (!court) {
      return res.status(404).json({ error: "Court not found" });
    }

    const reservation = await createReservation({
      courtId: body.courtId,
      date: body.date,
      timeSlot: body.timeSlot,
      memberId: body.memberId,
      guestName: body.guestName || body.customerName,
      guestEmail: body.guestEmail || body.customerEmail,
      guestPhone: body.guestPhone || body.customerPhone,
      customerName: body.customerName || body.guestName,
      customerEmail: body.customerEmail || body.guestEmail,
      customerPhone: body.customerPhone || body.guestPhone,
      notes: body.notes,
      paymentId: body.paymentId,
    });

    const enriched = await attachReservationContext(reservation);
    return res.status(201).json(enriched);
  } catch (error: any) {
    console.error("Error creating admin reservation:", error);

    if (error instanceof ConflictError) {
      return res.status(409).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof ValidationError || error instanceof ReservationError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(400).json({
      error: error.message || "Failed to create reservation",
    });
  }
});

app.patch("/api/admin/reservations/:id", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No update data provided" });
    }

    if (updates.status && !["confirmed", "cancelled"].includes(updates.status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    if (updates.status === "cancelled") {
      const success = await cancelReservation(id);
      if (!success) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      const cancelled = await reservationRepository.findById(id);
      if (!cancelled) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      const enriched = await attachReservationContext(cancelled);
      return res.json(enriched);
    }

    const allowedUpdates: any = {};

    if (typeof updates.date === "string") {
      allowedUpdates.date = updates.date;
    }

    if (updates.timeSlot?.start && updates.timeSlot?.end) {
      allowedUpdates.timeSlot = updates.timeSlot;
    }

    if (typeof updates.courtId === "string") {
      const court = await getCourt(updates.courtId);
      if (!court) {
        return res.status(404).json({ error: "Court not found" });
      }
      allowedUpdates.courtId = updates.courtId;
      allowedUpdates.courtName = court.name;
    }

    if (typeof updates.notes === "string") {
      allowedUpdates.notes = updates.notes;
    }

    if (typeof updates.status === "string") {
      allowedUpdates.status = updates.status;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ error: "No valid update fields provided" });
    }

    const updatedReservation = await reservationRepository.update(id, allowedUpdates);
    const enriched = await attachReservationContext(updatedReservation);
    return res.json(enriched);
  } catch (error: any) {
    console.error("Error updating admin reservation:", error);

    if (error instanceof ConflictError) {
      return res.status(409).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(400).json({
      error: error.message || "Failed to update reservation",
    });
  }
});

app.delete("/api/admin/reservations/:id", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const success = await cancelReservation(id);

    if (!success) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    return res.json({ message: "Reservation cancelled successfully" });
  } catch (error: any) {
    console.error("Error cancelling admin reservation:", error);
    return res.status(500).json({
      error: error.message || "Failed to cancel reservation",
    });
  }
});

app.post("/api/reservations", async (req, res) => {
  try {
    const body: ReservationRequest = req.body;

    // Validate required fields
    if (
      !body?.courtId ||
      !body?.date ||
      !body?.timeSlot?.start ||
      !body?.timeSlot?.end
    ) {
      return res.status(400).json({ error: "Missing required fields: courtId, date, timeSlot" });
    }

    // Validate either memberId OR guest information
    if (!body.memberId) {
      // Guest reservation - validate guest fields (support both naming conventions)
      const guestName = body.guestName || body.customerName;
      const guestEmail = body.guestEmail || body.customerEmail;
      const guestPhone = body.guestPhone || body.customerPhone;

      if (!guestName || !guestEmail || !guestPhone) {
        return res.status(400).json({
          error: "Missing required fields: either memberId or guest information (name, email, phone)",
        });
      }

      // Validate email format for guest
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
    }

    const court = await getCourt(body.courtId);
    if (!court) {
      return res.status(404).json({ error: "Court not found" });
    }

    // Create reservation (member validation, court lookup, and payment validation happen in createReservation)
    const reservation = await createReservation({
      courtId: body.courtId,
      date: body.date,
      timeSlot: body.timeSlot,
      memberId: body.memberId,
      guestName: body.guestName || body.customerName,
      guestEmail: body.guestEmail || body.customerEmail,
      guestPhone: body.guestPhone || body.customerPhone,
      customerName: body.customerName || body.guestName, // Backward compatibility
      customerEmail: body.customerEmail || body.guestEmail,
      customerPhone: body.customerPhone || body.guestPhone,
      notes: body.notes,
      paymentId: body.paymentId, // Phase 4: Payment integration
    });

    return res.status(201).json(reservation);
  } catch (error: any) {
    console.error("Error creating reservation:", error);
    
    // Handle specific error types
    if (error instanceof ConflictError) {
      return res.status(409).json({
        error: error.message,
        code: error.code,
      });
    }
    
    if (error instanceof LockError) {
      return res.status(503).json({
        error: "Service temporarily unavailable. Please try again.",
        code: error.code,
      });
    }

    if (error instanceof MemberNotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof InvalidMemberStatusError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }
    
    if (error instanceof ValidationError || error instanceof ReservationError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }
    
    return res.status(400).json({
      error: error.message || "Failed to create reservation",
    });
  }
});

app.get("/api/reservations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await reservationRepository.findById(id);

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    return res.json(reservation);
  } catch (error: any) {
    console.error("Error fetching reservation:", error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }
    
    return res.status(500).json({ error: "Failed to fetch reservation" });
  }
});

app.delete("/api/reservations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await cancelReservation(id);

    if (!success) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    return res.json({ message: "Reservation cancelled successfully" });
  } catch (error: any) {
    console.error("Error cancelling reservation:", error);
    
    // Handle specific error types
    if (error instanceof LockError) {
      return res.status(503).json({
        error: "Service temporarily unavailable. Please try again.",
        code: error.code,
      });
    }
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }
    
    return res.status(500).json({
      error: error.message || "Failed to cancel reservation",
    });
  }
});

app.put("/api/reservations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate that updates are provided
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No update data provided" });
    }

    // Validate email if provided
    if (updates.customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.customerEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
    }

    // Validate court exists if courtId is being updated
    if (updates.courtId) {
      const court = await getCourt(updates.courtId);
      if (!court) {
        return res.status(404).json({ error: "Court not found" });
      }
      // Update courtName if courtId changes
      if (updates.courtId) {
        updates.courtName = court.name;
      }
    }

    const updatedReservation = await reservationRepository.update(id, updates);

    return res.json(updatedReservation);
  } catch (error: any) {
    console.error("Error updating reservation:", error);
    
    // Handle specific error types
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }
    
    if (error instanceof ConflictError) {
      return res.status(409).json({
        error: error.message,
        code: error.code,
      });
    }
    
    if (error instanceof LockError) {
      return res.status(503).json({
        error: "Service temporarily unavailable. Please try again.",
        code: error.code,
      });
    }
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }
    
    return res.status(400).json({
      error: error.message || "Failed to update reservation",
    });
  }
});

// ==================== MEMBER API ENDPOINTS ====================

app.get("/api/members", async (req, res) => {
  try {
    const filter = req.query.filter as "all" | "active" | "inactive" | undefined;
    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;

    let members;
    if (role) {
      // Get members by role
      members = await getMembersByRole(role as any);
      // Apply additional filters if needed
      if (filter && filter !== "all") {
        members = members.filter((m) => 
          filter === "active" ? m.isActive : !m.isActive
        );
      }
      if (search) {
        const allMembers = await searchMembers(search);
        const memberIds = new Set(members.map(m => m.id));
        members = allMembers.filter(m => memberIds.has(m.id));
      }
    } else {
      members = await listMembers({
        status: filter || "all",
        search: search,
      });
    }

    return res.json(members);
  } catch (error: any) {
    console.error("Error fetching members:", error);
    return res.status(500).json({ error: "Failed to fetch members" });
  }
});

app.get("/api/members/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const member = await getMember(id);

    return res.json(member);
  } catch (error: any) {
    console.error("Error fetching member:", error);

    if (error instanceof MemberNotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({ error: "Failed to fetch member" });
  }
});

app.post("/api/members", async (req, res) => {
  try {
    const body: MemberRequest = req.body;

    if (
      !body?.firstName ||
      !body?.lastName ||
      !body?.email ||
      !body?.phone
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const member = await createMember(body);

    return res.status(201).json(member);
  } catch (error: any) {
    console.error("Error creating member:", error);

    // Handle specific error types
    if (error instanceof DuplicateEmailError) {
      return res.status(409).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof DuplicateMemberNumberError) {
      return res.status(409).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof MemberValidationError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof MemberLockError) {
      return res.status(503).json({
        error: "Service temporarily unavailable. Please try again.",
        code: error.code,
      });
    }

    return res.status(400).json({
      error: error.message || "Failed to create member",
    });
  }
});

app.put("/api/members/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate that updates are provided
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No update data provided" });
    }

    const updatedMember = await updateMember(id, updates);

    return res.json(updatedMember);
  } catch (error: any) {
    console.error("Error updating member:", error);

    // Handle specific error types
    if (error instanceof MemberNotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof DuplicateEmailError) {
      return res.status(409).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof DuplicateMemberNumberError) {
      return res.status(409).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof MemberValidationError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof MemberLockError) {
      return res.status(503).json({
        error: "Service temporarily unavailable. Please try again.",
        code: error.code,
      });
    }

    return res.status(400).json({
      error: error.message || "Failed to update member",
    });
  }
});

app.patch("/api/members/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate that updates are provided
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No update data provided" });
    }

    const updatedMember = await updateMember(id, updates);

    return res.json(updatedMember);
  } catch (error: any) {
    console.error("Error updating member:", error);

    // Handle specific error types
    if (error instanceof MemberNotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof DuplicateEmailError) {
      return res.status(409).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof DuplicateMemberNumberError) {
      return res.status(409).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof MemberValidationError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof MemberLockError) {
      return res.status(503).json({
        error: "Service temporarily unavailable. Please try again.",
        code: error.code,
      });
    }

    return res.status(400).json({
      error: error.message || "Failed to update member",
    });
  }
});

app.delete("/api/members/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deleteMember(id);

    if (!success) {
      return res.status(404).json({
        error: "Member not found",
        code: "NOT_FOUND",
      });
    }

    return res.json({ success: true, message: "Member deactivated successfully" });
  } catch (error: any) {
    console.error("Error deleting member:", error);

    // Handle specific error types
    if (error instanceof MemberNotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof MemberLockError) {
      return res.status(503).json({
        error: "Service temporarily unavailable. Please try again.",
        code: error.code,
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to delete member",
    });
  }
});

/**
 * GET /api/members/me/reservations
 * Get current user's reservations (authenticated).
 * Uses session memberId to avoid client/server id mismatch.
 */
app.get("/api/members/me/reservations", authenticate, async (req, res) => {
  try {
    if (!req.session) {
      return res.status(401).json({
        error: "Not authenticated",
        code: "UNAUTHORIZED",
      });
    }
    const memberId = req.session.memberId;

    const allReservations = await getAllReservations();
    const memberReservations = allReservations.filter(
      (r) => r.memberId === memberId
    );

    return res.json(memberReservations);
  } catch (error: any) {
    console.error("Error fetching member reservations:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch member reservations",
    });
  }
});

app.get("/api/members/:id/reservations", async (req, res) => {
  try {
    const { id } = req.params;

    // Verify member exists
    await getMember(id);

    // Get all reservations and filter by memberId
    const allReservations = await getAllReservations();
    const memberReservations = allReservations.filter(
      (r) => r.memberId === id
    );

    return res.json(memberReservations);
  } catch (error: any) {
    console.error("Error fetching member reservations:", error);

    if (error instanceof MemberNotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to fetch member reservations",
    });
  }
});

// ============================================
// Authentication Endpoints
// ============================================

/**
 * POST /api/auth/signup
 * Create a new member account
 */
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        error: "Missing required fields: firstName, lastName, email, phone, password",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await signUp({
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
    });

    // Email verification is disabled - automatically sign in the user
    // Create a session and token for immediate access
    const signInResult = await signIn({
      email,
      password,
    });

    return res.status(201).json({
      message: "Account created successfully. You have been automatically signed in.",
      member: signInResult.member,
      token: signInResult.token,
    });
  } catch (error: any) {
    console.error("Error in signup:", error);

    if (error instanceof EmailAlreadyExistsError) {
      return res.status(409).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof AuthenticationError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to create account",
    });
  }
});

/**
 * POST /api/auth/signin
 * Sign in with email and password
 */
app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await signIn({ email, password });

    return res.json(result);
  } catch (error: any) {
    console.error("Error in signin:", error);

    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to sign in",
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
app.get("/api/auth/me", authenticate, async (req, res) => {
  try {
    if (!req.session) {
      return res.status(401).json({
        error: "Not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const member = await getCurrentMember(req.session.memberId);

    return res.json(member);
  } catch (error: any) {
    console.error("Error fetching current user:", error);

    if (error instanceof MemberNotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to fetch user",
    });
  }
});

/**
 * POST /api/auth/logout
 * Sign out (client should discard token)
 */
app.post("/api/auth/logout", authenticate, async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can still acknowledge it
    return res.json({
      message: "Logged out successfully",
    });
  } catch (error: any) {
    console.error("Error in logout:", error);
    return res.status(500).json({
      error: error.message || "Failed to logout",
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
app.post("/api/auth/verify-email", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: "Verification token is required",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await verifyEmail(token);

    return res.json(result);
  } catch (error: any) {
    console.error("Error verifying email:", error);

    if (error instanceof InvalidVerificationTokenError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof MemberNotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to verify email",
    });
  }
});

/**
 * GET /api/auth/verify-email/:token
 * Verify email via GET (for email links)
 */
app.get("/api/auth/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const result = await verifyEmail(token);

    // Redirect to frontend success page
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3009";
    return res.redirect(`${frontendUrl}/verify-email?success=true`);
  } catch (error: any) {
    console.error("Error verifying email:", error);

    // Redirect to frontend error page
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3009";
    return res.redirect(`${frontendUrl}/verify-email?error=invalid_token`);
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await requestPasswordReset(email);

    return res.json(result);
  } catch (error: any) {
    console.error("Error requesting password reset:", error);
    return res.status(500).json({
      error: error.message || "Failed to request password reset",
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: "Token and new password are required",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await resetPassword(token, newPassword);

    return res.json(result);
  } catch (error: any) {
    console.error("Error resetting password:", error);

    if (error instanceof InvalidResetTokenError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof AuthenticationError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof MemberNotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to reset password",
    });
  }
});

// ============================================
// Payment Endpoints
// ============================================

/**
 * POST /api/payments/create-intent
 * Create a payment intent for booking or membership
 */
app.post("/api/payments/create-intent", authenticate, async (req, res) => {
  try {
    if (!req.session) {
      return res.status(401).json({
        error: "Not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const { amount, currency, reservationId, description, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: "Amount is required and must be greater than 0",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await createPaymentIntentService({
      amount: Math.round(amount * 100), // Convert dollars to cents
      currency: currency || "usd",
      memberId: req.session.memberId,
      reservationId,
      description,
      metadata,
    });

    return res.json({
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
    });
  } catch (error: any) {
    console.error("Error creating payment intent:", error);

    if (error instanceof PaymentIntentError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof InvalidAmountError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof StripeError) {
      return res.status(500).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to create payment intent",
    });
  }
});

/**
 * POST /api/payments/confirm
 * Confirm a payment
 */
app.post("/api/payments/confirm", authenticate, async (req, res) => {
  try {
    if (!req.session) {
      return res.status(401).json({
        error: "Not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const { paymentIntentId, paymentMethodId, reservationId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        error: "PaymentIntent ID is required",
        code: "VALIDATION_ERROR",
      });
    }

    const payment = await confirmPayment({
      paymentIntentId,
      paymentMethodId,
      reservationId,
    });

    return res.json(payment);
  } catch (error: any) {
    console.error("Error confirming payment:", error);

    if (error instanceof PaymentConfirmationError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof PaymentNotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof StripeError) {
      return res.status(500).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to confirm payment",
    });
  }
});

/**
 * GET /api/payments
 * Get payment history (member-specific or filtered)
 */
app.get("/api/payments", authenticate, async (req, res) => {
  try {
    if (!req.session) {
      return res.status(401).json({
        error: "Not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const { status, type, startDate, endDate } = req.query;

    // Get payments for current member by default
    const payments = await getMemberPayments(req.session.memberId);

    // Apply filters
    let filtered = payments;

    if (status) {
      filtered = filtered.filter((p) => p.status === status);
    }

    if (type) {
      filtered = filtered.filter((p) => p.type === type);
    }

    if (startDate) {
      const start = new Date(startDate as string);
      filtered = filtered.filter((p) => new Date(p.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((p) => new Date(p.createdAt) <= end);
    }

    return res.json(filtered);
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch payments",
    });
  }
});

/**
 * GET /api/payments/:id
 * Get payment details
 */
app.get("/api/payments/:id", authenticate, async (req, res) => {
  try {
    if (!req.session) {
      return res.status(401).json({
        error: "Not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const { id } = req.params;
    const payment = await getPayment(id);

    // Verify payment belongs to current member (unless admin)
    if (payment.memberId !== req.session.memberId && req.session.role !== "admin") {
      return res.status(403).json({
        error: "Access denied",
        code: "FORBIDDEN",
      });
    }

    return res.json(payment);
  } catch (error: any) {
    console.error("Error fetching payment:", error);

    if (error instanceof PaymentNotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to fetch payment",
    });
  }
});

/**
 * GET /api/payments/:id/invoice
 * Get payment invoice
 */
app.get("/api/payments/:id/invoice", authenticate, async (req, res) => {
  try {
    if (!req.session) {
      return res.status(401).json({
        error: "Not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const { id } = req.params;
    const payment = await getPayment(id);

    // Verify payment belongs to current member (unless admin)
    if (payment.memberId !== req.session.memberId && req.session.role !== "admin") {
      return res.status(403).json({
        error: "Access denied",
        code: "FORBIDDEN",
      });
    }

    const invoice = await getPaymentInvoice(id);
    const format = req.query.format || "json";

    if (format === "text") {
      const { formatInvoiceAsText } = await import("./lib/payments/invoice-generator");
      return res.type("text/plain").send(formatInvoiceAsText(invoice));
    }

    return res.json(invoice);
  } catch (error: any) {
    console.error("Error fetching invoice:", error);

    if (error instanceof PaymentNotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to fetch invoice",
    });
  }
});

/**
 * POST /api/payments/membership
 * Process membership payment
 */
app.post("/api/payments/membership", authenticate, async (req, res) => {
  try {
    if (!req.session) {
      return res.status(401).json({
        error: "Not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const { amount, currency, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: "Amount is required and must be greater than 0",
        code: "VALIDATION_ERROR",
      });
    }

    const result = await createPaymentIntentService({
      amount: Math.round(amount * 100), // Convert dollars to cents
      currency: currency || "usd",
      memberId: req.session.memberId,
      description: description || "Membership Fee",
      metadata: {
        type: "membership",
      },
    });

    return res.json({
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
    });
  } catch (error: any) {
    console.error("Error processing membership payment:", error);

    if (error instanceof PaymentIntentError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof InvalidAmountError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof StripeError) {
      return res.status(500).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to process membership payment",
    });
  }
});

/**
 * POST /api/payments/:id/refund
 * Process a refund
 */
app.post("/api/payments/:id/refund", authenticate, async (req, res) => {
  try {
    if (!req.session) {
      return res.status(401).json({
        error: "Not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const { id } = req.params;
    const { amount, reason } = req.body;

    // Get payment to verify ownership
    const payment = await getPayment(id);

    // Verify payment belongs to current member or user is admin
    if (payment.memberId !== req.session.memberId && req.session.role !== "admin") {
      return res.status(403).json({
        error: "Access denied",
        code: "FORBIDDEN",
      });
    }

    // Convert amount from dollars to cents if provided
    const refundAmount = amount ? Math.round(amount * 100) : undefined;

    const refunded = await processRefund({
      paymentId: id,
      amount: refundAmount,
      reason,
    });

    return res.json(refunded);
  } catch (error: any) {
    console.error("Error processing refund:", error);

    if (error instanceof RefundError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof PaymentNotFoundError) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof StripeError) {
      return res.status(500).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to process refund",
    });
  }
});

// ==================== Journal Endpoints ====================

/**
 * Create journal entry (coach only)
 */
app.post("/api/journal/entries", authenticate, requireRole("coach", "admin"), async (req, res) => {
  try {
    const member = await getCurrentMember(req.session?.memberId || "");
    const body: JournalEntryRequest = req.body;

    const entry = await createJournalEntry(body, member.id);

    return res.status(201).json(entry);
  } catch (error: any) {
    console.error("Error creating journal entry:", error);
    
    if (error instanceof JournalValidationError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    if (error instanceof JournalAuthorizationError) {
      return res.status(403).json({ error: error.message, code: error.code });
    }
    if (error instanceof JournalLockError) {
      return res.status(503).json({ error: error.message, code: error.code });
    }
    
    return res.status(500).json({
      error: error.message || "Failed to create journal entry",
    });
  }
});

/**
 * Get journal entries with optional filtering
 */
app.get("/api/journal/entries", authenticate, async (req, res) => {
  try {
    const member = await getCurrentMember(req.session?.memberId || "");
    const memberRole = normalizeRole(member.role);

    // Build filter from query params
    const filter: JournalFilter = {};
    
    // Store name-based search queries for filtering after enrichment
    const playerNameQuery = req.query.playerName ? String(req.query.playerName).trim() : null;
    const coachNameQuery = req.query.coachName ? String(req.query.coachName).trim() : null;

    // Players can only see their own entries
    if (memberRole === "player") {
      filter.playerId = member.id;
    } else if (memberRole === "coach") {
      // Coaches can filter by playerId or playerName, or see all their entries
      if (req.query.playerId) {
        filter.playerId = String(req.query.playerId);
      } else if (!playerNameQuery) {
        // If no player filter, show only this coach's entries
        filter.coachId = member.id;
      }
      // If playerName is provided, we'll filter after enrichment
    }
    // Admins can see all entries

    // Handle coachId filter (coachName will be handled after enrichment)
    if (req.query.coachId) {
      filter.coachId = String(req.query.coachId);
    }

    // Handle playerId filter (playerName will be handled after enrichment)
    if (req.query.playerId && !filter.playerId) {
      filter.playerId = String(req.query.playerId);
    }

    if (req.query.startDate) {
      filter.startDate = String(req.query.startDate);
    }
    if (req.query.endDate) {
      filter.endDate = String(req.query.endDate);
    }
    if (req.query.areaWorkedOn) {
      filter.areaWorkedOn = String(req.query.areaWorkedOn);
    }

    const entries = await getJournalEntries(filter);

    // Enrich entries with coach/player names
    let enriched = await Promise.all(
      entries.map(async (entry) => {
        try {
          // Ensure IDs are strings (defensive check)
          const coachId = String(entry.coachId || "");
          const playerId = String(entry.playerId || "");
          
          if (!coachId || !playerId) {
            console.warn(`Journal entry ${entry.id} has invalid IDs: coachId=${coachId}, playerId=${playerId}`);
            return entry;
          }
          
          const coach = await getMember(coachId);
          const player = await getMember(playerId);
          return {
            ...entry,
            coachName: `${coach.firstName} ${coach.lastName}`,
            playerName: `${player.firstName} ${player.lastName}`,
          };
        } catch (error: any) {
          console.error(`Error enriching journal entry ${entry.id}:`, error.message);
          return entry;
        }
      })
    );

    // Filter by name if name queries were provided
    if (playerNameQuery) {
      const lowerPlayerName = playerNameQuery.toLowerCase();
      enriched = enriched.filter((entry) => {
        const enrichedEntry = entry as typeof entry & { playerName?: string };
        const entryPlayerName = enrichedEntry.playerName?.toLowerCase() || "";
        return entryPlayerName.includes(lowerPlayerName);
      });
    }

    if (coachNameQuery) {
      const lowerCoachName = coachNameQuery.toLowerCase();
      enriched = enriched.filter((entry) => {
        const enrichedEntry = entry as typeof entry & { coachName?: string };
        const entryCoachName = enrichedEntry.coachName?.toLowerCase() || "";
        return entryCoachName.includes(lowerCoachName);
      });
    }

    return res.json({
      entries: enriched,
      total: enriched.length,
    });
  } catch (error: any) {
    console.error("Error fetching journal entries:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch journal entries",
    });
  }
});

/**
 * Get journal entry by ID
 */
app.get("/api/journal/entries/:id", authenticate, async (req, res) => {
  try {
    const member = await getCurrentMember(req.session?.memberId || "");
    const entryId = req.params.id;

    // Check authorization
    const canView = await canViewJournalEntry(entryId, member.id);
    if (!canView) {
      return res.status(403).json({
        error: "Not authorized to view this journal entry",
        code: "UNAUTHORIZED",
      });
    }

    const entry = await getJournalEntry(entryId);

    // Enrich with names
    try {
      // Ensure IDs are strings (defensive check)
      const coachId = String(entry.coachId || "");
      const playerId = String(entry.playerId || "");
      
      if (!coachId || !playerId) {
        console.warn(`Journal entry ${entry.id} has invalid IDs: coachId=${coachId}, playerId=${playerId}`);
        return res.json(entry);
      }
      
      const coach = await getMember(coachId);
      const player = await getMember(playerId);
      const enriched = {
        ...entry,
        coachName: `${coach.firstName} ${coach.lastName}`,
        playerName: `${player.firstName} ${player.lastName}`,
      };
      return res.json(enriched);
    } catch (error: any) {
      console.error(`Error enriching journal entry ${entry.id}:`, error.message);
      return res.json(entry);
    }
  } catch (error: any) {
    console.error("Error fetching journal entry:", error);
    
    if (error instanceof JournalEntryNotFoundError) {
      return res.status(404).json({ error: error.message, code: error.code });
    }
    if (error instanceof JournalAuthorizationError) {
      return res.status(403).json({ error: error.message, code: error.code });
    }
    
    return res.status(500).json({
      error: error.message || "Failed to fetch journal entry",
    });
  }
});

/**
 * Update journal entry
 */
app.put("/api/journal/entries/:id", authenticate, async (req, res) => {
  try {
    const member = await getCurrentMember(req.session?.memberId || "");
    const entryId = req.params.id;
    const updates: Partial<JournalEntryRequest> = req.body;

    const entry = await updateJournalEntry(entryId, updates, member.id);

    // Enrich with names
    try {
      // Ensure IDs are strings (defensive check)
      const coachId = String(entry.coachId || "");
      const playerId = String(entry.playerId || "");
      
      if (!coachId || !playerId) {
        console.warn(`Journal entry ${entry.id} has invalid IDs: coachId=${coachId}, playerId=${playerId}`);
        return res.json(entry);
      }
      
      const coach = await getMember(coachId);
      const player = await getMember(playerId);
      const enriched = {
        ...entry,
        coachName: `${coach.firstName} ${coach.lastName}`,
        playerName: `${player.firstName} ${player.lastName}`,
      };
      return res.json(enriched);
    } catch (error: any) {
      console.error(`Error enriching journal entry ${entry.id}:`, error.message);
      return res.json(entry);
    }
  } catch (error: any) {
    console.error("Error updating journal entry:", error);
    
    if (error instanceof JournalEntryNotFoundError) {
      return res.status(404).json({ error: error.message, code: error.code });
    }
    if (error instanceof JournalValidationError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    if (error instanceof JournalAuthorizationError) {
      return res.status(403).json({ error: error.message, code: error.code });
    }
    if (error instanceof JournalLockError) {
      return res.status(503).json({ error: error.message, code: error.code });
    }
    
    return res.status(500).json({
      error: error.message || "Failed to update journal entry",
    });
  }
});

/**
 * Delete journal entry
 */
app.delete("/api/journal/entries/:id", authenticate, async (req, res) => {
  try {
    const member = await getCurrentMember(req.session?.memberId || "");
    const entryId = req.params.id;

    const deleted = await deleteJournalEntry(entryId, member.id);

    if (!deleted) {
      return res.status(404).json({
        error: "Journal entry not found",
        code: "NOT_FOUND",
      });
    }

    return res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting journal entry:", error);
    
    if (error instanceof JournalEntryNotFoundError) {
      return res.status(404).json({ error: error.message, code: error.code });
    }
    if (error instanceof JournalAuthorizationError) {
      return res.status(403).json({ error: error.message, code: error.code });
    }
    if (error instanceof JournalLockError) {
      return res.status(503).json({ error: error.message, code: error.code });
    }
    
    return res.status(500).json({
      error: error.message || "Failed to delete journal entry",
    });
  }
});

export default app;
