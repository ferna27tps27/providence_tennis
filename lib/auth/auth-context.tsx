"use client";

/**
 * Auth Context Provider
 * Manages authentication state across the application
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { signIn, signUp, signOut, getCurrentUser, AuthResponse } from "../api/auth-api";

interface AuthContextType {
  user: AuthResponse["member"] | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role?: "player" | "coach" | "parent" | "admin";
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "pta_auth_token";
const USER_KEY = "pta_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponse["member"] | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          // Check if storedUser is valid JSON before parsing
          try {
            const parsedUser = JSON.parse(storedUser);
            setToken(storedToken);
            setUser(parsedUser);
          } catch (parseError) {
            // Invalid JSON, clear corrupted data
            console.error("Invalid user data in localStorage:", parseError);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setToken(null);
            setUser(null);
            setIsLoading(false);
            return;
          }

          // Verify token is still valid by fetching current user
          try {
            const currentUser = await getCurrentUser(storedToken);
            setUser(currentUser);
            localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
          } catch (error) {
            // Token is invalid, clear auth state
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Error loading auth state:", error);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    try {
      const response = await signIn({ email, password });
      setToken(response.token);
      setUser(response.member);
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.member));
    } catch (error) {
      throw error;
    }
  }, []);

  const handleSignUp = useCallback(
    async (data: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      password: string;
      role?: "player" | "coach" | "parent" | "admin";
    }) => {
      try {
        const response = await signUp(data);
        setToken(response.token);
        setUser(response.member);
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.member));
      } catch (error) {
        throw error;
      }
    },
    []
  );

  const handleLogout = useCallback(async () => {
    try {
      if (token) {
        await signOut(token);
      }
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const currentUser = await getCurrentUser(token);
      setUser(currentUser);
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    } catch (error) {
      console.error("Error refreshing user:", error);
      // If refresh fails, logout user
      handleLogout();
    }
  }, [token, handleLogout]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    signIn: handleSignIn,
    signUp: handleSignUp,
    logout: handleLogout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
