"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import MembershipStatus from "../../components/dashboard/MembershipStatus";
import BookingCard from "../../components/dashboard/BookingCard";
import PaymentCard from "../../components/dashboard/PaymentCard";
import { useAuth } from "../../lib/auth/auth-context";
import { getMyReservations } from "../../lib/api/member-api";
import { getPayments } from "../../lib/api/payment-api";
import { cancelReservation } from "../../lib/api/booking-api";
import { Reservation } from "../../lib/api/booking-api";
import { Payment } from "../../lib/api/payment-api";
import Link from "next/link";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { user, token, refreshUser } = useAuth();
  const [upcomingBookings, setUpcomingBookings] = useState<Reservation[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError("");

        // Load reservations
        const reservations = await getMyReservations(token);
        const now = new Date();
        const bookingStart = (r: Reservation) =>
          new Date(`${r.date}T${r.timeSlot?.start ?? "00:00"}`);
        const upcoming = reservations
          .filter((r: Reservation) => {
            return bookingStart(r) >= now && r.status === "confirmed";
          })
          .sort((a: Reservation, b: Reservation) => {
            return bookingStart(a).getTime() - bookingStart(b).getTime();
          })
          .slice(0, 3);

        setUpcomingBookings(upcoming);

        // Load payments
        const payments = await getPayments(token, { memberId: user.id });
        const recent = payments
          .sort((a: Payment, b: Payment) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
          .slice(0, 3);

        setRecentPayments(recent);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
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
      const now = new Date();
      const bookingStart = (r: Reservation) =>
        new Date(`${r.date}T${r.timeSlot?.start ?? "00:00"}`);
      const upcoming = reservations
        .filter((r: Reservation) => bookingStart(r) >= now && r.status === "confirmed")
        .sort((a: Reservation, b: Reservation) => bookingStart(a).getTime() - bookingStart(b).getTime())
        .slice(0, 3);
      setUpcomingBookings(upcoming);
      setConfirmCancelId(null);
    } catch (err: any) {
      setCancelError(err.message || "Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
        <div className="space-y-6">
          {/* Welcome Section */}
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user.firstName}! 👋
            </h1>
            <p className="text-gray-600">Here's what's happening with your account</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Upcoming Bookings */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Upcoming Bookings</h2>
                    <Link
                      href="/dashboard/bookings"
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      View All →
                    </Link>
                  </div>
                  {upcomingBookings.length === 0 ? (
                    <div className="card text-center py-12">
                      <p className="text-gray-600 mb-4">No upcoming bookings</p>
                      <Link href="/dashboard/book" className="btn-primary inline-block">
                        Book a Court
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingBookings.map((booking) => (
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

                {/* Recent Payments */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Recent Payments</h2>
                    <Link
                      href="/dashboard/payments"
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      View All →
                    </Link>
                  </div>
                  {recentPayments.length === 0 ? (
                    <div className="card text-center py-12">
                      <p className="text-gray-600">No payment history</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentPayments.map((payment) => (
                        <PaymentCard key={payment.id} payment={payment} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <MembershipStatus
                  memberId={user.id}
                  isActive={true}
                  role={user.role}
                />

                {/* Quick Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card"
                >
                  <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Link
                      href="/dashboard/book"
                      className="block w-full btn-primary text-center"
                    >
                      Book a Court
                    </Link>
                    <Link
                      href="/dashboard/profile"
                      className="block w-full btn-secondary text-center"
                    >
                      Edit Profile
                    </Link>
                    <Link
                      href="/dashboard/bookings"
                      className="block w-full btn-secondary text-center"
                    >
                      View Bookings
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
  );
}
