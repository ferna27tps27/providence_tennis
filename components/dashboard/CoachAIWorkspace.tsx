"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "../../lib/auth/auth-context";
import { getScheduleMembers, ScheduleMember } from "../../lib/api/schedule-api";
import {
  chatWithCoachAssistant,
  CoachChatMessagePayload,
  getCoachPlayerSummary,
  getCoachSessionPrep,
  getCoachTrainingPlanDraft,
  saveCoachTrainingPlanDraft,
} from "../../lib/api/coach-ai-api";

function getWelcomeMessage(player?: ScheduleMember) {
  if (!player) {
    return "Select a player to start using the coach workspace.";
  }

  return `Ace is ready for **${player.firstName} ${player.lastName}**.\n\nAsk for plan adjustments, intensity changes, drill swaps, or a sharper weekly focus.`;
}

export default function CoachAIWorkspace() {
  const { token } = useAuth();
  const [players, setPlayers] = useState<ScheduleMember[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [playerSummary, setPlayerSummary] = useState<any>(null);
  const [trainingPlanDraft, setTrainingPlanDraft] = useState<any>(null);
  const [sessionPrep, setSessionPrep] = useState<any>(null);
  const [savedPlan, setSavedPlan] = useState<{ id: string; createdAt: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<CoachChatMessagePayload[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const selectedPlayer = players.find((player) => player.id === selectedPlayerId);

  useEffect(() => {
    const loadPlayers = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const nextPlayers = await getScheduleMembers(token, "player");
        setPlayers(nextPlayers);
        setSelectedPlayerId(nextPlayers[0]?.id || "");
      } catch (err: any) {
        setError(err.message || "Failed to load players");
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, [token]);

  useEffect(() => {
    setChatMessages([{ role: "assistant", content: getWelcomeMessage(selectedPlayer) }]);
    setChatInput("");
  }, [selectedPlayerId, selectedPlayer?.firstName, selectedPlayer?.lastName]);

  const runAction = async (action: "summary" | "plan" | "prep") => {
    if (!token || !selectedPlayerId) return;

    try {
      setWorking(true);
      setError("");
      setSuccess("");

      if (action === "summary") {
        setPlayerSummary(await getCoachPlayerSummary(token, selectedPlayerId));
      }
      if (action === "plan") {
        setTrainingPlanDraft(await getCoachTrainingPlanDraft(token, selectedPlayerId));
        setSavedPlan(null);
      }
      if (action === "prep") {
        setSessionPrep(await getCoachSessionPrep(token, selectedPlayerId));
      }
    } catch (err: any) {
      setError(err.message || "Failed to run coach AI workflow");
    } finally {
      setWorking(false);
    }
  };

  const handleSavePlanDraft = async () => {
    if (!token || !selectedPlayerId || !trainingPlanDraft) return;

    try {
      setWorking(true);
      setError("");
      setSuccess("");
      const saved = await saveCoachTrainingPlanDraft(token, selectedPlayerId);
      setSavedPlan({ id: saved.id, createdAt: saved.createdAt });
      setSuccess("Training plan draft saved to the player record.");
    } catch (err: any) {
      setError(err.message || "Failed to save training plan draft");
    } finally {
      setWorking(false);
    }
  };

  const handleSendChat = async () => {
    if (!token || !selectedPlayerId || !chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    const nextHistory = [...chatMessages, { role: "user" as const, content: userMessage }];

    try {
      setChatLoading(true);
      setError("");
      setChatInput("");
      setChatMessages(nextHistory);

      const result = await chatWithCoachAssistant(token, {
        playerId: selectedPlayerId,
        message: userMessage,
        conversationHistory: nextHistory,
      });

      setChatMessages((current) => [...current, { role: "assistant", content: result.response }]);
    } catch (err: any) {
      setError(err.message || "Failed to run coach AI chat");
      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "I hit an error while processing that coaching request.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendChat();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Coach AI Workspace</span>
        </h1>
        <p className="text-gray-600">Structured coaching outputs for player summary, plan drafts, and session prep.</p>
      </div>

      <div className="card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="text-sm text-gray-600">Player</label>
            <select
              value={selectedPlayerId}
              onChange={(event) => setSelectedPlayerId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.firstName} {player.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => runAction("summary")} disabled={working || loading} className="btn-primary">
              Player Summary
            </button>
            <button onClick={() => runAction("plan")} disabled={working || loading} className="btn-secondary">
              Plan Draft
            </button>
            <button onClick={() => runAction("prep")} disabled={working || loading} className="btn-secondary">
              Session Prep
            </button>
          </div>
        </div>
        {success && <div className="text-green-600 text-sm">{success}</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Player Summary</h2>
          {!playerSummary ? (
            <p className="text-sm text-gray-500">Generate a player summary to see recent focus areas and coaching takeaways.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="font-semibold">{playerSummary.player.fullName}</div>
              <div>Total sessions: {playerSummary.totalSessions}</div>
              <div>Recent focus: {playerSummary.recentFocusAreas.join(", ") || "None yet"}</div>
              <div className="text-gray-600">{playerSummary.coachTakeaway}</div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Training Plan Draft</h2>
          {!trainingPlanDraft ? (
            <p className="text-sm text-gray-500">Generate a plan draft from journal history.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div><span className="font-semibold">Focus:</span> {trainingPlanDraft.focusAreas.join(", ")}</div>
              <div><span className="font-semibold">Recommendations:</span> {trainingPlanDraft.recommendations}</div>
              <div>
                <span className="font-semibold">Weekly goals:</span>
                <ul className="mt-1 list-disc pl-5">
                  {trainingPlanDraft.weeklyGoals.map((goal: string) => <li key={goal}>{goal}</li>)}
                </ul>
              </div>
              <button onClick={handleSavePlanDraft} disabled={working} className="btn-primary">
                {working ? "Saving..." : "Save Plan Draft"}
              </button>
              {savedPlan && (
                <div className="text-green-600">
                  Saved plan {savedPlan.id} on {new Date(savedPlan.createdAt).toLocaleDateString()}.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Session Prep</h2>
          {!sessionPrep ? (
            <p className="text-sm text-gray-500">Generate a next-session agenda and reminders.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div><span className="font-semibold">Focus:</span> {sessionPrep.focusAreas.join(", ")}</div>
              <div>
                <span className="font-semibold">Agenda:</span>
                <ul className="mt-1 list-disc pl-5">
                  {sessionPrep.agenda.map((item: any) => (
                    <li key={`${item.block}-${item.focus}`}>
                      Block {item.block}: {item.focus} via {item.drill}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 right-4 z-40 md:right-6">
        {chatOpen && (
          <div className="mb-4 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[1.75rem] border border-primary-100 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.18)]">
            <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-500 px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Live Coach Chat</div>
                  <div className="mt-1 text-lg font-semibold">Ace</div>
                  <div className="text-sm text-white/85">
                    {selectedPlayer
                      ? `Working on ${selectedPlayer.firstName} ${selectedPlayer.lastName}`
                      : "Select a player to start"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  className="rounded-full bg-white/15 px-2 py-1 text-xs font-medium text-white transition hover:bg-white/25"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="space-y-4 bg-gradient-to-b from-slate-50 to-white p-4">
              <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
                {chatMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-3 text-sm shadow-sm ${
                        message.role === "assistant"
                          ? "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                          : "rounded-br-md bg-gradient-to-r from-primary-600 to-emerald-500 text-white"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-lg rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                      Ace is thinking...
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedPlayer && (
                  <>
                    <button
                      type="button"
                      onClick={() => setChatInput(`Adjust ${selectedPlayer.firstName}'s plan to emphasize serve improvement and simplify the weekly goals.`)}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-primary-50 hover:text-primary-700 hover:ring-primary-200"
                    >
                      Emphasize serve
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatInput(`Refine ${selectedPlayer.firstName}'s plan for a lighter workload this week and keep only the top two focus areas.`)}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-primary-50 hover:text-primary-700 hover:ring-primary-200"
                    >
                      Lighter week
                    </button>
                  </>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-sm">
                <textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={handleChatKeyDown}
                  rows={3}
                  placeholder="Ask Ace to adjust the current player's plan..."
                  className="w-full resize-none rounded-lg border-0 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-0"
                />
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-2 pt-2">
                  <div className="text-xs text-slate-400">
                    {selectedPlayer ? `Context: ${selectedPlayer.firstName} ${selectedPlayer.lastName}` : "Choose a player first"}
                  </div>
                  <button
                    type="button"
                    onClick={handleSendChat}
                    disabled={chatLoading || !chatInput.trim() || !selectedPlayerId}
                    className="rounded-full bg-gradient-to-r from-primary-600 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {chatLoading ? "Thinking..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setChatOpen((current) => !current)}
          className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-primary-600 to-emerald-500 px-4 py-3 text-white shadow-[0_18px_45px_rgba(13,148,136,0.35)] transition hover:scale-[1.01] hover:shadow-[0_22px_55px_rgba(13,148,136,0.42)]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/18 text-lg font-semibold ring-1 ring-white/20">
            AI
          </span>
          <span className="text-left">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/75">Coach Bubble</span>
            <span className="block text-sm font-semibold">Chat with Ace</span>
          </span>
        </button>
      </div>
    </div>
  );
}
