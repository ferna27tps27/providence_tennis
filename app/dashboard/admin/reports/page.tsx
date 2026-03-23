"use client";

import DashboardLayout from "../../../../components/dashboard/DashboardLayout";
import ReportsWorkspace from "../../../../components/dashboard/ReportsWorkspace";
import ProtectedRoute from "../../../../lib/auth/protected-route";

export default function AdminReportsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "owner"]}>
      <DashboardLayout>
        <ReportsWorkspace />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
