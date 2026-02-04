/**
 * Authentication type definitions
 */

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
  member: {
    id: string;
    memberNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    emailVerified: boolean;
  };
  token: string;
}

export interface Session {
  memberId: string;
  email: string;
  role: string;
  expiresAt: string; // ISO 8601 timestamp
}

export interface EmailVerificationToken {
  email: string;
  token: string;
  expiresAt: string; // ISO 8601 timestamp
  used: boolean;
}

export interface PasswordResetToken {
  email: string;
  token: string;
  expiresAt: string; // ISO 8601 timestamp
  used: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}
