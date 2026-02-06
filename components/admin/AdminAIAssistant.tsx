"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  needsConfirmation?: boolean;
  conflictInfo?: {
    hasConflict: boolean;
    message?: string;
  };
}

type ChatMode = "training" | "booking";

interface AdminAIAssistantProps {
  token: string;
  userRole?: string;
}

const getWelcomeMessage = (role?: string, mode?: ChatMode) => {
  if (mode === "booking" && role === "admin") {
    return "Hi! I'm your **Admin Booking Assistant**. I can help you manage court reservations. Try saying:\n\n" +
      "- \"Show me all bookings for today\"\n" +
      "- \"Move the 10 AM booking on Court 1 to tomorrow at 2 PM\"\n" +
      "- \"Cancel the reservation for John Smith\"\n" +
      "- \"Is Court 3 available on Monday at 3 PM?\"\n\n" +
      "I'll warn you about conflicts and always ask before making changes!";
  }

  if (role === "admin") {
    return "Hi! I'm **Ace**, your AI Tennis Coach & Assistant! I'm here to help you manage players and create personalized training plans.\n\n" +
      "**Try asking me:**\n" +
      "- \"Create a training plan for Jose\"\n" +
      "- \"How is Maria doing with her backhand?\"\n" +
      "- \"Add a new player named Alex Johnson\"\n" +
      "- \"Show me all players\"\n" +
      "- \"What should Jose work on next?\"\n\n" +
      "I'll analyze journal entries and create data-driven plans that are automatically logged!";
  }

  if (role === "coach") {
    return "Hi! I'm **Ace**, your AI Tennis Coach Assistant! I can help you create training plans for your players.\n\n" +
      "**Try asking me:**\n" +
      "- \"Create a training plan for [player name]\"\n" +
      "- \"How is [player name] progressing?\"\n" +
      "- \"What should [player name] focus on?\"\n" +
      "- \"Analyze [player name]'s recent sessions\"\n\n" +
      "I'll analyze journal entries and create data-driven plans!";
  }

  return "Hi! I'm **Ace**, your AI Tennis Coach! I'm here to help you improve your game with personalized training plans and advice.\n\n" +
    "**Try asking me:**\n" +
    "- \"What should I be working on?\"\n" +
    "- \"Create a training plan for me\"\n" +
    "- \"How am I progressing?\"\n" +
    "- \"What did my coach say about my last session?\"\n" +
    "- \"What are my strengths and weaknesses?\"\n\n" +
    "I'll analyze your journal entries and give you data-driven recommendations!";
};

const getPlaceholder = (role?: string, mode?: ChatMode) => {
  if (mode === "booking") return "Ask me to manage bookings...";
  if (role === "admin") return "e.g., \"Create a plan for Jose\" or \"Add new player\"...";
  if (role === "coach") return "e.g., \"Create a plan for [player]\"...";
  return "e.g., \"Create a plan for me\" or \"What should I work on?\"...";
};

const getHeaderTitle = (role?: string, mode?: ChatMode) => {
  if (mode === "booking") return "Booking Assistant";
  return "Ace - Tennis Coach AI";
};

const getHeaderSubtitle = (role?: string, mode?: ChatMode) => {
  if (mode === "booking") return "Natural Language Booking Management";
  if (role === "admin") return "Training Plans & Player Management";
  if (role === "coach") return "Training Plans & Player Analytics";
  return "Your Personal Training Coach";
};

export default function AdminAIAssistant({ token, userRole }: AdminAIAssistantProps) {
  const isAdmin = userRole === "admin";
  const [chatMode, setChatMode] = useState<ChatMode>("training");
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: getWelcomeMessage(userRole, "training"),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Reset messages when mode changes
  const handleModeSwitch = (newMode: ChatMode) => {
    setChatMode(newMode);
    setMessages([
      {
        role: "assistant",
        content: getWelcomeMessage(userRole, newMode),
      },
    ]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Route to appropriate endpoint
      let endpoint: string;
      if (chatMode === "booking" && isAdmin) {
        endpoint = "/api/admin/chat";
      } else {
        endpoint = "/api/orchestrator/chat";
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: userMessage,
            conversationHistory,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get response from AI");
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          needsConfirmation: data.needsConfirmation,
          conflictInfo: data.conflictInfo,
        },
      ]);
    } catch (error: any) {
      console.error("Error chatting with AI:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick suggestion chips
  const getQuickActions = () => {
    if (chatMode === "booking") {
      return [
        "Show today's bookings",
        "Check Court 1 availability",
      ];
    }
    if (userRole === "admin") {
      return [
        "Show all players",
        "Create a training plan",
      ];
    }
    if (userRole === "coach") {
      return [
        "Analyze my player",
        "Create a training plan",
      ];
    }
    return [
      "What should I work on?",
      "Create a plan for me",
    ];
  };

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 rounded-full p-4 shadow-lg transition-colors ${
          isOpen
            ? "bg-red-600 hover:bg-red-700"
            : "bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600"
        } text-white`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={isOpen ? "Close AI Coach" : "Open AI Tennis Coach"}
      >
        {isOpen ? (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        )}
        <span className="absolute top-0 right-0 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-24 right-6 w-[450px] h-[650px] bg-white rounded-2xl shadow-2xl z-40 flex flex-col border border-gray-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary-300 rounded-full animate-pulse"></div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {getHeaderTitle(userRole, chatMode)}
                    </h3>
                    <p className="text-xs opacity-90">
                      {getHeaderSubtitle(userRole, chatMode)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/20 rounded-full p-1 transition"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Mode Toggle for Admin */}
              {isAdmin && (
                <div className="mt-3 flex bg-white/15 rounded-lg p-0.5">
                  <button
                    onClick={() => handleModeSwitch("training")}
                    className={`flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all ${
                      chatMode === "training"
                        ? "bg-white text-primary-700 shadow-sm"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Training Coach
                  </button>
                  <button
                    onClick={() => handleModeSwitch("booking")}
                    className={`flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all ${
                      chatMode === "booking"
                        ? "bg-white text-primary-700 shadow-sm"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Booking Manager
                  </button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white"
                        : message.conflictInfo?.hasConflict
                        ? "bg-yellow-50 border-2 border-yellow-400 text-gray-800"
                        : "bg-white border border-gray-200 text-gray-800"
                    }`}
                  >
                    {message.conflictInfo?.hasConflict && (
                      <div className="mb-2 flex items-start gap-2">
                        <span className="text-yellow-600 text-xl">&#9888;</span>
                        <span className="font-semibold text-yellow-800">Conflict Detected</span>
                      </div>
                    )}
                    <div className="text-sm prose prose-sm max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-table:my-3 prose-strong:font-semibold prose-strong:text-gray-900">
                      <ReactMarkdown
                        components={{
                          table: ({ node, ...props }) => (
                            <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg overflow-hidden" {...props} />
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-gray-100" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-3 py-2 text-sm text-gray-800 border-b border-gray-200" {...props} />
                          ),
                          tr: ({ node, ...props }) => (
                            <tr className="hover:bg-gray-50" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-5 space-y-1" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal pl-5 space-y-1" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-base font-bold text-gray-900 mt-3 mb-2" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-semibold text-gray-900" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="my-2 leading-relaxed" {...props} />
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">
                      {chatMode === "booking" ? "Processing..." : "Analyzing..."}
                    </span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Chips */}
            {messages.length <= 1 && !isLoading && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {getQuickActions().map((action) => (
                  <button
                    key={action}
                    onClick={() => {
                      setInput(action);
                      // Auto-send after a brief moment
                      setTimeout(() => {
                        const fakeEvent = { key: "Enter", shiftKey: false, preventDefault: () => {} };
                        // We'll just set input and let user click send, or we handle it differently
                      }, 100);
                    }}
                    className="text-xs bg-primary-50 text-primary-700 border border-primary-200 rounded-full px-3 py-1.5 hover:bg-primary-100 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={getPlaceholder(userRole, chatMode)}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl px-4 py-2 hover:from-primary-700 hover:to-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {chatMode === "booking"
                  ? "Tip: Be specific with dates, times, and court names"
                  : "Tip: Ask me to create plans, analyze progress, or give training advice"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
