"use client";

/**
 * Auth Hooks
 * Convenience hooks for accessing auth state
 */

import { useAuth } from "./auth-context";

/**
 * Hook to get current authenticated user
 */
export function useSession() {
  const { user, isLoading, isAuthenticated } = useAuth();
  return { user, isLoading, isAuthenticated };
}

/**
 * Hook to check if user has a specific role
 */
export function useRole() {
  const { user } = useAuth();
  return {
    role: user?.role || "player",
    isAdmin: user?.role === "admin",
    isCoach: user?.role === "coach",
    isParent: user?.role === "parent",
    isPlayer: user?.role === "player" || !user?.role,
  };
}

/**
 * Hook to check if user email is verified
 */
export function useEmailVerification() {
  const { user } = useAuth();
  return {
    isVerified: user?.emailVerified || false,
    needsVerification: !user?.emailVerified,
  };
}
