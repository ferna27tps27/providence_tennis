"use client";

/**
 * Protected Route Wrapper
 * Redirects unauthenticated users to sign in page
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerified?: boolean;
  allowedRoles?: Array<"player" | "coach" | "parent" | "admin">;
}

export default function ProtectedRoute({
  children,
  requireVerified = false,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/signin?redirect=" + encodeURIComponent(window.location.pathname));
        return;
      }

      if (requireVerified && !user?.emailVerified) {
        router.push("/verify-email?email=" + encodeURIComponent(user?.email || ""));
        return;
      }

      if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
        router.push("/dashboard");
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, requireVerified, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireVerified && !user?.emailVerified) {
    return null;
  }

  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
