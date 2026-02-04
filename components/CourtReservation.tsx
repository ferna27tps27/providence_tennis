"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, startOfDay, startOfWeek, isAfter, isSameDay } from "date-fns";
import { ReservationRequest } from "@/types/reservation";
import { useAuth } from "../lib/auth/auth-context";

export interface CourtReservationPrefill {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface CourtReservationProps {
  variant?: "default" | "dashboard";
  prefill?: CourtReservationPrefill;
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  ""
);

const buildApiUrl = (path: string) => (apiBaseUrl ? `${apiBaseUrl}${path}` : path);

interface AvailabilitySlot {
  courtId: string;
  courtName: string;
  courtType: string;
  slots: Array<{
    start: string;
    end: string;
    available: boolean;
  }>;
}

interface AvailabilityData {
  date: string;
  availability: AvailabilitySlot[];
}

interface ApiError {
  error: string;
  code?: string;
}

const defaultReservationData = (prefill?: CourtReservationPrefill): ReservationRequest => ({
  courtId: "",
  date: "",
  timeSlot: { start: "", end: "" },
  customerName: prefill?.customerName ?? "",
  customerEmail: prefill?.customerEmail ?? "",
  customerPhone: prefill?.customerPhone ?? "",
  notes: "",
});

export default function CourtReservation({
  variant = "default",
  prefill,
}: CourtReservationProps) {
  const isDashboard = variant === "dashboard";
  const { user, token } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(() => addDays(new Date(), 1));
  const [selectedCourt, setSelectedCourt] = useState<string>("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"date" | "court" | "details" | "confirmation">("date");
  const [reservationData, setReservationData] = useState<ReservationRequest>(
    () => defaultReservationData(prefill)
  );
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; type: "error" | "warning" | "info" } | null>(null);

  // Sync prefill when it changes (e.g. user loads after mount)
  useEffect(() => {
    if (!prefill) return;
    setReservationData((prev) => ({
      ...prev,
      customerName: (prev.customerName || prefill.customerName) ?? "",
      customerEmail: (prev.customerEmail || prefill.customerEmail) ?? "",
      customerPhone: (prev.customerPhone || prefill.customerPhone) ?? "",
    }));
  }, [prefill?.customerName, prefill?.customerEmail, prefill?.customerPhone]);

  useEffect(() => {
    setReservationData((prev) => ({
      ...prev,
      memberId: user?.id ?? undefined,
    }));
  }, [user?.id]);

  // Generate week dates
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = startOfDay(new Date());
  const futureDates = weekDates.filter((date) => isAfter(startOfDay(date), today));

  useEffect(() => {
    fetchAvailability();
  }, [selectedDate]);

  const fetchAvailability = async () => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await fetch(
        buildApiUrl(`/api/availability?date=${dateStr}`)
      );
      if (response.ok) {
        const data = await response.json();
        setAvailability(data);
      } else {
        const errorData: ApiError = await response.json();
        setError({
          message: errorData.error || "Failed to fetch availability. Please try again.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
      setError({
        message: "Network error. Please check your connection and try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep("court");
    setSelectedCourt("");
    setSelectedTimeSlot(null);
  };

  const handleCourtSelect = (courtId: string) => {
    setSelectedCourt(courtId);
    setSelectedTimeSlot(null);
  };

  const handleTimeSlotSelect = (start: string, end: string) => {
    setSelectedTimeSlot({ start, end });
    setStep("details");
    setReservationData({
      ...reservationData,
      courtId: selectedCourt,
      date: format(selectedDate, "yyyy-MM-dd"),
      timeSlot: { start, end },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(buildApiUrl("/api/reservations"), {
        method: "POST",
        headers,
        body: JSON.stringify(reservationData),
      });

      if (response.ok) {
        const reservation = await response.json();
        setReservationId(reservation.id);
        setStep("confirmation");
        setError(null);
      } else {
        const errorData: ApiError = await response.json();
        
        // Handle specific error codes
        if (response.status === 409) {
          // Conflict - time slot already reserved
          setError({
            message: errorData.error || "This time slot is no longer available. Please select another time.",
            type: "warning",
          });
          // Refresh availability to show updated slots
          await fetchAvailability();
          // Go back to court selection so user can pick a different time
          setStep("court");
        } else if (response.status === 503) {
          // Service unavailable - lock timeout
          setError({
            message: "The system is busy. Please wait a moment and try again.",
            type: "warning",
          });
        } else if (response.status === 404) {
          // Court not found
          setError({
            message: errorData.error || "The selected court is no longer available.",
            type: "error",
          });
          setStep("court");
        } else if (response.status === 400) {
          // Validation error
          setError({
            message: errorData.error || "Please check your information and try again.",
            type: "error",
          });
        } else {
          // Other errors
          setError({
            message: errorData.error || "Failed to create reservation. Please try again.",
            type: "error",
          });
        }
      }
    } catch (error) {
      console.error("Error creating reservation:", error);
      setError({
        message: "Network error. Please check your connection and try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedCourtData = availability?.availability.find(
    (a) => a.courtId === selectedCourt
  );

  const availableSlots = selectedCourtData?.slots.filter((s) => s.available) || [];

  const Wrapper = isDashboard ? "div" : "section";
  const wrapperProps = isDashboard
    ? { className: "max-w-4xl" }
    : { id: "reservations" as const, className: "section-container bg-gray-50" };

  return (
    <Wrapper {...wrapperProps}>
      <div className={isDashboard ? "" : "max-w-7xl mx-auto"}>
        {!isDashboard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Reserve a Court</span>
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary-600 to-primary-400 mx-auto mb-4"></div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Book your court time online. Select a date, court, and time slot to
              get started.
            </p>
          </motion.div>
        )}

        {/* Progress Indicator */}
        <div className="mb-8 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            {["Date", "Court", "Details", "Confirm"].map((label, index) => {
              const steps = ["date", "court", "details", "confirmation"];
              const currentStepIndex = steps.indexOf(step);
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;

              return (
                <div key={label} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                        isCompleted
                          ? "bg-primary-600 text-white"
                          : isActive
                          ? "bg-primary-600 text-white ring-4 ring-primary-200"
                          : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      {isCompleted ? "✓" : index + 1}
                    </div>
                    <span
                      className={`mt-2 text-sm font-medium ${
                        isActive ? "text-primary-600" : "text-gray-500"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {index < 3 && (
                    <div
                      className={`h-1 flex-1 mx-2 transition-all ${
                        isCompleted ? "bg-primary-600" : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Message Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`max-w-4xl mx-auto mb-6 p-4 rounded-lg ${
              error.type === "error"
                ? "bg-red-50 border-2 border-red-200 text-red-800"
                : error.type === "warning"
                ? "bg-yellow-50 border-2 border-yellow-200 text-yellow-800"
                : "bg-blue-50 border-2 border-blue-200 text-blue-800"
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {error.type === "error" ? (
                  <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : error.type === "warning" ? (
                  <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium">{error.message}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Step 1: Date Selection */}
            {step === "date" && (
              <motion.div
                key="date"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="card bg-white"
              >
                <h3 className="text-2xl font-bold mb-6">Select a Date</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
                  {futureDates.map((date) => {
                    const isSelected = isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, new Date());

                    return (
                      <button
                        key={date.toString()}
                        onClick={() => handleDateSelect(date)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-primary-600 bg-primary-50 text-primary-700"
                            : isToday
                            ? "border-primary-300 bg-primary-50/50 hover:border-primary-400"
                            : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          {format(date, "EEE")}
                        </div>
                        <div className="text-xl font-bold">
                          {format(date, "d")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(date, "MMM")}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() =>
                      setSelectedDate(addDays(selectedDate, -7))
                    }
                    className="btn-secondary flex-1"
                  >
                    Previous Week
                  </button>
                  <button
                    onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                    className="btn-secondary flex-1"
                  >
                    Next Week
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Court & Time Selection */}
            {step === "court" && (
              <motion.div
                key="court"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="card bg-white">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">
                      Select Court & Time - {format(selectedDate, "EEEE, MMMM d")}
                    </h3>
                    <button
                      onClick={() => setStep("date")}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Change Date
                    </button>
                  </div>

                  {loading ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
                      <p className="mt-4 text-gray-600">Loading availability...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {availability?.availability.map((court) => {
                        const availableCount = court.slots.filter(
                          (s) => s.available
                        ).length;

                        return (
                          <div
                            key={court.courtId}
                            className={`border-2 rounded-lg p-4 transition-all ${
                              selectedCourt === court.courtId
                                ? "border-primary-600 bg-primary-50"
                                : "border-gray-200 hover:border-primary-300"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="text-lg font-bold">
                                  {court.courtName}
                                </h4>
                                <p className="text-sm text-gray-600 capitalize">
                                  {court.courtType} Court
                                </p>
                              </div>
                              <button
                                onClick={() => handleCourtSelect(court.courtId)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                  selectedCourt === court.courtId
                                    ? "bg-primary-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                              >
                                {selectedCourt === court.courtId
                                  ? "Selected"
                                  : `Select (${availableCount} slots)`}
                              </button>
                            </div>

                            {selectedCourt === court.courtId && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-4 pt-4 border-t border-gray-200"
                              >
                                {court.slots.map((slot) => (
                                  <button
                                    key={slot.start}
                                    onClick={() =>
                                      slot.available &&
                                      handleTimeSlotSelect(slot.start, slot.end)
                                    }
                                    disabled={!slot.available}
                                    className={`p-2 rounded text-sm font-medium transition-all ${
                                      slot.available
                                        ? selectedTimeSlot?.start === slot.start
                                          ? "bg-primary-600 text-white"
                                          : "bg-gray-100 text-gray-700 hover:bg-primary-100 hover:text-primary-700"
                                        : "bg-gray-50 text-gray-400 cursor-not-allowed"
                                    }`}
                                  >
                                    {slot.start}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Customer Details */}
            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="card bg-white"
              >
                <div className="mb-6">
                  <button
                    onClick={() => setStep("court")}
                    className="text-primary-600 hover:text-primary-700 font-medium mb-4 inline-flex items-center"
                  >
                    ← Back to Selection
                  </button>
                  <h3 className="text-2xl font-bold">Your Information</h3>
                  <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Date:</span>{" "}
                      {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Court:</span>{" "}
                      {selectedCourtData?.courtName}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Time:</span>{" "}
                      {selectedTimeSlot?.start} - {selectedTimeSlot?.end}
                    </p>
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Pricing &amp; policy:</span>{" "}
                      Payment and cancellation policy apply. Contact the front desk or check your membership for current rates.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={reservationData.customerName}
                      onChange={(e) =>
                        setReservationData({
                          ...reservationData,
                          customerName: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={reservationData.customerEmail}
                      onChange={(e) =>
                        setReservationData({
                          ...reservationData,
                          customerEmail: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={reservationData.customerPhone}
                      onChange={(e) =>
                        setReservationData({
                          ...reservationData,
                          customerPhone: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="(401) 555-1234"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={reservationData.notes}
                      onChange={(e) =>
                        setReservationData({
                          ...reservationData,
                          notes: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      placeholder="Any special requests or notes..."
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep("court")}
                      className="btn-secondary flex-1"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Processing..." : "Confirm Reservation"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 4: Confirmation */}
            {step === "confirmation" && (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card bg-gradient-to-br from-primary-50 to-white text-center"
              >
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Reservation Confirmed!
                </h3>
                <p className="text-lg text-gray-600 mb-6">
                  Your court reservation has been successfully booked.
                </p>
                <div className="bg-white rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-semibold">Reservation ID:</span>{" "}
                    {reservationId}
                  </p>
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-semibold">Date:</span>{" "}
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-semibold">Court:</span>{" "}
                    {selectedCourtData?.courtName}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Time:</span>{" "}
                    {selectedTimeSlot?.start} - {selectedTimeSlot?.end}
                  </p>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  A confirmation email has been sent to {reservationData.customerEmail}
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {isDashboard && (
                    <>
                      <Link
                        href="/dashboard/bookings"
                        className="btn-primary text-center"
                      >
                        View in My Bookings
                      </Link>
                      <Link
                        href="/dashboard"
                        className="btn-secondary text-center"
                      >
                        Back to Dashboard
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setStep("date");
                      setSelectedDate(new Date());
                      setSelectedCourt("");
                      setSelectedTimeSlot(null);
                      setReservationData(defaultReservationData(prefill));
                      setReservationId(null);
                    }}
                    className={isDashboard ? "btn-secondary text-center" : "btn-primary"}
                  >
                    Make Another Reservation
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Wrapper>
  );
}
