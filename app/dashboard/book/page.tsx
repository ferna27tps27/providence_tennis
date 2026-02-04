"use client";

import { useAuth } from "../../../lib/auth/auth-context";
import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import CourtReservation from "../../../components/CourtReservation";

export default function DashboardBookPage() {
  const { user } = useAuth();

  const prefill = user
    ? {
        customerName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
        customerEmail: user.email || undefined,
        customerPhone: user.phone || undefined,
      }
    : undefined;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Book a Court</span>
          </h1>
          <p className="text-gray-600">
            Select a date, court, and time to reserve. Your info is pre-filled from your profile.
          </p>
        </div>
        <CourtReservation
          variant="dashboard"
          prefill={prefill}
        />
      </div>
    </DashboardLayout>
  );
}
