"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import CoachJournalForm from "@/components/journal/CoachJournalForm";
import { getLatestJournalEntryForPlayer, JournalEntry } from "@/lib/api/journal-api";

interface BookingCardProps {
  reservation: {
    id: string;
    courtName: string;
    date: string;
    timeSlot: {
      start: string;
      end: string;
    };
    memberId?: string;
    status: "confirmed" | "cancelled";
    paymentStatus?: "pending" | "paid" | "refunded" | "failed";
    paymentAmount?: number;
    createdAt: string;
  };
  onCancel?: (id: string) => void;
  isCancelling?: boolean;
  /** Inline confirm flow: which card is showing confirm UI */
  confirmCancelId?: string | null;
  /** Error message from last cancel attempt */
  cancelError?: string | null;
  onCancelClick?: (id: string) => void;
  onKeep?: () => void;
  onConfirmCancel?: (id: string) => void;
}

export default function BookingCard({
  reservation,
  onCancel,
  isCancelling = false,
  confirmCancelId = null,
  cancelError = null,
  onCancelClick,
  onKeep,
  onConfirmCancel,
}: BookingCardProps) {
  const { user, token } = useAuth();
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [lastJournalEntry, setLastJournalEntry] = useState<JournalEntry | null>(null);
  const [showJournalPreview, setShowJournalPreview] = useState(false);
  const [loadingJournal, setLoadingJournal] = useState(false);
  const bookingStart = new Date(`${reservation.date}T${reservation.timeSlot?.start ?? "00:00"}`);
  const isUpcoming = bookingStart >= new Date();
  const isCancelled = reservation.status === "cancelled";
  const showConfirm = confirmCancelId === reservation.id;
  const useInlineConfirm = Boolean(onCancelClick && onKeep && onConfirmCancel);
  const isCoach = user?.role === "coach" || user?.role === "admin";

  // Fetch last journal entry for this player
  useEffect(() => {
    if (!reservation.memberId || !token || isCancelled) return;
    
    const fetchLastEntry = async () => {
      setLoadingJournal(true);
      try {
        const entry = await getLatestJournalEntryForPlayer(reservation.memberId!, token);
        setLastJournalEntry(entry);
      } catch (error) {
        console.error("Error fetching last journal entry:", error);
      } finally {
        setLoadingJournal(false);
      }
    };

    fetchLastEntry();
  }, [reservation.memberId, token, isCancelled, showJournalForm]);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  const handleCancelClick = () => {
    if (useInlineConfirm && onCancelClick) {
      onCancelClick(reservation.id);
    } else if (onCancel) {
      onCancel(reservation.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card ${isCancelled ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{reservation.courtName}</h3>
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                isCancelled
                  ? "bg-gray-100 text-gray-600"
                  : isUpcoming
                  ? "bg-green-100 text-green-700"
                  : "bg-primary-100 text-primary-700"
              }`}
            >
              {isCancelled ? "Cancelled" : isUpcoming ? "Upcoming" : "Past"}
            </span>
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <span>📅</span>
              <span>{formatDate(reservation.date)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>⏰</span>
              <span>
                {formatTime(reservation.timeSlot.start)} - {formatTime(reservation.timeSlot.end)}
              </span>
            </div>
            {reservation.paymentAmount && (
              <div className="flex items-center space-x-2">
                <span>💳</span>
                <span>
                  ${(reservation.paymentAmount / 100).toFixed(2)}
                  {reservation.paymentStatus && (
                    <span className="ml-2 text-xs">
                      ({reservation.paymentStatus})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="ml-4 flex flex-col items-end gap-2">
          {/* Journal Entry Button (Coaches only, for past or current reservations) */}
          {isCoach && !isCancelled && (
            <button
              type="button"
              onClick={() => setShowJournalForm(!showJournalForm)}
              className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
            >
              {showJournalForm ? "✕ Close" : "📝 Create Journal Entry"}
            </button>
          )}

          {/* Cancel Button (Upcoming only) */}
          {isUpcoming && !isCancelled && (onCancel || onConfirmCancel) && (
            <>
              {showConfirm ? (
                <>
                  <p className="text-sm text-gray-700 mb-1">Cancel this booking? A refund may apply per our policy.</p>
                  {cancelError && (
                    <p className="text-sm text-red-600 mb-1">{cancelError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onKeep}
                      disabled={isCancelling}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Keep booking
                    </button>
                    <button
                      type="button"
                      onClick={() => onConfirmCancel?.(reservation.id)}
                      disabled={isCancelling}
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCancelling ? "Cancelling…" : "Confirm cancel"}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelClick}
                  disabled={isCancelling}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Last Journal Entry Preview */}
      {!isCancelled && lastJournalEntry && !showJournalForm && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowJournalPreview(!showJournalPreview)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">📔 Last Journal Entry</span>
              <span className="text-xs text-gray-500">
                {format(new Date(lastJournalEntry.sessionDate), "MMM d, yyyy")}
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${showJournalPreview ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showJournalPreview && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <div className="mb-2">
                <span className="font-medium text-yellow-900">Summary:</span>
                <p className="text-yellow-800 mt-1">{lastJournalEntry.summary}</p>
              </div>
              
              {lastJournalEntry.areasWorkedOn.length > 0 && (
                <div className="mb-2">
                  <span className="font-medium text-yellow-900">Areas:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {lastJournalEntry.areasWorkedOn.map((area) => (
                      <span
                        key={area}
                        className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mt-2">
                <span className="font-medium text-yellow-900 text-xs">Next Session:</span>
                <p className="text-yellow-800 text-xs mt-1">{lastJournalEntry.pointersForNextSession}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Journal Entry Form Modal */}
      {showJournalForm && isCoach && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-primary-900 mb-3">Create Journal Entry</h4>
            <CoachJournalForm
              initialPlayerId={reservation.memberId || ""}
              initialReservationId={reservation.id}
              initialDate={reservation.date}
              initialTime={reservation.timeSlot.start}
              onSuccess={() => {
                setShowJournalForm(false);
              }}
              onCancel={() => setShowJournalForm(false)}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
