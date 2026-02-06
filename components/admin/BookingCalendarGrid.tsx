"use client";

import { useState, useMemo } from "react";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { AdminReservation, Court } from "../../lib/api/admin-booking-api";
import DraggableBookingBlock from "./DraggableBookingBlock";
import CalendarTimeSlot from "./CalendarTimeSlot";

interface BookingCalendarGridProps {
  reservations: AdminReservation[];
  courts: Court[];
  onReservationUpdate: (id: string, updates: {
    date: string;
    courtId: string;
    timeSlot: { start: string; end: string };
  }) => Promise<void>;
  isLoading?: boolean;
}

// Time slots from 8 AM to 9 PM (hourly)
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 8;
  return {
    start: `${hour.toString().padStart(2, "0")}:00`,
    end: `${(hour + 1).toString().padStart(2, "0")}:00`,
  };
});

// Court colors for visual distinction
const COURT_COLORS = [
  "bg-primary-100 border-primary-300 text-primary-900",
  "bg-green-100 border-green-300 text-green-900",
  "bg-purple-100 border-purple-300 text-purple-900",
  "bg-orange-100 border-orange-300 text-orange-900",
  "bg-pink-100 border-pink-300 text-pink-900",
  "bg-cyan-100 border-cyan-300 text-cyan-900",
];

export default function BookingCalendarGrid({
  reservations,
  courts,
  onReservationUpdate,
  isLoading = false,
}: BookingCalendarGridProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
  );
  const [activeReservation, setActiveReservation] = useState<AdminReservation | null>(null);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Generate array of 7 days starting from currentWeekStart
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Navigate to previous/next week
  const handlePreviousWeek = () => {
    setCurrentWeekStart((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1));
  };

  // Get court color by court ID
  const getCourtColor = (courtId: string) => {
    const courtIndex = courts.findIndex((c) => c.id === courtId);
    return COURT_COLORS[courtIndex % COURT_COLORS.length];
  };

  // Get reservations for a specific date and time slot
  const getReservationsForSlot = (date: Date, timeSlot: { start: string; end: string }) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return reservations.filter((res) => {
      if (res.date !== dateStr || res.status === "cancelled") return false;
      // Check if time slots overlap
      return res.timeSlot.start === timeSlot.start;
    });
  };

  // Check if slot would have conflict for a given reservation (per court)
  const wouldHaveConflict = (
    date: string,
    timeSlot: { start: string; end: string },
    courtId: string,
    movingReservationId: string
  ): boolean => {
    return reservations.some((res) => {
      if (res.id === movingReservationId) return false; // Don't conflict with self
      if (res.status === "cancelled") return false;
      if (res.date !== date) return false;
      if (res.courtId !== courtId) return false; // Only conflict on the same court
      // Check if time slots match (for hourly slots)
      return res.timeSlot.start === timeSlot.start;
    });
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const reservation = event.active.data.current?.reservation as AdminReservation;
    setActiveReservation(reservation);
    setError("");
    setSuccessMessage("");
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveReservation(null);

    if (!over) return;

    const reservation = active.data.current?.reservation as AdminReservation;
    const targetData = over.data.current as {
      date: string;
      timeSlot: { start: string; end: string };
    };

    // Check if dropped on same slot
    if (
      reservation.date === targetData.date &&
      reservation.timeSlot.start === targetData.timeSlot.start
    ) {
      return; // No change
    }

    // Check for conflicts on the same court
    if (wouldHaveConflict(targetData.date, targetData.timeSlot, reservation.courtId, reservation.id)) {
      setError("Cannot move: Time slot already booked on this court");
      setTimeout(() => setError(""), 5000);
      return;
    }

    // Update reservation
    try {
      await onReservationUpdate(reservation.id, {
        date: targetData.date,
        courtId: reservation.courtId,
        timeSlot: targetData.timeSlot,
      });
      setSuccessMessage("Booking moved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to move booking");
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleDragCancel = () => {
    setActiveReservation(null);
  };

  // Format date range for header
  const weekRangeText = `${format(weekDays[0], "MMM d")} - ${format(
    weekDays[6],
    "MMM d, yyyy"
  )}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-500">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 m-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-500">✓</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousWeek}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            ← Previous
          </button>
          <h2 className="text-xl font-semibold">{weekRangeText}</h2>
          <button
            onClick={handleNextWeek}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Court Legend */}
      <div className="bg-gray-50 border-b border-gray-200 p-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Courts:</span>
          {courts.map((court, idx) => (
            <div key={court.id} className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded border-2 ${COURT_COLORS[idx % COURT_COLORS.length]}`}
              ></div>
              <span className="text-sm text-gray-700">{court.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="w-full border-collapse">
            {/* Day Headers */}
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-gray-100 border border-gray-300 p-2 min-w-[80px]">
                  <div className="text-xs font-semibold text-gray-600">Time</div>
                </th>
                {weekDays.map((day) => (
                  <th
                    key={day.toISOString()}
                    className="bg-gray-100 border border-gray-300 p-2 min-w-[140px]"
                  >
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gray-800">
                        {format(day, "EEE")}
                      </div>
                      <div className="text-xs text-gray-600">{format(day, "MMM d")}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Time Slots */}
            <tbody>
              {TIME_SLOTS.map((timeSlot) => (
                <tr key={timeSlot.start}>
                  {/* Time Label */}
                  <td className="sticky left-0 z-10 bg-gray-50 border border-gray-300 p-2 text-center">
                    <div className="text-xs font-medium text-gray-700">
                      {timeSlot.start}
                    </div>
                  </td>

                  {/* Day Cells */}
                  {weekDays.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const slotReservations = getReservationsForSlot(day, timeSlot);
                    const hasConflict = activeReservation
                      ? wouldHaveConflict(dateStr, timeSlot, activeReservation.courtId, activeReservation.id)
                      : false;
                    
                    return (
                      <CalendarTimeSlot
                        key={`${day.toISOString()}-${timeSlot.start}`}
                        date={dateStr}
                        timeSlot={timeSlot}
                        reservations={slotReservations}
                        hasConflict={hasConflict}
                      >
                        {/* Draggable Booking Blocks */}
                        {slotReservations.map((reservation) => (
                          <DraggableBookingBlock
                            key={reservation.id}
                            reservation={reservation}
                            courtColor={getCourtColor(reservation.courtId)}
                          />
                        ))}
                      </CalendarTimeSlot>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

        {/* Empty State */}
        {reservations.length === 0 && (
          <div className="text-center py-12 bg-gray-50">
            <p className="text-gray-600">No bookings for this week</p>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeReservation ? (
          <div className="opacity-90 shadow-2xl">
            <DraggableBookingBlock
              reservation={activeReservation}
              courtColor={getCourtColor(activeReservation.courtId)}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
