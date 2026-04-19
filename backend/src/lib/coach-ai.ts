import { Type } from "@google/genai";
import { getJournalEntries } from "./journal";
import {
  createTrainingPlan,
  getLatestTrainingPlan,
} from "./repositories/file-training-plan-repository";
import { getMember } from "./members";
import { ValidationError } from "./errors/reservation-errors";
import { chatWithOrchestrator } from "./orchestrator-agent";
import { geminiClient } from "./gemini-client";

const coachAiModelName = process.env.GOOGLE_GENAI_MODEL || "gemini-3-flash-preview";
const academyTimeZone = "America/New_York";
const trainingPlanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    focusAreas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    areasForImprovement: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    recommendations: {
      type: Type.STRING,
    },
    suggestedDrills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    weeklyGoals: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    sourceSessionCount: {
      type: Type.INTEGER,
    },
  },
  required: [
    "focusAreas",
    "strengths",
    "areasForImprovement",
    "recommendations",
    "suggestedDrills",
    "weeklyGoals",
    "sourceSessionCount",
  ],
} as const;

function topEntries(entries: string[], limit = 3): string[] {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    counts.set(entry, (counts.get(entry) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

function drillSuggestions(area: string): string[] {
  const normalized = area.toLowerCase();

  if (normalized.includes("serve")) {
    return ["Target serve reps", "Serve + first ball pattern", "Toss consistency drill"];
  }
  if (normalized.includes("backhand")) {
    return ["Cross-court backhand rally", "Backhand contact-point feed", "Backhand depth targets"];
  }
  if (normalized.includes("forehand")) {
    return ["Inside-out forehand pattern", "Forehand depth ladder", "Live-ball forehand consistency"];
  }
  if (normalized.includes("volley") || normalized.includes("net")) {
    return ["Reflex volley exchange", "Approach + first volley", "Transition footwork drill"];
  }
  if (normalized.includes("footwork")) {
    return ["Split-step reaction drill", "Recovery movement patterns", "Open-stance balance reps"];
  }
  if (normalized.includes("mental") || normalized.includes("strategy")) {
    return ["Point construction games", "Serve-return pattern planning", "Pressure scoreboard sets"];
  }

  return ["Consistency rally drill", "Pattern repetition set", "Constraint-based live-ball game"];
}

function hasGenerativeModelConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

function stripMarkdownCodeFence(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  return trimmed;
}

function safeStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  return value
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0);
}

function getTodayContext() {
  const now = new Date();
  return {
    isoDate: now.toISOString().split("T")[0],
    displayDate: new Intl.DateTimeFormat("en-US", {
      timeZone: academyTimeZone,
      dateStyle: "long",
    }).format(now),
  };
}

function buildPlayerDataContext(player: Awaited<ReturnType<typeof getMember>>, journalEntries: Awaited<ReturnType<typeof getJournalEntries>>, latestPlan: Awaited<ReturnType<typeof getLatestTrainingPlan>>) {
  const recentEntries = [...journalEntries]
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
    .slice(0, 5)
    .map((entry) => ({
      date: entry.sessionDate,
      summary: entry.summary,
      areasWorkedOn: entry.areasWorkedOn,
      pointersForNextSession: entry.pointersForNextSession,
      playerReflection: entry.playerReflection || "",
    }));

  return {
    player: {
      id: player.id,
      fullName: `${player.firstName} ${player.lastName}`.trim(),
      email: player.email,
      ntrpRating: player.ntrpRating || "",
    },
    totalJournalEntries: journalEntries.length,
    recentJournalEntries: recentEntries,
    latestTrainingPlan: latestPlan
      ? {
          createdAt: latestPlan.createdAt,
          focusAreas: latestPlan.focusAreas,
          strengths: latestPlan.strengths,
          areasForImprovement: latestPlan.areasForImprovement,
          recommendations: latestPlan.recommendations,
          suggestedDrills: latestPlan.suggestedDrills,
          weeklyGoals: latestPlan.weeklyGoals,
        }
      : null,
  };
}

async function generateLlmTrainingPlanDraft(
  player: Awaited<ReturnType<typeof getMember>>,
  journalEntries: Awaited<ReturnType<typeof getJournalEntries>>,
  latestPlan: Awaited<ReturnType<typeof getLatestTrainingPlan>>
) {
  const today = getTodayContext();
  const prompt = `
You are Ace, an expert tennis coach helping another coach prepare a practical player development plan.

Today is ${today.displayDate} (${today.isoDate}).

Return ONLY valid JSON with this exact shape:
{
  "focusAreas": ["string"],
  "strengths": ["string"],
  "areasForImprovement": ["string"],
  "recommendations": "string",
  "suggestedDrills": ["string"],
  "weeklyGoals": ["string"],
  "sourceSessionCount": number
}

Rules:
- Use 2 to 4 focus areas.
- Recommendations must be concise, specific, and coach-facing.
- Suggested drills should be realistic tennis drills, not generic advice.
- Weekly goals should be measurable.
- The plan must be forward-looking from today's date, not written as if a past plan date is the current week.
- Treat any prior training plan dates in the context as historical reference only.
- Base the output on the player context below.

Player context:
${JSON.stringify(buildPlayerDataContext(player, journalEntries, latestPlan), null, 2)}
`;

  const response = await geminiClient.models.generateContent({
    model: coachAiModelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: trainingPlanResponseSchema,
    },
  });
  const text = stripMarkdownCodeFence(response.text || "");
  const parsed = JSON.parse(text);

  return {
    player: {
      id: player.id,
      fullName: `${player.firstName} ${player.lastName}`.trim(),
    },
    focusAreas: safeStringArray(parsed.focusAreas),
    strengths: safeStringArray(parsed.strengths),
    areasForImprovement: safeStringArray(parsed.areasForImprovement),
    recommendations: String(parsed.recommendations || "").trim(),
    suggestedDrills: safeStringArray(parsed.suggestedDrills),
    weeklyGoals: safeStringArray(parsed.weeklyGoals),
    sourceSessionCount: Number(parsed.sourceSessionCount || journalEntries.length),
  };
}

function buildFallbackCoachChatResponse(
  player: Awaited<ReturnType<typeof getMember>>,
  message: string,
  journalEntries: Awaited<ReturnType<typeof getJournalEntries>>,
  latestPlan: Awaited<ReturnType<typeof getLatestTrainingPlan>>
): string {
  const focusAreas = topEntries(journalEntries.flatMap((entry) => entry.areasWorkedOn), 3);
  const latestPointers = [...journalEntries]
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
    .slice(0, 2)
    .map((entry) => entry.pointersForNextSession)
    .filter(Boolean);

  return [
    `Selected player: ${player.firstName} ${player.lastName}.`,
    `I don't have the live LLM configured in this environment, so this is a fallback coaching response.`,
    focusAreas.length > 0 ? `Current focus areas from journal history: ${focusAreas.join(", ")}.` : "There is no journal history yet for this player.",
    latestPlan ? `Latest saved plan focus: ${latestPlan.focusAreas.join(", ")}.` : "There is no saved training plan yet.",
    latestPointers.length > 0 ? `Recent coach pointers: ${latestPointers.join(" ")}` : "",
    `Coach request noted: "${message}".`,
    `Suggested next move: ask for a revised plan draft after adding any missing journal detail you want reflected.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function generateCoachPlayerSummary(playerId: string) {
  const player = await getMember(playerId);
  const journalEntries = await getJournalEntries({ playerId });
  const latestPlan = await getLatestTrainingPlan(playerId);
  const sortedEntries = [...journalEntries].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
  const recentEntries = sortedEntries.slice(0, 3);
  const focusAreas = topEntries(journalEntries.flatMap((entry) => entry.areasWorkedOn), 5);

  return {
    player: {
      id: player.id,
      fullName: `${player.firstName} ${player.lastName}`.trim(),
      email: player.email,
      ntrpRating: player.ntrpRating,
    },
    totalSessions: journalEntries.length,
    recentFocusAreas: focusAreas,
    latestSession: recentEntries[0]
      ? {
          date: recentEntries[0].sessionDate,
          summary: recentEntries[0].summary,
          nextFocus: recentEntries[0].pointersForNextSession,
        }
      : null,
    recentNotes: recentEntries.map((entry) => ({
      date: entry.sessionDate,
      summary: entry.summary,
      areasWorkedOn: entry.areasWorkedOn,
    })),
    latestTrainingPlan: latestPlan
      ? {
          createdAt: latestPlan.createdAt,
          focusAreas: latestPlan.focusAreas,
          weeklyGoals: latestPlan.weeklyGoals,
          recommendations: latestPlan.recommendations,
        }
      : null,
    coachTakeaway:
      recentEntries[0]?.pointersForNextSession ||
      latestPlan?.recommendations ||
      "Not enough recent training data to generate a coaching takeaway yet.",
  };
}

export async function generateCoachTrainingPlanDraft(playerId: string) {
  const player = await getMember(playerId);
  const journalEntries = await getJournalEntries({ playerId });
  const latestPlan = await getLatestTrainingPlan(playerId);

  if (journalEntries.length === 0) {
    throw new ValidationError("Player has no journal entries yet. Create at least one journal entry first.");
  }

  if (hasGenerativeModelConfigured()) {
    try {
      return await generateLlmTrainingPlanDraft(player, journalEntries, latestPlan);
    } catch (error) {
      console.error("Falling back to rule-based training plan draft:", error);
    }
  }

  const focusAreas = topEntries(journalEntries.flatMap((entry) => entry.areasWorkedOn), 3);
  const recentPointers = journalEntries
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
    .slice(0, 3)
    .map((entry) => entry.pointersForNextSession);

  const suggestedDrills = focusAreas.flatMap((area) => drillSuggestions(area)).slice(0, 6);

  return {
    player: {
      id: player.id,
      fullName: `${player.firstName} ${player.lastName}`.trim(),
    },
    focusAreas,
    strengths: [`Consistent engagement in ${focusAreas[0] || "training"}`, "Documented session history"],
    areasForImprovement: focusAreas,
    recommendations: recentPointers.join(" "),
    suggestedDrills,
    weeklyGoals: focusAreas.map((area) => `Complete two focused sessions on ${area.toLowerCase()}.`),
    sourceSessionCount: journalEntries.length,
  };
}

export async function generateCoachSessionPrep(playerId: string) {
  const player = await getMember(playerId);
  const journalEntries = await getJournalEntries({ playerId });
  const latestPlan = await getLatestTrainingPlan(playerId);

  if (journalEntries.length === 0) {
    throw new ValidationError("Player has no journal entries yet. Create at least one journal entry first.");
  }

  const recentEntries = journalEntries
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
    .slice(0, 3);
  const focusAreas = topEntries(recentEntries.flatMap((entry) => entry.areasWorkedOn), 3);
  const agenda = focusAreas.map((area, index) => ({
    block: index + 1,
    focus: area,
    drill: drillSuggestions(area)[0],
  }));

  return {
    player: {
      id: player.id,
      fullName: `${player.firstName} ${player.lastName}`.trim(),
    },
    recentSessionSummaries: recentEntries.map((entry) => ({
      date: entry.sessionDate,
      summary: entry.summary,
    })),
    focusAreas,
    agenda,
    reminders: recentEntries.map((entry) => entry.pointersForNextSession),
    latestPlanGoals: latestPlan?.weeklyGoals || [],
  };
}

export async function saveCoachTrainingPlanDraft(playerId: string, createdBy: string) {
  const draft = await generateCoachTrainingPlanDraft(playerId);

  return createTrainingPlan({
    playerId,
    focusAreas: draft.focusAreas,
    strengths: draft.strengths,
    areasForImprovement: draft.areasForImprovement,
    recommendations: draft.recommendations,
    suggestedDrills: draft.suggestedDrills,
    weeklyGoals: draft.weeklyGoals,
    progressNotes: `Coach AI draft generated from ${draft.sourceSessionCount} journal entries.`,
    createdBy,
  });
}

export async function chatWithCoachAssistant(options: {
  playerId: string;
  message: string;
  conversationHistory: Array<{ role: string; content: string }>;
  userId: string;
  userRole: string;
  userName: string;
}) {
  const { playerId, message, conversationHistory, userId, userRole, userName } = options;
  const player = await getMember(playerId);
  const journalEntries = await getJournalEntries({ playerId });
  const latestPlan = await getLatestTrainingPlan(playerId);
  const today = getTodayContext();

  if (!hasGenerativeModelConfigured()) {
    return {
      response: buildFallbackCoachChatResponse(player, message, journalEntries, latestPlan),
    };
  }

  const contextualMessage = `
Selected player context for this coach workspace:
- Today is ${today.displayDate} (${today.isoDate}).
- Player name: ${player.firstName} ${player.lastName}
- Player ID: ${player.id}
- Treat this as the default player for this conversation unless the coach explicitly switches players.
- The coach is asking from /dashboard/coach-ai and wants practical plan adjustments, coaching advice, and optional training-plan updates.
- Do not create or log a new training plan unless the coach explicitly asks you to create or save one.
- Any prior plan dates or journal dates are historical context only.
- All recommendations should be framed from today's date forward, for the upcoming week or next session.
- Do not present an old plan creation date as if it were the current coaching week.

Player data snapshot:
${JSON.stringify(buildPlayerDataContext(player, journalEntries, latestPlan), null, 2)}

Coach request:
${message}
`;

  return chatWithOrchestrator({
    message: contextualMessage,
    conversationHistory,
    userId,
    userRole,
    userName,
  });
}
