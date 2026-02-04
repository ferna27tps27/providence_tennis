"use client";

import ProtectedRoute from "../../lib/auth/protected-route";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
