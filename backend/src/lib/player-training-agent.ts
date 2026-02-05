/**
 * Player Training AI Agent
 * Analyzes player's journal history and provides personalized training recommendations
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { getJournalEntries } from "./journal";
import { getMember } from "./members";
import { JournalAnalytics } from "../types/training-plan";
import {
  createTrainingPlan,
  getPlayerTrainingPlans,
  getLatestTrainingPlan,
} from "./repositories/file-training-plan-repository";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const modelName = process.env.GOOGLE_GENAI_MODEL || "gemini-3-flash-preview";

const PLAYER_TRAINING_CONTEXT = `
You are an AI tennis training coach for Providence Tennis Academy. Your role is to help players improve their game by:

1. **Analyzing Performance**: Review journal entries from coaching sessions to identify patterns, strengths, and areas needing improvement
2. **Personalized Recommendations**: Provide specific, actionable training advice based on each player's unique situation
3. **Goal Setting**: Help players set realistic weekly goals based on their progress
4. **Progress Tracking**: Compare current performance with past training plans to measure improvement
5. **Motivation**: Encourage players and celebrate their progress

**Your Approach:**
- Be encouraging and positive
- Use data from journal entries to support your recommendations
- Focus on 2-3 key areas at a time (don't overwhelm)
- Provide specific drills and exercises
- Reference what coaches have noted in journal entries
- Acknowledge player reflections and feelings
- Set measurable weekly goals

**Available Information:**
- Player's journal entries (summary, areas worked on, coach pointers, player reflections)
- Frequency of focus areas (percentage breakdown)
- Player profile (name, join date)
- Previous training plans
- Progress trends over time

**When a player asks "What should I work on?":**
1. First, analyze their journal data
2. Identify top 2-3 focus areas based on frequency and coach feedback
3. Note any patterns or trends
4. Provide specific recommendations
5. Suggest weekly goals
6. Offer to create a training plan template for their coach

Always be supportive, data-driven, and actionable in your recommendations.
`;

/**
 * Analyze player's journal entries and calculate analytics
 */
async function analyzePlayerJournals(playerId: string): Promise<JournalAnalytics> {
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
  
  // Sort by date
  const sortedJournals = journals.sort(
    (a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
  );
  
  // Calculate areas frequency
  const areasFrequency: Record<string, number> = {};
  let totalAreas = 0;
  
  journals.forEach(journal => {
    journal.areasWorkedOn.forEach(area => {
      areasFrequency[area] = (areasFrequency[area] || 0) + 1;
      totalAreas++;
    });
  });
  
  // Calculate percentages
  const areasPercentage: Record<string, number> = {};
  Object.keys(areasFrequency).forEach(area => {
    areasPercentage[area] = (areasFrequency[area] / totalAreas) * 100;
  });
  
  // Get recent focus (last 3 sessions)
  const recentSessions = sortedJournals.slice(-3);
  const recentAreas = new Set<string>();
  recentSessions.forEach(journal => {
    journal.areasWorkedOn.forEach(area => recentAreas.add(area));
  });
  
  // Collect coach pointers
  const coachPointers = journals
    .slice(-5) // Last 5 sessions
    .map(j => j.pointersForNextSession)
    .filter(p => p && p.length > 0);
  
  // Collect player reflections
  const playerReflections = journals
    .filter(j => j.playerReflection)
    .slice(-5) // Last 5 reflections
    .map(j => j.playerReflection!);
  
  // Analyze trends (compare first half vs second half of journals)
  const midpoint = Math.floor(journals.length / 2);
  const firstHalf = journals.slice(0, midpoint);
  const secondHalf = journals.slice(midpoint);
  
  const firstHalfAreas: Record<string, number> = {};
  const secondHalfAreas: Record<string, number> = {};
  
  firstHalf.forEach(j => j.areasWorkedOn.forEach(area => {
    firstHalfAreas[area] = (firstHalfAreas[area] || 0) + 1;
  }));
  
  secondHalf.forEach(j => j.areasWorkedOn.forEach(area => {
    secondHalfAreas[area] = (secondHalfAreas[area] || 0) + 1;
  }));
  
  const improving: string[] = [];
  const needsWork: string[] = [];
  
  Object.keys(areasFrequency).forEach(area => {
    const firstCount = firstHalfAreas[area] || 0;
    const secondCount = secondHalfAreas[area] || 0;
    
    // If area is worked on less in second half, it may be improving
    if (firstCount > secondCount && secondCount > 0) {
      improving.push(area);
    }
    // If area is worked on more in second half, it needs work
    else if (secondCount > firstCount) {
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

/**
 * Function declarations for player training tools
 */
const playerTrainingTools: any[] = [
  {
    functionDeclarations: [
      {
        name: "getPlayerJournalAnalytics",
        description: "Analyzes a player's journal entries to provide statistics about their training sessions, focus areas, and progress trends. Returns frequency of areas worked on, recent focus, coach feedback, and improvement trends.",
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
        description: "Gets basic profile information about a player including name, member number, and join date.",
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
        description: "Retrieves all previous training plans created for the player to track progress over time and avoid repetition.",
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
        name: "createTrainingPlanTemplate",
        description: "Creates a personalized training plan template that can be reviewed by the player's coach. Include focus areas, strengths, areas for improvement, recommendations, suggested drills, and weekly goals.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            playerId: {
              type: SchemaType.STRING,
              description: "The ID of the player",
            },
            focusAreas: {
              type: SchemaType.ARRAY,
              description: "Main areas to focus on (e.g., ['backhand', 'serve', 'footwork'])",
              items: {
                type: SchemaType.STRING,
              },
            },
            strengths: {
              type: SchemaType.ARRAY,
              description: "Player's current strengths",
              items: {
                type: SchemaType.STRING,
              },
            },
            areasForImprovement: {
              type: SchemaType.ARRAY,
              description: "Specific areas that need work",
              items: {
                type: SchemaType.STRING,
              },
            },
            recommendations: {
              type: SchemaType.STRING,
              description: "Detailed recommendations and strategy",
            },
            suggestedDrills: {
              type: SchemaType.ARRAY,
              description: "Specific drills to practice",
              items: {
                type: SchemaType.STRING,
              },
            },
            weeklyGoals: {
              type: SchemaType.ARRAY,
              description: "Achievable weekly goals",
              items: {
                type: SchemaType.STRING,
              },
            },
          },
          required: ["playerId", "focusAreas", "recommendations", "weeklyGoals"],
        },
      },
    ],
  },
];

/**
 * Handle function calls from the AI agent
 */
async function handleFunctionCall(call: any, playerId: string): Promise<any> {
  const functionName = call.name;
  const args = call.args || {};
  
  console.log(`[Player Training AI] Tool called: ${functionName}`, args);
  
  try {
    switch (functionName) {
      case "getPlayerJournalAnalytics": {
        const analytics = await analyzePlayerJournals(args.playerId);
        return {
          success: true,
          data: analytics,
        };
      }
      
      case "getPlayerProfile": {
        const member = await getMember(args.playerId);
        return {
          success: true,
          data: {
            name: `${member.firstName} ${member.lastName}`,
            memberNumber: member.memberNumber,
            joinDate: member.createdAt,
            role: member.role,
          },
        };
      }
      
      case "getPlayerTrainingHistory": {
        const plans = await getPlayerTrainingPlans(args.playerId);
        return {
          success: true,
          data: {
            totalPlans: plans.length,
            plans: plans.map(p => ({
              id: p.id,
              created: p.createdAt,
              focusAreas: p.focusAreas,
              version: p.version,
              lastReview: p.lastReviewDate,
            })),
          },
        };
      }
      
      case "createTrainingPlanTemplate": {
        const plan = await createTrainingPlan({
          playerId: args.playerId,
          focusAreas: args.focusAreas || [],
          strengths: args.strengths || [],
          areasForImprovement: args.areasForImprovement || [],
          recommendations: args.recommendations || "",
          suggestedDrills: args.suggestedDrills || [],
          weeklyGoals: args.weeklyGoals || [],
          progressNotes: "",
          createdBy: "ai-training-agent",
        });
        
        return {
          success: true,
          data: {
            planId: plan.id,
            message: "Training plan created! Your coach can review and refine it in your next session.",
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
    console.error(`[Player Training AI] Error in ${functionName}:`, error);
    return {
      success: false,
      error: error.message || `Failed to execute ${functionName}`,
    };
  }
}

/**
 * Chat with the player training AI agent
 */
export async function chatWithTrainingAgent(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  playerId: string
): Promise<{ response: string }> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    tools: playerTrainingTools,
    systemInstruction: {
      parts: [{ text: PLAYER_TRAINING_CONTEXT }],
    },
  });
  
  // Filter and format conversation history
  const filteredHistory = conversationHistory
    .filter(msg => msg.role === "user" || msg.role === "assistant")
    .slice(-10); // Keep last 10 messages
  
  // Ensure history starts with user message
  if (filteredHistory.length > 0 && filteredHistory[0].role !== "user") {
    filteredHistory.shift();
  }
  
  // Format history for Gemini
  const formattedHistory = filteredHistory.map(msg => ({
    role: msg.role === "assistant" ? "model" : msg.role,
    parts: [{ text: msg.content }],
  }));
  
  const chat = model.startChat({
    history: formattedHistory,
  });
  
  // Send message
  let result = await chat.sendMessage(message);
  let response = result.response;
  
  // Handle function calls
  while (response.candidates?.[0]?.content?.parts?.some((part: any) => part.functionCall)) {
    const functionCalls = response.candidates[0].content.parts.filter(
      (part: any) => part.functionCall
    );
    
    const functionResponses = await Promise.all(
      functionCalls.map(async (part: any) => {
        const functionResult = await handleFunctionCall(part.functionCall, playerId);
        return {
          functionResponse: {
            name: part.functionCall.name,
            response: functionResult,
          },
        };
      })
    );
    
    // Send function results back to model
    result = await chat.sendMessage(functionResponses);
    response = result.response;
  }
  
  const textResponse = response.text();
  
  return {
    response: textResponse,
  };
}
