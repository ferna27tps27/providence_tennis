import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import {
  createReservation,
  getAvailabilityByDate,
  getCourt,
} from "./reservations";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

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
  conversationHistory: ChatMessage[] = []
): Promise<{ response: string; sources?: Array<{ title: string; url: string }> }> {
  try {
    const modelName = process.env.GOOGLE_GENAI_MODEL;
    if (!modelName) {
      throw new Error("GOOGLE_GENAI_MODEL is not set in environment");
    }

    const parsedBooking = parseBookingDetails(message);
    if (parsedBooking) {
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
          courtName: court.name,
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
              type: SchemaType.OBJECT,
              properties: {
                date: {
                  type: SchemaType.STRING,
                  description: "Date in YYYY-MM-DD format",
                },
                courtId: {
                  type: SchemaType.STRING,
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
              type: SchemaType.OBJECT,
              properties: {
                courtId: {
                  type: SchemaType.STRING,
                  description: "Court ID to reserve",
                },
                date: {
                  type: SchemaType.STRING,
                  description: "Date in YYYY-MM-DD format",
                },
                timeSlotStart: {
                  type: SchemaType.STRING,
                  description: "Start time in HH:mm format",
                },
                timeSlotEnd: {
                  type: SchemaType.STRING,
                  description: "End time in HH:mm format",
                },
                customerName: {
                  type: SchemaType.STRING,
                  description: "Customer full name",
                },
                customerEmail: {
                  type: SchemaType.STRING,
                  description: "Customer email address",
                },
                customerPhone: {
                  type: SchemaType.STRING,
                  description: "Customer phone number",
                },
                notes: {
                  type: SchemaType.STRING,
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

    const model = genAI.getGenerativeModel({
      model: modelName,
      tools,
    });

    let filteredHistory = conversationHistory.slice(-10);
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
        parts: [{ text: TENNIS_CONTEXT }],
      },
      ...history,
    ];

    const chat = model.startChat({
      history: historyWithContext,
      toolConfig: {
        functionCallingConfig: { mode: "AUTO" },
      } as any,
    });

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

      if (call.name === "getCourtAvailability") {
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
            courtName: court.name,
            date,
            timeSlot: { start: timeSlotStart, end: timeSlotEnd },
            customerName,
            customerEmail,
            customerPhone,
            notes,
          });
          return { success: true, reservation };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || "Failed to create reservation",
          };
        }
      }

      return { success: false, error: "Unknown function call" };
    };

    const extractFunctionCalls = (response: any): ToolCall[] => {
      if (typeof response.functionCalls === "function") {
        return response.functionCalls() || [];
      }

      const parts = response.candidates?.[0]?.content?.parts || [];
      return parts
        .filter((part: any) => part.functionCall)
        .map((part: any) => part.functionCall);
    };

    let result = await chat.sendMessage(message);
    let response = await result.response;

    let toolCalls = extractFunctionCalls(response);
    while (toolCalls.length > 0) {
      for (const call of toolCalls) {
        const toolResult = await handleFunctionCall(call);
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
      response: response.text(),
      sources: sources.length > 0 ? sources : undefined,
    };
  } catch (error: any) {
    console.error("Error in AI agent:", error);
    throw new Error(
      error.message || "Failed to get response from AI agent"
    );
  }
}
