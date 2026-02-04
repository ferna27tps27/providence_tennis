"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";

interface BookingCardProps {
  reservation: {
    id: string;
    courtName: string;
    date: string;
    timeSlot: {
      start: string;
      end: string;
    };
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
  const bookingStart = new Date(`${reservation.date}T${reservation.timeSlot?.start ?? "00:00"}`);
  const isUpcoming = bookingStart >= new Date();
  const isCancelled = reservation.status === "cancelled";
  const showConfirm = confirmCancelId === reservation.id;
  const useInlineConfirm = Boolean(onCancelClick && onKeep && onConfirmCancel);

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
                  : "bg-blue-100 text-blue-700"
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

        {isUpcoming && !isCancelled && (onCancel || onConfirmCancel) && (
          <div className="ml-4 flex flex-col items-end gap-2">
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
          </div>
        )}
      </div>
    </motion.div>
  );
}
