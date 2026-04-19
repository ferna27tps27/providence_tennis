"use client";

import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import ScheduleBoard from "../../../components/dashboard/ScheduleBoard";
import ProtectedRoute from "../../../lib/auth/protected-route";

export default function SchedulePage() {
  return (
    <ProtectedRoute allowedRoles={["coach", "admin", "owner"]}>
      <DashboardLayout>
        <ScheduleBoard />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
