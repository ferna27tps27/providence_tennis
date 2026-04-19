"use client";

import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import CoachAIWorkspace from "../../../components/dashboard/CoachAIWorkspace";
import ProtectedRoute from "../../../lib/auth/protected-route";

export default function CoachAIPage() {
  return (
    <ProtectedRoute allowedRoles={["coach", "admin", "owner"]}>
      <DashboardLayout>
        <CoachAIWorkspace />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
