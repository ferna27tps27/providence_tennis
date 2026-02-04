"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import BookingCard from "../../../components/dashboard/BookingCard";
import { useAuth } from "../../../lib/auth/auth-context";
import { getMyReservations } from "../../../lib/api/member-api";
import { cancelReservation } from "../../../lib/api/booking-api";
import { Reservation } from "../../../lib/api/booking-api";
import Link from "next/link";
import { motion } from "framer-motion";

export default function BookingsPage() {
  const { user, token } = useAuth();
  const [bookings, setBookings] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past" | "cancelled">("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) return;

    const loadBookings = async () => {
      try {
        setIsLoading(true);
        setError("");
        const reservations = await getMyReservations(token);
        setBookings(reservations);
      } catch (err: any) {
        setError(err.message || "Failed to load bookings");
      } finally {
        setIsLoading(false);
      }
    };

    loadBookings();
  }, [user, token]);

  const handleCancelClick = (id: string) => {
    setConfirmCancelId(id);
    setCancelError(null);
  };

  const handleKeep = () => {
    setConfirmCancelId(null);
    setCancelError(null);
  };

  const handleConfirmCancel = async (id: string) => {
    if (!token || !user) return;
    try {
      setCancellingId(id);
      setCancelError(null);
      await cancelReservation(id, token);
      const reservations = await getMyReservations(token);
      setBookings(reservations);
      setConfirmCancelId(null);
    } catch (err: any) {
      setCancelError(err.message || "Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  const bookingStart = (r: { date: string; timeSlot?: { start?: string } }) =>
    new Date(`${r.date}T${r.timeSlot?.start ?? "00:00"}`);

  const filteredBookings = bookings.filter((booking) => {
    const now = new Date();
    const start = bookingStart(booking);

    if (filter === "upcoming") {
      return start >= now && booking.status === "confirmed";
    }
    if (filter === "past") {
      return start < now && booking.status === "confirmed";
    }
    if (filter === "cancelled") {
      return booking.status === "cancelled";
    }
    return true;
  });

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    return bookingStart(b).getTime() - bookingStart(a).getTime();
  });

  if (!user) return null;

  return (
    <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              <span className="gradient-text">My Bookings</span>
            </h1>
            <p className="text-gray-600">View and manage your court reservations</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-2 border-b border-gray-200">
            {(["all", "upcoming", "past", "cancelled"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                  filter === f
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading bookings...</p>
            </div>
          ) : sortedBookings.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-600 mb-4">
                {filter === "all"
                  ? "No bookings found"
                  : `No ${filter} bookings found`}
              </p>
              <Link href="/dashboard/book" className="btn-primary inline-block">
                Book a Court
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  reservation={booking}
                  onCancelClick={handleCancelClick}
                  onKeep={handleKeep}
                  onConfirmCancel={handleConfirmCancel}
                  isCancelling={cancellingId === booking.id}
                  confirmCancelId={confirmCancelId}
                  cancelError={cancelError}
                />
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
  );
}
