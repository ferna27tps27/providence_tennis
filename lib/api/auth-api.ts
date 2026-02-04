/**
 * Auth API client functions
 * Handles all authentication-related API calls
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export interface SignUpRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role?: "player" | "coach" | "parent" | "admin";
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    emailVerified: boolean;
    role?: "player" | "coach" | "parent" | "admin";
  };
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ApiError {
  error: string;
  code?: string;
}

/**
 * Sign up a new member
 */
export async function signUp(data: SignUpRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to sign up");
  }

  return response.json();
}

/**
 * Sign in an existing member
 */
export async function signIn(data: SignInRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to sign in");
  }

  return response.json();
}

/**
 * Get current authenticated member
 */
export async function getCurrentUser(token: string): Promise<AuthResponse["member"]> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to get current user");
  }

  const data = await response.json();
  return (data.member ?? data) as AuthResponse["member"];
}

/**
 * Sign out (logout)
 */
export async function signOut(token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    // Don't throw error on logout failure - just log it
    console.warn("Logout request failed:", await response.json());
  }
}

/**
 * Verify email address
 */
export async function verifyEmail(data: VerifyEmailRequest): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-email/${data.token}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to verify email");
  }

  return response.json();
}

/**
 * Request password reset
 */
export async function forgotPassword(data: ForgotPasswordRequest): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to request password reset");
  }

  return response.json();
}

/**
 * Reset password with token
 */
export async function resetPassword(data: ResetPasswordRequest): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to reset password");
  }

  return response.json();
}
