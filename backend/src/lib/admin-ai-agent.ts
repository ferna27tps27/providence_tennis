import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import {
  getAllReservations,
  getReservationsByDate,
  getAvailabilityByDate,
  getCourt,
  getAllCourts,
} from "./reservations";
import { reservationRepository } from "./repositories/file-reservation-repository";
import { ConflictError } from "./errors/reservation-errors";
import { Reservation } from "../types/reservation";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

const ADMIN_BOOKING_CONTEXT = `
You are an AI assistant helping tennis club administrators manage court reservations at Providence Tennis Academy.

Your role:
- Help admins find, view, and modify court reservations
- Move/reschedule bookings when requested
- Check for conflicts before making changes
- Warn about conflicts but allow admin override if requested
- Provide clear confirmation of all actions

Key capabilities:
1. Search reservations by date, court, member name, or booking ID
2. Move reservations to different dates, times, or courts
3. Cancel reservations when requested
4. Check availability before suggesting alternatives
5. Handle conflicts gracefully with warnings

Important rules:
- ALWAYS check for conflicts before moving a reservation
- If a conflict exists, WARN the admin and ask what to do:
  * Cancel the conflicting booking
  * Choose a different time
  * Keep the existing booking unchanged
- When moving a booking, be explicit about what's changing
- Confirm all actions with details (old time → new time)
- Be concise but thorough

Response style:
- Be professional and efficient
- Use clear, structured responses
- Always confirm what action was taken
- Highlight any conflicts or issues

Remember: You are assisting ADMINS ONLY. They have full authority to override bookings.
`;

export interface AdminChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface ConflictInfo {
  hasConflict: boolean;
  conflictingBooking?: Reservation;
  message?: string;
}

type ToolCall = {
  name: string;
  args?: Record<string, any>;
};

/**
 * Check if moving a reservation would cause a conflict
 */
async function checkMoveConflict(
  reservationId: string,
  newDate: string,
  newTimeStart: string,
  newTimeEnd: string,
  newCourtId: string
): Promise<ConflictInfo> {
  const allReservations = await getAllReservations();
  
  const conflict = allReservations.find((res) => {
    // Skip the reservation we're moving
    if (res.id === reservationId) return false;
    // Skip cancelled
    if (res.status === "cancelled") return false;
    // Check same date and court
    if (res.date !== newDate || res.courtId !== newCourtId) return false;
    // Check time overlap
    return res.timeSlot.start === newTimeStart;
  });

  if (conflict) {
    const memberInfo = conflict.member
      ? `${conflict.member.firstName} ${conflict.member.lastName}`
      : conflict.guestName || conflict.customerName || "Unknown";
      
    return {
      hasConflict: true,
      conflictingBooking: conflict,
      message: `⚠️ CONFLICT: Court ${conflict.courtName} is already booked on ${conflict.date} at ${conflict.timeSlot.start}-${conflict.timeSlot.end} by ${memberInfo}. Booking ID: ${conflict.id}`,
    };
  }

  return { hasConflict: false };
}

/**
 * Admin AI Agent with booking management tools
 */
export async function chatWithAdminAgent(
  message: string,
  conversationHistory: AdminChatMessage[] = [],
  adminMemberId?: string
): Promise<{
  response: string;
  needsConfirmation?: boolean;
  conflictInfo?: ConflictInfo;
}> {
  try {
    const modelName = process.env.GOOGLE_GENAI_MODEL || "gemini-3-flash-preview";

    const tools = [
      {
        functionDeclarations: [
          {
            name: "searchReservations",
            description: "Search for reservations by date, court, member name, or booking ID",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                date: {
                  type: SchemaType.STRING,
                  description: "Date to search (YYYY-MM-DD format). Optional.",
                },
                courtId: {
                  type: SchemaType.STRING,
                  description: "Court ID to filter by. Optional.",
                },
                searchTerm: {
                  type: SchemaType.STRING,
                  description: "Search term for member name or booking ID. Optional.",
                },
              },
            },
          },
          {
            name: "getReservationDetails",
            description: "Get full details of a specific reservation by ID",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                reservationId: {
                  type: SchemaType.STRING,
                  description: "The reservation ID to retrieve",
                },
              },
              required: ["reservationId"],
            },
          },
          {
            name: "checkAvailability",
            description: "Check court availability for a specific date",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                date: {
                  type: SchemaType.STRING,
                  description: "Date to check availability (YYYY-MM-DD)",
                },
                courtId: {
                  type: SchemaType.STRING,
                  description: "Optional: specific court ID to check",
                },
              },
              required: ["date"],
            },
          },
          {
            name: "moveReservation",
            description: "Move/reschedule a reservation to a new date, time, or court. ALWAYS check for conflicts first.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                reservationId: {
                  type: SchemaType.STRING,
                  description: "The ID of the reservation to move",
                },
                newDate: {
                  type: SchemaType.STRING,
                  description: "New date (YYYY-MM-DD format). Optional if not changing date.",
                },
                newTimeStart: {
                  type: SchemaType.STRING,
                  description: "New start time (HH:mm format). Optional if not changing time.",
                },
                newTimeEnd: {
                  type: SchemaType.STRING,
                  description: "New end time (HH:mm format). Optional if not changing time.",
                },
                newCourtId: {
                  type: SchemaType.STRING,
                  description: "New court ID. Optional if not changing court.",
                },
                notes: {
                  type: SchemaType.STRING,
                  description: "Optional notes about the change",
                },
              },
              required: ["reservationId"],
            },
          },
          {
            name: "cancelReservation",
            description: "Cancel a reservation permanently",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                reservationId: {
                  type: SchemaType.STRING,
                  description: "The ID of the reservation to cancel",
                },
                reason: {
                  type: SchemaType.STRING,
                  description: "Optional reason for cancellation",
                },
              },
              required: ["reservationId"],
            },
          },
          {
            name: "overrideConflictAndMove",
            description: "Move a reservation even if there's a conflict (admin override). This will CANCEL the conflicting booking.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                reservationId: {
                  type: SchemaType.STRING,
                  description: "The ID of the reservation to move",
                },
                conflictingReservationId: {
                  type: SchemaType.STRING,
                  description: "The ID of the conflicting reservation to cancel",
                },
                newDate: {
                  type: SchemaType.STRING,
                  description: "New date (YYYY-MM-DD)",
                },
                newTimeStart: {
                  type: SchemaType.STRING,
                  description: "New start time (HH:mm)",
                },
                newTimeEnd: {
                  type: SchemaType.STRING,
                  description: "New end time (HH:mm)",
                },
                newCourtId: {
                  type: SchemaType.STRING,
                  description: "New court ID",
                },
              },
              required: [
                "reservationId",
                "conflictingReservationId",
                "newDate",
                "newTimeStart",
                "newTimeEnd",
                "newCourtId",
              ],
            },
          },
          {
            name: "listAllCourts",
            description: "Get a list of all available courts",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {},
            },
          },
        ],
      },
    ] as any;

    const model = genAI.getGenerativeModel({
      model: modelName,
      tools,
    });

    // Filter and format history
    let filteredHistory = conversationHistory.slice(-15); // Keep more context for admin
    if (filteredHistory.length > 0 && filteredHistory[0].role === "assistant") {
      filteredHistory = filteredHistory.slice(1);
    }

    const history = filteredHistory.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const historyWithContext = [
      {
        role: "user",
        parts: [{ text: ADMIN_BOOKING_CONTEXT }],
      },
      ...history,
    ];

    const chat = model.startChat({
      history: historyWithContext,
      toolConfig: {
        functionCallingConfig: { mode: "AUTO" },
      } as any,
    });

    // Tool handler
    const handleFunctionCall = async (call: ToolCall) => {
      let args: Record<string, any> = {};
      if (typeof call.args === "string") {
        try {
          args = JSON.parse(call.args);
        } catch {
          args = {};
        }
      } else if (call.args) {
        args = call.args;
      }

      console.log(`[Admin AI] Tool called: ${call.name}`, args);

      // SEARCH RESERVATIONS
      if (call.name === "searchReservations") {
        const date = args.date ? String(args.date) : undefined;
        const courtId = args.courtId ? String(args.courtId) : undefined;
        const searchTerm = args.searchTerm ? String(args.searchTerm).toLowerCase() : undefined;

        let reservations = date
          ? await getReservationsByDate(date)
          : await getAllReservations();

        // Filter by court
        if (courtId) {
          reservations = reservations.filter((r) => r.courtId === courtId);
        }

        // Filter by search term
        if (searchTerm) {
          reservations = reservations.filter((r) => {
            const memberName = r.member
              ? `${r.member.firstName} ${r.member.lastName}`.toLowerCase()
              : "";
            const guestName = (r.guestName || r.customerName || "").toLowerCase();
            const bookingId = r.id.toLowerCase();
            
            return (
              memberName.includes(searchTerm) ||
              guestName.includes(searchTerm) ||
              bookingId.includes(searchTerm)
            );
          });
        }

        // Filter confirmed only
        reservations = reservations.filter((r) => r.status === "confirmed");

        return {
          success: true,
          count: reservations.length,
          reservations: reservations.map((r) => ({
            id: r.id,
            court: r.courtName,
            courtId: r.courtId,
            date: r.date,
            time: `${r.timeSlot.start} - ${r.timeSlot.end}`,
            timeStart: r.timeSlot.start,
            timeEnd: r.timeSlot.end,
            member: r.member
              ? `${r.member.firstName} ${r.member.lastName} (${r.member.email})`
              : null,
            guest: r.guestName || r.customerName || null,
            email: r.member?.email || r.guestEmail || r.customerEmail || null,
            status: r.status,
            notes: r.notes || null,
          })),
        };
      }

      // GET RESERVATION DETAILS
      if (call.name === "getReservationDetails") {
        const reservationId = String(args.reservationId || "");
        const reservation = await reservationRepository.getById(reservationId);

        if (!reservation) {
          return { success: false, error: "Reservation not found" };
        }

        return {
          success: true,
          reservation: {
            id: reservation.id,
            court: reservation.courtName,
            courtId: reservation.courtId,
            date: reservation.date,
            timeStart: reservation.timeSlot.start,
            timeEnd: reservation.timeSlot.end,
            member: reservation.member
              ? `${reservation.member.firstName} ${reservation.member.lastName}`
              : null,
            guest: reservation.guestName || reservation.customerName || null,
            email: reservation.member?.email || reservation.guestEmail || reservation.customerEmail,
            phone: reservation.member?.phone || reservation.guestPhone || reservation.customerPhone,
            status: reservation.status,
            notes: reservation.notes || null,
            paymentStatus: reservation.paymentStatus || null,
            createdAt: reservation.createdAt,
          },
        };
      }

      // CHECK AVAILABILITY
      if (call.name === "checkAvailability") {
        const date = String(args.date || "");
        const courtId = args.courtId ? String(args.courtId) : undefined;
        
        const availability = await getAvailabilityByDate(date);
        const filtered = courtId
          ? availability.filter((court) => court.courtId === courtId)
          : availability;

        const availableSlots = filtered.flatMap((court) =>
          court.slots
            .filter((slot) => slot.available)
            .map((slot) => ({
              courtId: court.courtId,
              courtName: court.courtName,
              timeStart: slot.start,
              timeEnd: slot.end,
            }))
        );

        return { success: true, date, availableSlots };
      }

      // MOVE RESERVATION
      if (call.name === "moveReservation") {
        const reservationId = String(args.reservationId || "");
        const reservation = await reservationRepository.getById(reservationId);

        if (!reservation) {
          return { success: false, error: "Reservation not found" };
        }

        const newDate = args.newDate ? String(args.newDate) : reservation.date;
        const newTimeStart = args.newTimeStart ? String(args.newTimeStart) : reservation.timeSlot.start;
        const newTimeEnd = args.newTimeEnd ? String(args.newTimeEnd) : reservation.timeSlot.end;
        const newCourtId = args.newCourtId ? String(args.newCourtId) : reservation.courtId;
        const notes = args.notes ? String(args.notes) : reservation.notes;

        // Check for conflicts
        const conflictCheck = await checkMoveConflict(
          reservationId,
          newDate,
          newTimeStart,
          newTimeEnd,
          newCourtId
        );

        if (conflictCheck.hasConflict) {
          return {
            success: false,
            conflict: true,
            conflictMessage: conflictCheck.message,
            conflictingBooking: conflictCheck.conflictingBooking,
            pendingChange: {
              reservationId,
              from: {
                court: reservation.courtName,
                date: reservation.date,
                time: `${reservation.timeSlot.start}-${reservation.timeSlot.end}`,
              },
              to: {
                courtId: newCourtId,
                date: newDate,
                timeStart: newTimeStart,
                timeEnd: newTimeEnd,
              },
            },
          };
        }

        // No conflict, proceed with move
        const court = await getCourt(newCourtId);
        if (!court) {
          return { success: false, error: "Court not found" };
        }

        const updated = await reservationRepository.update(reservationId, {
          date: newDate,
          courtId: newCourtId,
          courtName: court.name,
          timeSlot: { start: newTimeStart, end: newTimeEnd },
          notes,
        });

        return {
          success: true,
          moved: true,
          reservation: {
            id: updated.id,
            from: {
              court: reservation.courtName,
              date: reservation.date,
              time: `${reservation.timeSlot.start}-${reservation.timeSlot.end}`,
            },
            to: {
              court: updated.courtName,
              date: updated.date,
              time: `${updated.timeSlot.start}-${updated.timeSlot.end}`,
            },
          },
        };
      }

      // CANCEL RESERVATION
      if (call.name === "cancelReservation") {
        const reservationId = String(args.reservationId || "");
        const reservation = await reservationRepository.getById(reservationId);

        if (!reservation) {
          return { success: false, error: "Reservation not found" };
        }

        await reservationRepository.update(reservationId, { status: "cancelled" });

        return {
          success: true,
          cancelled: true,
          reservation: {
            id: reservation.id,
            court: reservation.courtName,
            date: reservation.date,
            time: `${reservation.timeSlot.start}-${reservation.timeSlot.end}`,
            member: reservation.member
              ? `${reservation.member.firstName} ${reservation.member.lastName}`
              : reservation.guestName || reservation.customerName,
          },
        };
      }

      // OVERRIDE CONFLICT AND MOVE
      if (call.name === "overrideConflictAndMove") {
        const reservationId = String(args.reservationId || "");
        const conflictingId = String(args.conflictingReservationId || "");
        const newDate = String(args.newDate || "");
        const newTimeStart = String(args.newTimeStart || "");
        const newTimeEnd = String(args.newTimeEnd || "");
        const newCourtId = String(args.newCourtId || "");

        // Get both reservations
        const reservation = await reservationRepository.getById(reservationId);
        const conflicting = await reservationRepository.getById(conflictingId);

        if (!reservation || !conflicting) {
          return { success: false, error: "One or both reservations not found" };
        }

        // Cancel the conflicting reservation
        await reservationRepository.update(conflictingId, { status: "cancelled" });

        // Move the target reservation
        const court = await getCourt(newCourtId);
        if (!court) {
          return { success: false, error: "Court not found" };
        }

        const updated = await reservationRepository.update(reservationId, {
          date: newDate,
          courtId: newCourtId,
          courtName: court.name,
          timeSlot: { start: newTimeStart, end: newTimeEnd },
          notes: reservation.notes + " [Admin override]",
        });

        return {
          success: true,
          override: true,
          cancelled: {
            id: conflicting.id,
            member: conflicting.member
              ? `${conflicting.member.firstName} ${conflicting.member.lastName}`
              : conflicting.guestName || conflicting.customerName,
            court: conflicting.courtName,
            date: conflicting.date,
            time: `${conflicting.timeSlot.start}-${conflicting.timeSlot.end}`,
          },
          moved: {
            id: updated.id,
            court: updated.courtName,
            date: updated.date,
            time: `${updated.timeSlot.start}-${updated.timeSlot.end}`,
          },
        };
      }

      // LIST ALL COURTS
      if (call.name === "listAllCourts") {
        const courts = await getAllCourts();
        return {
          success: true,
          courts: courts.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            available: c.available,
          })),
        };
      }

      return { success: false, error: "Unknown function call" };
    };

    // Extract function calls from response
    const extractFunctionCalls = (response: any): ToolCall[] => {
      if (typeof response.functionCalls === "function") {
        return response.functionCalls() || [];
      }

      const parts = response.candidates?.[0]?.content?.parts || [];
      return parts
        .filter((part: any) => part.functionCall)
        .map((part: any) => part.functionCall);
    };

    // Send message and handle tool calls
    let result = await chat.sendMessage(message);
    let response = await result.response;

    let toolCalls = extractFunctionCalls(response);
    let conflictDetected: ConflictInfo | undefined;

    while (toolCalls.length > 0) {
      for (const call of toolCalls) {
        const toolResult = await handleFunctionCall(call);
        
        // Check if we hit a conflict
        if (toolResult.conflict) {
          conflictDetected = {
            hasConflict: true,
            conflictingBooking: toolResult.conflictingBooking,
            message: toolResult.conflictMessage,
          };
        }

        result = await chat.sendMessage([
          {
            functionResponse: {
              name: call.name,
              response: toolResult,
            },
          },
        ]);
        response = await result.response;
      }

      toolCalls = extractFunctionCalls(response);
    }

    return {
      response: response.text(),
      needsConfirmation: conflictDetected?.hasConflict || false,
      conflictInfo: conflictDetected,
    };
  } catch (error: any) {
    console.error("Error in admin AI agent:", error);
    throw new Error(error.message || "Failed to get response from admin AI agent");
  }
}
