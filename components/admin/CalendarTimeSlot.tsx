"use client";

import { useDroppable } from "@dnd-kit/core";
import { AdminReservation } from "../../lib/api/admin-booking-api";

interface CalendarTimeSlotProps {
  date: string; // YYYY-MM-DD format
  timeSlot: {
    start: string;
    end: string;
  };
  reservations: AdminReservation[];
  children: React.ReactNode;
  hasConflict?: boolean;
}

export default function CalendarTimeSlot({
  date,
  timeSlot,
  reservations,
  children,
  hasConflict = false,
}: CalendarTimeSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${date}-${timeSlot.start}`,
    data: {
      date,
      timeSlot,
      reservations,
    },
  });

  // Determine if slot is occupied
  const isOccupied = reservations.length > 0;

  return (
    <td
      ref={setNodeRef}
      className={`border border-gray-300 p-1 align-top min-h-[60px] relative transition-all ${
        isOver && !hasConflict
          ? "bg-green-100 border-green-400 border-2"
          : isOver && hasConflict
          ? "bg-red-100 border-red-400 border-2"
          : isOccupied
          ? "bg-gray-50"
          : "bg-white hover:bg-gray-50"
      }`}
    >
      {/* Drop zone indicator when hovering */}
      {isOver && (
        <div
          className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 ${
            hasConflict ? "bg-red-100/50" : "bg-green-100/50"
          }`}
        >
          <span
            className={`text-xs font-semibold ${
              hasConflict ? "text-red-700" : "text-green-700"
            }`}
          >
            {hasConflict ? "⚠️ Conflict" : "✓ Drop here"}
          </span>
        </div>
      )}

      {/* Booking blocks */}
      {children}
    </td>
  );
}
