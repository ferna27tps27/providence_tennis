import { FunctionCallingConfigMode, Type } from "@google/genai";
import {
  createReservation,
  getAvailabilityByDate,
  getCourt,
} from "./reservations";
import {
  buildGeminiHistory,
  getResponseText,
  normalizeToolArgs,
  runGeminiFunctionCallingLoop,
} from "./gemini-client";

export type PublicAiChatContext = {
  requestId?: string;
};

const TENNIS_CONTEXT = `
You are a helpful AI assistant for Providence Tennis Academy, located at 1000 Elmwood Avenue, Providence, RI, USA. Phone: 401-935-4336.

Key Information:
- We have 10 outdoor Har-Tru clay courts
- Seasonal indoor hard courts
- Full pro shop for equipment and repairs
- PlaySight live streaming on all 10 outdoor courts
- WIFI throughout facilities
- Electric Line Calling System coming March 2026
- Operating hours: 8:00 AM - 9:00 PM

Programs Offered:
- Junior Tennis Programs (all skill levels)
- Adult Tennis Programs
- Private Lessons
- Group Lessons
- Clinics
- Tennis Camps
- Summer Camps
- Tournaments

Services:
- Court reservations available online
- Equipment sales and repairs
- Professional coaching staff with 50+ years combined experience
- Established since 2008

When answering questions:
1. Be friendly, professional, and helpful - provide direct, efficient answers (Gemini 3 prefers concise responses)
2. For booking questions, use the booking tools to check availability and create reservations
3. For tennis-related questions, provide accurate information using your knowledge (knowledge cutoff: January 2025)
4. Use Google Search when you need current information about tennis rules, techniques, recent events, or general tennis knowledge beyond your training data
5. Always cite sources when using web search results
6. For facility-specific questions, use the context provided above

Booking guidelines:
- Collect required details: date (YYYY-MM-DD), time slot (start/end), court ID, full name, email, phone
- If details are missing, ask concise follow-up questions
- Confirm the booking once the reservation is created

Remember: Be concise and direct. If a longer explanation is needed, users will ask for more detail.
`;

type ToolCall = {
  name: string;
  args?: Record<string, any>;
};

type ParsedBooking = {
  courtId: string;
  date: string;
  timeSlotStart: string;
  timeSlotEnd: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

function logPublicAiEvent(event: string, data: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      scope: "public_ai_agent",
      event,
      timestamp: new Date().toISOString(),
      ...data,
    })
  );
}

function parseBookingDetails(message: string): ParsedBooking | null {
  const courtMatch = message.match(/court\s*(\d+)/i);
  const dateMatch = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const timeMatch = message.match(
    /\bfrom\s+(\d{1,2}:\d{2})\s*(?:-|to)\s*(\d{1,2}:\d{2})\b/i
  );
  const nameMatch = message.match(/\bname:\s*([^\n,]+)/i);
  const emailMatch = message.match(/\b([^\s@]+@[^\s@]+\.[^\s@]+)\b/);
  const phoneMatch = message.match(/\bphone:\s*([^\n,]+)/i);

  if (
    !courtMatch ||
    !dateMatch ||
    !timeMatch ||
    !nameMatch ||
    !emailMatch ||
    !phoneMatch
  ) {
    return null;
  }

  const normalizedPhone = phoneMatch[1]
    .trim()
    .replace(/[^+\d()\s-]/g, "")
    .trim();

  return {
    courtId: courtMatch[1],
    date: dateMatch[1],
    timeSlotStart: timeMatch[1],
    timeSlotEnd: timeMatch[2],
    customerName: nameMatch[1].trim(),
    customerEmail: emailMatch[1],
    customerPhone: normalizedPhone,
  };
}

export async function chatWithAgent(
  message: string,
  conversationHistory: ChatMessage[] = [],
  context: PublicAiChatContext = {}
): Promise<{ response: string; sources?: Array<{ title: string; url: string }> }> {
  try {
    const modelName = process.env.GOOGLE_GENAI_MODEL;
    if (!modelName) {
      throw new Error("GOOGLE_GENAI_MODEL is not set in environment");
    }

    logPublicAiEvent("chat_started", {
      requestId: context.requestId,
      modelName,
      messageLength: message.length,
      historyCount: conversationHistory.length,
      apiKeyConfigured: Boolean(
        process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      ),
    });

    const parsedBooking = parseBookingDetails(message);
    if (parsedBooking) {
      logPublicAiEvent("booking_detected", {
        requestId: context.requestId,
        courtId: parsedBooking.courtId,
        date: parsedBooking.date,
      });

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(parsedBooking.customerEmail)) {
        return { response: "Please provide a valid email address." };
      }

      const court = await getCourt(parsedBooking.courtId);
      if (!court) {
        return { response: "That court was not found. Please choose another." };
      }

      try {
        const reservation = await createReservation({
          courtId: parsedBooking.courtId,
          date: parsedBooking.date,
          timeSlot: {
            start: parsedBooking.timeSlotStart,
            end: parsedBooking.timeSlotEnd,
          },
          customerName: parsedBooking.customerName,
          customerEmail: parsedBooking.customerEmail,
          customerPhone: parsedBooking.customerPhone,
        });

        return {
          response: `Confirmed! Your reservation for ${reservation.courtName} on ${reservation.date} from ${reservation.timeSlot.start} to ${reservation.timeSlot.end} is booked. A confirmation will be sent to ${reservation.customerEmail}.`,
        };
      } catch (error: any) {
        logPublicAiEvent("booking_failed", {
          requestId: context.requestId,
          errorName: error?.name || "Error",
          errorMessage: error?.message || "Unknown booking error",
        });

        return {
          response:
            error.message ||
            "Sorry, I couldn't complete that booking. Please try another time.",
        };
      }
    }

    const tools = [
      {
        functionDeclarations: [
          {
            name: "getCourtAvailability",
            description: "Get available court time slots for a specific date.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                date: {
                  type: Type.STRING,
                  description: "Date in YYYY-MM-DD format",
                },
                courtId: {
                  type: Type.STRING,
                  description: "Optional court ID to filter availability",
                },
              },
              required: ["date"],
            },
          },
          {
            name: "createCourtReservation",
            description: "Create a court reservation in the booking backend.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                courtId: {
                  type: Type.STRING,
                  description: "Court ID to reserve",
                },
                date: {
                  type: Type.STRING,
                  description: "Date in YYYY-MM-DD format",
                },
                timeSlotStart: {
                  type: Type.STRING,
                  description: "Start time in HH:mm format",
                },
                timeSlotEnd: {
                  type: Type.STRING,
                  description: "End time in HH:mm format",
                },
                customerName: {
                  type: Type.STRING,
                  description: "Customer full name",
                },
                customerEmail: {
                  type: Type.STRING,
                  description: "Customer email address",
                },
                customerPhone: {
                  type: Type.STRING,
                  description: "Customer phone number",
                },
                notes: {
                  type: Type.STRING,
                  description: "Optional booking notes",
                },
              },
              required: [
                "courtId",
                "date",
                "timeSlotStart",
                "timeSlotEnd",
                "customerName",
                "customerEmail",
                "customerPhone",
              ],
            },
          },
        ],
      },
    ] as any;

    let filteredHistory = conversationHistory.slice(-10);
    if (filteredHistory.length > 0 && filteredHistory[0].role === "assistant") {
      filteredHistory = filteredHistory.slice(1);
    }

    const handleFunctionCall = async (call: ToolCall) => {
      const args = normalizeToolArgs(call.args);

      logPublicAiEvent("tool_call_started", {
        requestId: context.requestId,
        toolName: call.name,
      });

      if (call.name === "getCourtAvailability") {
        const date = String(args.date || "");
        const courtId = args.courtId ? String(args.courtId) : undefined;
        const availability = (await getAvailabilityByDate(date)) as Array<{
          courtId: string;
          courtName: string;
          slots: Array<{ start: string; end: string; available: boolean }>;
        }>;
        const filtered = courtId
          ? availability.filter((court) => court.courtId === courtId)
          : availability;

        const availableSlots = filtered.flatMap((court) =>
          court.slots
            .filter((slot) => slot.available)
            .map((slot) => ({
              courtId: court.courtId,
              courtName: court.courtName,
              timeSlot: { start: slot.start, end: slot.end },
            }))
        );

        return { date, availableSlots };
      }

      if (call.name === "createCourtReservation") {
        const courtId = String(args.courtId || "");
        const date = String(args.date || "");
        const timeSlotStart = String(args.timeSlotStart || "");
        const timeSlotEnd = String(args.timeSlotEnd || "");
        const customerName = String(args.customerName || "");
        const customerEmail = String(args.customerEmail || "");
        const customerPhone = String(args.customerPhone || "");
        const notes = args.notes ? String(args.notes) : undefined;

        if (
          !courtId ||
          !date ||
          !timeSlotStart ||
          !timeSlotEnd ||
          !customerName ||
          !customerEmail ||
          !customerPhone
        ) {
          return { success: false, error: "Missing required booking fields" };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerEmail)) {
          return { success: false, error: "Invalid email format" };
        }

        const court = await getCourt(courtId);
        if (!court) {
          return { success: false, error: "Court not found" };
        }

        try {
          const reservation = await createReservation({
            courtId,
            date,
            timeSlot: { start: timeSlotStart, end: timeSlotEnd },
            customerName,
            customerEmail,
            customerPhone,
            notes,
          });

          logPublicAiEvent("tool_call_completed", {
            requestId: context.requestId,
            toolName: call.name,
            success: true,
          });

          return { success: true, reservation };
        } catch (error: any) {
          logPublicAiEvent("tool_call_failed", {
            requestId: context.requestId,
            toolName: call.name,
            errorName: error?.name || "Error",
            errorMessage: error?.message || "Failed to create reservation",
          });

          return {
            success: false,
            error: error.message || "Failed to create reservation",
          };
        }
      }

      return { success: false, error: "Unknown function call" };
    };
    const contents = [
      ...buildGeminiHistory(filteredHistory, TENNIS_CONTEXT),
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    const { response } = await runGeminiFunctionCallingLoop({
      model: modelName,
      contents,
      tools,
      config: {
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.AUTO,
          },
        },
      },
      handleToolCall: handleFunctionCall,
    });

    const sources: Array<{ title: string; url: string }> = [];
    try {
      const candidate = response.candidates?.[0] as any;
      const chunks =
        candidate?.groundingMetadata?.groundingChunks ||
        candidate?.groundingMetadata?.groundingChuncks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri) {
            sources.push({
              title: chunk.web.title || chunk.web.uri || "Source",
              url: chunk.web.uri,
            });
          }
        });
      }
    } catch (sourceError) {
      console.warn("Could not extract sources:", sourceError);
    }

    return {
      response: getResponseText(response),
      sources: sources.length > 0 ? sources : undefined,
    };
  } catch (error: any) {
    console.error(
      JSON.stringify({
        scope: "public_ai_agent",
        event: "chat_failed",
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
        errorName: error?.name || "Error",
        errorMessage: error?.message || "Failed to get response from AI agent",
        stack: error?.stack || null,
      })
    );

    throw new Error(
      error.message || "Failed to get response from AI agent"
    );
  }
}
