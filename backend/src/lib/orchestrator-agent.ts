/**
 * Orchestrator AI Agent
 *
 * Unified AI agent that serves as the main conversational interface for
 * Providence Tennis Academy. It acts as an orchestrator that:
 *
 * 1. Provides personalized training recommendations based on journal data
 * 2. Creates training plans and logs them as journal entries
 * 3. Manages player creation (admin only)
 * 4. Searches for players by name (admin only)
 * 5. Adapts capabilities based on user role (admin/coach/player)
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { getJournalEntries } from "./journal";
import { journalRepository } from "./repositories/file-journal-repository";
import {
  getMember,
  searchMembers,
  createMember,
  listMembers,
} from "./members";
import { JournalAnalytics } from "../types/training-plan";
import {
  createTrainingPlan,
  getPlayerTrainingPlans,
} from "./repositories/file-training-plan-repository";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const modelName = process.env.GOOGLE_GENAI_MODEL || "gemini-3-flash-preview";

// ─── System Prompts ──────────────────────────────────────────────────

function getOrchestratorSystemPrompt(
  userRole: string,
  userName: string,
  userId: string
): string {
  const basePrompt = `
You are the AI Tennis Coach & Assistant for Providence Tennis Academy. Your name is "Ace" and you are here to help everyone at the academy improve their tennis game.

**Current User:** ${userName} (Role: ${userRole}, ID: ${userId})

## Your Core Capabilities:

### 1. Training Analysis & Recommendations
- Analyze player journal entries to identify patterns, strengths, and areas needing improvement
- Provide specific, actionable training advice based on data
- Track progress over time by comparing with previous training plans

### 2. Training Plan Creation
- Create personalized training plans with focus areas, drills, and weekly goals
- **IMPORTANT: Every training plan you create MUST be logged as a journal entry** using the createJournalEntryForPlan tool
- When creating a plan, follow this workflow:
  1. First, get the player's journal analytics
  2. Get their profile info
  3. Check their training history
  4. Create the training plan
  5. Log it as a journal entry automatically

### 3. Personalized Advice
- Use internet knowledge about tennis techniques, drills, and strategy
- Reference specific data from journal entries to support recommendations
- Focus on 2-3 key areas at a time (don't overwhelm)

## Your Approach:
- Be encouraging, positive, and data-driven
- Always reference journal data when available
- Provide specific drills and exercises with clear instructions
- Set measurable weekly goals
- Celebrate progress and acknowledge effort

## Conversation Style:
- Be conversational and friendly, like a supportive coach
- Use the player's name when talking about them
- Keep responses focused and actionable
- When asked "what should I work on?" or "create a plan", proactively gather data and create a full plan
- If there's no journal data for a player, let them know and offer general advice
`;

  const playerPrompt = `
## Player-Specific Instructions:
- You are helping ${userName} directly
- When they ask for a plan or advice, use THEIR player ID: ${userId}
- They can only see their own data
- Encourage them to add reflections to their journal entries
- Suggest they discuss your recommendations with their coach

## Quick Actions the player can ask:
- "What should I work on?" → Analyze their journals and give recommendations
- "Create a plan for me" → Full training plan workflow
- "How am I progressing?" → Compare recent vs earlier sessions
- "What did my coach say?" → Surface recent coach pointers
`;

  const adminPrompt = `
## Admin-Specific Instructions:
- You are helping admin ${userName}
- As an admin, you can manage ANY player at the academy
- You can create plans for any player: "Create a plan for [player name]"
- You can create new players: "Add a new player named [name]"
- You can search for players by name
- When the admin asks for a plan for another player, search for that player first

## Admin Quick Actions:
- "Create a plan for Jose" → Search for Jose, then create their plan
- "Add a new player named Maria Lopez" → Create a new player account
- "Show me all players" → List all players
- "How is [player name] doing?" → Get their analytics
- "Create a plan for me" → Use the admin's own ID: ${userId}

## Player Creation:
When creating a new player, you need at minimum: firstName, lastName, email, phone.
If the admin doesn't provide all details, ask for the missing ones.
After creating a player, confirm with the details.
`;

  const coachPrompt = `
## Coach-Specific Instructions:
- You are helping coach ${userName}
- You can view and create plans for your players
- You can search for players you coach
- When creating plans, they'll be logged under your coaching entries

## Coach Quick Actions:
- "Create a plan for [player name]" → Search for player, create their plan
- "How is [player name] doing?" → Get their analytics
- "What should [player name] work on?" → Recommendations for a specific player
- "Create a plan for me" → Use your own ID for your personal training: ${userId}
`;

  let rolePrompt = playerPrompt;
  if (userRole === "admin") {
    rolePrompt = adminPrompt;
  } else if (userRole === "coach") {
    rolePrompt = coachPrompt;
  }

  return basePrompt + rolePrompt;
}

// ─── Analytics Helper ────────────────────────────────────────────────

async function analyzePlayerJournals(
  playerId: string
): Promise<JournalAnalytics> {
  const journals = await getJournalEntries({ playerId });

  if (journals.length === 0) {
    return {
      totalSessions: 0,
      dateRange: { earliest: "", latest: "" },
      areasFrequency: {},
      areasPercentage: {},
      recentFocus: [],
      coachPointers: [],
      playerReflections: [],
      trends: { improving: [], needsWork: [] },
    };
  }

  const sortedJournals = journals.sort(
    (a, b) =>
      new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
  );

  const areasFrequency: Record<string, number> = {};
  let totalAreas = 0;

  journals.forEach((journal) => {
    journal.areasWorkedOn.forEach((area) => {
      areasFrequency[area] = (areasFrequency[area] || 0) + 1;
      totalAreas++;
    });
  });

  const areasPercentage: Record<string, number> = {};
  Object.keys(areasFrequency).forEach((area) => {
    areasPercentage[area] = (areasFrequency[area] / totalAreas) * 100;
  });

  const recentSessions = sortedJournals.slice(-3);
  const recentAreas = new Set<string>();
  recentSessions.forEach((journal) => {
    journal.areasWorkedOn.forEach((area) => recentAreas.add(area));
  });

  const coachPointers = journals
    .slice(-5)
    .map((j) => j.pointersForNextSession)
    .filter((p) => p && p.length > 0);

  const playerReflections = journals
    .filter((j) => j.playerReflection)
    .slice(-5)
    .map((j) => j.playerReflection!);

  const midpoint = Math.floor(journals.length / 2);
  const firstHalf = journals.slice(0, midpoint);
  const secondHalf = journals.slice(midpoint);

  const firstHalfAreas: Record<string, number> = {};
  const secondHalfAreas: Record<string, number> = {};

  firstHalf.forEach((j) =>
    j.areasWorkedOn.forEach((area) => {
      firstHalfAreas[area] = (firstHalfAreas[area] || 0) + 1;
    })
  );

  secondHalf.forEach((j) =>
    j.areasWorkedOn.forEach((area) => {
      secondHalfAreas[area] = (secondHalfAreas[area] || 0) + 1;
    })
  );

  const improving: string[] = [];
  const needsWork: string[] = [];

  Object.keys(areasFrequency).forEach((area) => {
    const firstCount = firstHalfAreas[area] || 0;
    const secondCount = secondHalfAreas[area] || 0;
    if (firstCount > secondCount && secondCount > 0) {
      improving.push(area);
    } else if (secondCount > firstCount) {
      needsWork.push(area);
    }
  });

  return {
    totalSessions: journals.length,
    dateRange: {
      earliest: sortedJournals[0].sessionDate,
      latest: sortedJournals[sortedJournals.length - 1].sessionDate,
    },
    areasFrequency,
    areasPercentage,
    recentFocus: Array.from(recentAreas),
    coachPointers,
    playerReflections,
    trends: { improving, needsWork },
  };
}

// ─── Tool Declarations ───────────────────────────────────────────────

/**
 * Training tools available to all authenticated users
 */
const trainingTools = [
  {
    name: "getPlayerJournalAnalytics",
    description:
      "Analyzes a player's journal entries to provide statistics about their training sessions, focus areas, and progress trends. Returns frequency of areas worked on, recent focus, coach feedback, and improvement trends.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        playerId: {
          type: SchemaType.STRING,
          description: "The ID of the player to analyze",
        },
      },
      required: ["playerId"],
    },
  },
  {
    name: "getPlayerProfile",
    description:
      "Gets basic profile information about a player including name, member number, rating, and join date.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        playerId: {
          type: SchemaType.STRING,
          description: "The ID of the player",
        },
      },
      required: ["playerId"],
    },
  },
  {
    name: "getPlayerTrainingHistory",
    description:
      "Retrieves all previous training plans created for the player to track progress over time and avoid repetition.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        playerId: {
          type: SchemaType.STRING,
          description: "The ID of the player",
        },
      },
      required: ["playerId"],
    },
  },
  {
    name: "createTrainingPlanForPlayer",
    description:
      "Creates a personalized training plan for a player. After calling this, you MUST also call createJournalEntryForPlan to log the plan as a journal entry.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        playerId: {
          type: SchemaType.STRING,
          description: "The ID of the player",
        },
        focusAreas: {
          type: SchemaType.ARRAY,
          description:
            "Main areas to focus on (e.g., ['backhand', 'serve', 'footwork'])",
          items: { type: SchemaType.STRING },
        },
        strengths: {
          type: SchemaType.ARRAY,
          description: "Player's current strengths",
          items: { type: SchemaType.STRING },
        },
        areasForImprovement: {
          type: SchemaType.ARRAY,
          description: "Specific areas that need work",
          items: { type: SchemaType.STRING },
        },
        recommendations: {
          type: SchemaType.STRING,
          description: "Detailed recommendations and strategy",
        },
        suggestedDrills: {
          type: SchemaType.ARRAY,
          description: "Specific drills to practice",
          items: { type: SchemaType.STRING },
        },
        weeklyGoals: {
          type: SchemaType.ARRAY,
          description: "Achievable weekly goals",
          items: { type: SchemaType.STRING },
        },
      },
      required: [
        "playerId",
        "focusAreas",
        "recommendations",
        "weeklyGoals",
      ],
    },
  },
  {
    name: "createJournalEntryForPlan",
    description:
      "Logs a training plan as a journal entry so it appears in the player's journal history. Call this AFTER creating a training plan. The summary should describe the plan, areasWorkedOn should list the focus areas, and pointersForNextSession should contain the key recommendations.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        playerId: {
          type: SchemaType.STRING,
          description: "The ID of the player the plan is for",
        },
        summary: {
          type: SchemaType.STRING,
          description:
            "A summary of the training plan (e.g., 'AI-Generated Training Plan: Focus on backhand and serve consistency')",
        },
        areasWorkedOn: {
          type: SchemaType.ARRAY,
          description: "The focus areas from the training plan",
          items: { type: SchemaType.STRING },
        },
        pointersForNextSession: {
          type: SchemaType.STRING,
          description:
            "Key recommendations and goals from the plan for the next sessions",
        },
        additionalNotes: {
          type: SchemaType.STRING,
          description:
            "Optional: Additional details about the plan, drills, or goals",
        },
      },
      required: [
        "playerId",
        "summary",
        "areasWorkedOn",
        "pointersForNextSession",
      ],
    },
  },
];

/**
 * Admin/Coach-only tools for player management
 */
const adminTools = [
  {
    name: "searchPlayersByName",
    description:
      "Search for players by name. Returns matching members. Use this when the user mentions a player by name to find their ID.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        searchTerm: {
          type: SchemaType.STRING,
          description:
            "Name or partial name to search for (e.g., 'Jose', 'Smith')",
        },
      },
      required: ["searchTerm"],
    },
  },
  {
    name: "listAllPlayers",
    description:
      "List all active players at the academy. Use when admin asks to see all players or needs to find someone.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "createNewPlayer",
    description:
      "Create a new player account at the academy. Requires firstName, lastName, email, and phone. The player will be created with role 'player' and active status.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        firstName: {
          type: SchemaType.STRING,
          description: "Player's first name",
        },
        lastName: {
          type: SchemaType.STRING,
          description: "Player's last name",
        },
        email: {
          type: SchemaType.STRING,
          description: "Player's email address",
        },
        phone: {
          type: SchemaType.STRING,
          description: "Player's phone number",
        },
        ntrpRating: {
          type: SchemaType.STRING,
          description:
            "Optional: Player's NTRP rating (e.g., '3.5', '4.0')",
        },
        notes: {
          type: SchemaType.STRING,
          description: "Optional: Any notes about the player",
        },
      },
      required: ["firstName", "lastName", "email", "phone"],
    },
  },
];

// ─── Tool Execution ──────────────────────────────────────────────────

async function handleToolCall(
  call: { name: string; args?: Record<string, any> },
  userId: string,
  userRole: string
): Promise<any> {
  const functionName = call.name;
  const args = call.args || {};

  console.log(`[Orchestrator AI] Tool called: ${functionName}`, args);

  try {
    switch (functionName) {
      // ── Training Tools ───────────────────────────────

      case "getPlayerJournalAnalytics": {
        // Authorization: players can only analyze their own data
        if (
          userRole === "player" &&
          args.playerId !== userId
        ) {
          return {
            success: false,
            error:
              "You can only view your own journal analytics. Use your own player ID.",
          };
        }

        const analytics = await analyzePlayerJournals(args.playerId);
        return { success: true, data: analytics };
      }

      case "getPlayerProfile": {
        if (
          userRole === "player" &&
          args.playerId !== userId
        ) {
          return {
            success: false,
            error: "You can only view your own profile.",
          };
        }

        const member = await getMember(args.playerId);
        return {
          success: true,
          data: {
            id: member.id,
            name: `${member.firstName} ${member.lastName}`,
            memberNumber: member.memberNumber,
            joinDate: member.createdAt,
            role: member.role,
            ntrpRating: (member as any).ntrpRating || "Not set",
          },
        };
      }

      case "getPlayerTrainingHistory": {
        if (
          userRole === "player" &&
          args.playerId !== userId
        ) {
          return {
            success: false,
            error: "You can only view your own training history.",
          };
        }

        const plans = await getPlayerTrainingPlans(args.playerId);
        return {
          success: true,
          data: {
            totalPlans: plans.length,
            plans: plans.map((p) => ({
              id: p.id,
              created: p.createdAt,
              focusAreas: p.focusAreas,
              strengths: p.strengths,
              areasForImprovement: p.areasForImprovement,
              recommendations: p.recommendations,
              suggestedDrills: p.suggestedDrills,
              weeklyGoals: p.weeklyGoals,
              version: p.version,
              lastReview: p.lastReviewDate,
            })),
          },
        };
      }

      case "createTrainingPlanForPlayer": {
        if (
          userRole === "player" &&
          args.playerId !== userId
        ) {
          return {
            success: false,
            error: "You can only create plans for yourself.",
          };
        }

        const plan = await createTrainingPlan({
          playerId: args.playerId,
          focusAreas: args.focusAreas || [],
          strengths: args.strengths || [],
          areasForImprovement: args.areasForImprovement || [],
          recommendations: args.recommendations || "",
          suggestedDrills: args.suggestedDrills || [],
          weeklyGoals: args.weeklyGoals || [],
          progressNotes: "",
          createdBy: `ai-orchestrator-${userId}`,
        });

        return {
          success: true,
          data: {
            planId: plan.id,
            message:
              "Training plan created successfully! Now log it as a journal entry.",
          },
        };
      }

      case "createJournalEntryForPlan": {
        if (
          userRole === "player" &&
          args.playerId !== userId
        ) {
          return {
            success: false,
            error: "You can only create journal entries for yourself.",
          };
        }

        // For AI-generated plan entries, we use the repository directly to bypass
        // the coach role check. The coachId is set to the requesting user's ID,
        // and the entry is clearly marked as AI-generated in the summary.
        const today = new Date().toISOString().split("T")[0];

        const entry = await journalRepository.create({
          playerId: args.playerId,
          coachId: userId,
          sessionDate: today,
          summary: `[AI Training Plan] ${args.summary}`,
          areasWorkedOn: args.areasWorkedOn || [],
          pointersForNextSession: args.pointersForNextSession || "",
          additionalNotes:
            args.additionalNotes || "Generated by AI Tennis Coach (Ace)",
          createdBy: `ai-orchestrator-${userId}`,
        });

        return {
          success: true,
          data: {
            journalEntryId: entry.id,
            message:
              "Training plan has been logged as a journal entry! The player can see it in their journal.",
          },
        };
      }

      // ── Admin/Coach Tools ────────────────────────────

      case "searchPlayersByName": {
        if (userRole === "player") {
          return {
            success: false,
            error: "Only admins and coaches can search for other players.",
          };
        }

        const results = await searchMembers(args.searchTerm);
        const players = results.filter(
          (m) => m.isActive
        );

        return {
          success: true,
          data: {
            count: players.length,
            players: players.map((p) => ({
              id: p.id,
              name: `${p.firstName} ${p.lastName}`,
              email: p.email,
              role: p.role || "player",
              memberNumber: p.memberNumber,
              ntrpRating: (p as any).ntrpRating || "Not set",
            })),
          },
        };
      }

      case "listAllPlayers": {
        if (userRole === "player") {
          return {
            success: false,
            error: "Only admins and coaches can list all players.",
          };
        }

        const allMembers = await listMembers({ status: "active" });
        return {
          success: true,
          data: {
            count: allMembers.length,
            players: allMembers.map((p) => ({
              id: p.id,
              name: `${p.firstName} ${p.lastName}`,
              email: p.email,
              role: p.role || "player",
              memberNumber: p.memberNumber,
            })),
          },
        };
      }

      case "createNewPlayer": {
        if (userRole !== "admin") {
          return {
            success: false,
            error: "Only admins can create new player accounts.",
          };
        }

        const newMember = await createMember({
          firstName: args.firstName,
          lastName: args.lastName,
          email: args.email,
          phone: args.phone,
          role: "player",
          isActive: true,
          ntrpRating: args.ntrpRating,
          notes: args.notes,
        });

        return {
          success: true,
          data: {
            id: newMember.id,
            name: `${newMember.firstName} ${newMember.lastName}`,
            email: newMember.email,
            memberNumber: newMember.memberNumber,
            message: `Player ${newMember.firstName} ${newMember.lastName} has been created successfully! They can now sign up with their email (${newMember.email}) to access their account.`,
          },
        };
      }

      default:
        return {
          success: false,
          error: `Unknown function: ${functionName}`,
        };
    }
  } catch (error: any) {
    console.error(`[Orchestrator AI] Error in ${functionName}:`, error);
    return {
      success: false,
      error: error.message || `Failed to execute ${functionName}`,
    };
  }
}

// ─── Main Chat Function ──────────────────────────────────────────────

export interface OrchestratorChatOptions {
  message: string;
  conversationHistory: Array<{ role: string; content: string }>;
  userId: string;
  userRole: string;
  userName: string;
}

export async function chatWithOrchestrator(
  options: OrchestratorChatOptions
): Promise<{ response: string }> {
  const { message, conversationHistory, userId, userRole, userName } = options;

  // Build tool list based on role
  const allTools: any[] = [...trainingTools];
  if (userRole === "admin" || userRole === "coach") {
    allTools.push(...adminTools);
  }

  const model = genAI.getGenerativeModel({
    model: modelName,
    tools: [{ functionDeclarations: allTools }] as any,
    systemInstruction: {
      parts: [
        {
          text: getOrchestratorSystemPrompt(userRole, userName, userId),
        },
      ],
    } as any,
  });

  // Format conversation history
  const filteredHistory = conversationHistory
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .slice(-12); // Keep last 12 messages for context

  // Ensure history starts with a user message
  if (filteredHistory.length > 0 && filteredHistory[0].role !== "user") {
    filteredHistory.shift();
  }

  const formattedHistory = filteredHistory.map((msg) => ({
    role: msg.role === "assistant" ? "model" : msg.role,
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history: formattedHistory,
  });

  // Send message and handle agentic tool-calling loop
  let result = await chat.sendMessage(message);
  let response = result.response;

  // Agentic loop: keep calling tools until the model returns a text response
  let loopCount = 0;
  const MAX_LOOPS = 10; // Safety limit

  while (
    loopCount < MAX_LOOPS &&
    response.candidates?.[0]?.content?.parts?.some(
      (part: any) => part.functionCall
    )
  ) {
    loopCount++;
    const functionCalls = response.candidates[0].content.parts.filter(
      (part: any) => part.functionCall
    );

    console.log(
      `[Orchestrator AI] Loop ${loopCount}: Processing ${functionCalls.length} tool call(s)`
    );

    const functionResponses = await Promise.all(
      functionCalls.map(async (part: any) => {
        const toolResult = await handleToolCall(
          part.functionCall,
          userId,
          userRole
        );
        return {
          functionResponse: {
            name: part.functionCall.name,
            response: toolResult,
          },
        };
      })
    );

    // Send tool results back to the model
    result = await chat.sendMessage(functionResponses);
    response = result.response;
  }

  if (loopCount >= MAX_LOOPS) {
    console.warn(
      "[Orchestrator AI] Hit maximum tool-call loop limit"
    );
  }

  const textResponse = response.text();
  return { response: textResponse };
}
