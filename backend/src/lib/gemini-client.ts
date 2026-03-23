import { GoogleGenAI } from "@google/genai";

function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || undefined;
}

export const geminiClient = new GoogleGenAI(
  getApiKey() ? { apiKey: getApiKey() } : {}
);

export type SimpleChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GeminiToolCall = {
  id?: string;
  name: string;
  args?: Record<string, any>;
};

export function normalizeToolArgs(args: unknown): Record<string, any> {
  if (typeof args === "string") {
    try {
      return JSON.parse(args);
    } catch {
      return {};
    }
  }

  if (args && typeof args === "object") {
    return args as Record<string, any>;
  }

  return {};
}

export function buildGeminiHistory(history: SimpleChatMessage[], context?: string) {
  let filteredHistory = history.slice();

  if (filteredHistory.length > 0 && filteredHistory[0].role === "assistant") {
    filteredHistory = filteredHistory.slice(1);
  }

  const formattedHistory = filteredHistory.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  if (!context) {
    return formattedHistory;
  }

  return [
    {
      role: "user",
      parts: [{ text: context }],
    },
    ...formattedHistory,
  ];
}

export function extractFunctionCalls(response: any): GeminiToolCall[] {
  if (Array.isArray(response?.functionCalls) && response.functionCalls.length > 0) {
    return response.functionCalls;
  }

  const parts = response?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((part: any) => part.functionCall)
    .map((part: any) => part.functionCall);
}

export function getResponseText(response: any): string {
  if (typeof response?.text === "string") {
    return response.text;
  }

  if (typeof response?.text === "function") {
    return response.text();
  }

  const parts = response?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part: any) => part.text || "")
    .join("")
    .trim();
}

export async function runGeminiFunctionCallingLoop(options: {
  model: string;
  contents: any[];
  tools: any[];
  systemInstruction?: string;
  config?: Record<string, any>;
  maxLoops?: number;
  handleToolCall: (call: GeminiToolCall) => Promise<any>;
}) {
  const { model, tools, systemInstruction, handleToolCall, config } = options;
  const contents = [...options.contents];
  const maxLoops = options.maxLoops ?? 10;

  const makeRequest = async () =>
    geminiClient.models.generateContent({
      model,
      contents,
      config: {
        ...(config || {}),
        tools,
        ...(systemInstruction ? { systemInstruction } : {}),
      },
    });

  let response = await makeRequest();
  let loopCount = 0;

  while (loopCount < maxLoops) {
    const functionCalls = extractFunctionCalls(response);
    if (functionCalls.length === 0) {
      break;
    }

    loopCount += 1;

    const modelContent = response?.candidates?.[0]?.content;
    if (modelContent) {
      contents.push(modelContent);
    }

    for (const call of functionCalls) {
      const toolResult = await handleToolCall(call);
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: call.name,
              response: toolResult,
              ...(call.id ? { id: call.id } : {}),
            },
          },
        ],
      });
    }

    response = await makeRequest();
  }

  return { response, loopCount };
}
