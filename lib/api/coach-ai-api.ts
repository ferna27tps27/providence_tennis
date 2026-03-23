const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

interface ApiError {
  error: string;
  code?: string;
}

export interface SavedCoachTrainingPlan {
  id: string;
  playerId: string;
  createdAt: string;
  createdBy: string;
  focusAreas: string[];
  weeklyGoals: string[];
  recommendations: string;
}

export interface CoachChatMessagePayload {
  role: "user" | "assistant";
  content: string;
}

async function postJson<T>(path: string, token: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to load coach AI data");
  }

  return response.json();
}

export function getCoachPlayerSummary(token: string, playerId: string) {
  return postJson("/api/coach-ai/player-summary", token, { playerId });
}

export function getCoachTrainingPlanDraft(token: string, playerId: string) {
  return postJson("/api/coach-ai/training-plan-draft", token, { playerId });
}

export function saveCoachTrainingPlanDraft(token: string, playerId: string) {
  return postJson<SavedCoachTrainingPlan>("/api/coach-ai/training-plan-draft/save", token, { playerId });
}

export function getCoachSessionPrep(token: string, playerId: string) {
  return postJson("/api/coach-ai/session-prep", token, { playerId });
}

export function chatWithCoachAssistant(
  token: string,
  body: {
    playerId: string;
    message: string;
    conversationHistory: CoachChatMessagePayload[];
  }
) {
  return postJson<{ response: string }>("/api/coach-ai/chat", token, body);
}
