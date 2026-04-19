"use client";

import DashboardLayout from "../../../../components/dashboard/DashboardLayout";
import ProtectedRoute from "../../../../lib/auth/protected-route";
import ContactSubmissionsWorkspace from "../../../../components/dashboard/ContactSubmissionsWorkspace";

export default function AdminContactSubmissionsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "owner"]}>
      <DashboardLayout>
        <ContactSubmissionsWorkspace />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
