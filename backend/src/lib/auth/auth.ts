/**
 * Authentication business logic
 */

import { SignUpRequest, SignInRequest, AuthResponse } from "../../types/auth";
import {
  createMember,
  getMemberByEmail,
  updateMember,
  getMember,
} from "../members";
import { hashPassword, comparePassword, validatePasswordStrength } from "./password-utils";
import { createSession, createToken } from "./session-manager";
import { createVerificationToken, verifyToken as verifyEmailToken } from "./email-verification";
import { createResetToken, verifyResetToken } from "./password-reset";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "./email-service";
import {
  AuthenticationError,
  EmailAlreadyExistsError,
  InvalidVerificationTokenError,
  EmailNotVerifiedError,
  InvalidResetTokenError,
} from "../errors/auth-errors";
import { MemberNotFoundError } from "../errors/member-errors";
import { normalizeEmail } from "../utils/member-validation";

/**
 * Sign up a new member
 */
export async function signUp(data: SignUpRequest): Promise<{
  member: any;
  verificationToken: string;
}> {
  // Normalize email
  const email = normalizeEmail(data.email);
  
  // Check if email already exists
  const existingMember = await getMemberByEmail(email);
  if (existingMember) {
    throw new EmailAlreadyExistsError(`Email ${email} is already registered`);
  }
  
  // Validate password strength
  const passwordValidation = validatePasswordStrength(data.password);
  if (!passwordValidation.valid) {
    throw new AuthenticationError(
      `Password validation failed: ${passwordValidation.errors.join(", ")}`
    );
  }
  
  // Hash password
  const passwordHash = await hashPassword(data.password);
  
  // Create member (without password in the request, we'll add it separately)
  const member = await createMember({
    firstName: data.firstName,
    lastName: data.lastName,
    email: email,
    phone: data.phone,
    role: data.role || "player",
  });
  
  // Update member with password hash, email verification status, and role
  // Email verification is disabled - automatically mark as verified
  const updatedMember = await updateMember(member.id, {
    passwordHash,
    emailVerified: true, // Auto-verify email (email verification disabled)
    role: data.role || "player",
  } as any);
  
  // Email verification is disabled - skip sending verification email
  // (Keeping code commented for future use if needed)
  // const verificationToken = createVerificationToken(email);
  // await sendVerificationEmail(
  //   email,
  //   `${data.firstName} ${data.lastName}`,
  //   verificationToken
  // );
  
  // Send welcome email (optional - can be disabled if not using email service)
  // await sendWelcomeEmail(email, `${data.firstName} ${data.lastName}`);
  
  // Get the updated member to ensure we have the role
  const finalMember = await getMember(updatedMember.id);
  
  return {
    member: {
      id: finalMember.id,
      memberNumber: finalMember.memberNumber,
      firstName: finalMember.firstName,
      lastName: finalMember.lastName,
      email: finalMember.email,
      role: (finalMember as any).role || data.role || "player",
      emailVerified: true, // Always true since verification is disabled
    },
    verificationToken: "", // Not used when email verification is disabled
  };
}

/**
 * Sign in with email and password
 */
export async function signIn(data: SignInRequest): Promise<AuthResponse> {
  // Normalize email
  const email = normalizeEmail(data.email);
  
  // Find member by email
  const member = await getMemberByEmail(email);
  if (!member) {
    throw new AuthenticationError("Invalid email or password");
  }
  
  // Check if member is active
  if (!member.isActive) {
    throw new AuthenticationError("Account is inactive");
  }
  
  // Check if password hash exists
  if (!member.passwordHash) {
    throw new AuthenticationError("Account not set up. Please set a password.");
  }
  
  // Verify password
  const passwordValid = await comparePassword(data.password, member.passwordHash);
  if (!passwordValid) {
    throw new AuthenticationError("Invalid email or password");
  }
  
  // Check if email is verified (optional - can be made required later)
  // For now, we'll allow login but might restrict certain features
  
  // Create session
  const role = (member as any).role || "player";
  const session = createSession(member.id, member.email, role);
  
  // Create token
  const token = createToken(session);
  
  return {
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      role: role,
      emailVerified: member.emailVerified || false,
    },
    token,
  };
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
  const result = verifyEmailToken(token);
  
  if (!result.valid) {
    throw new InvalidVerificationTokenError("Invalid or expired verification token");
  }
  
  // Find member by email
  const member = await getMemberByEmail(result.email);
  if (!member) {
    throw new MemberNotFoundError("Member not found");
  }
  
  // Update member to mark email as verified
  await updateMember(member.id, {
    emailVerified: true,
  });
  
  return {
    success: true,
    message: "Email verified successfully",
  };
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  // Normalize email
  const normalizedEmail = normalizeEmail(email);
  
  // Find member by email
  const member = await getMemberByEmail(normalizedEmail);
  
  // Don't reveal if email exists or not (security best practice)
  // Always return success message
  if (member) {
    // Create reset token
    const resetToken = createResetToken(normalizedEmail);
    
    // Send reset email
    await sendPasswordResetEmail(
      normalizedEmail,
      `${member.firstName} ${member.lastName}`,
      resetToken
    );
  }
  
  return {
    success: true,
    message: "If an account exists with this email, a password reset link has been sent",
  };
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  // Verify reset token
  const result = verifyResetToken(token);
  
  if (!result.valid) {
    throw new InvalidResetTokenError("Invalid or expired reset token");
  }
  
  // Validate password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    throw new AuthenticationError(
      `Password validation failed: ${passwordValidation.errors.join(", ")}`
    );
  }
  
  // Find member by email
  const member = await getMemberByEmail(result.email);
  if (!member) {
    throw new MemberNotFoundError("Member not found");
  }
  
  // Hash new password
  const passwordHash = await hashPassword(newPassword);
  
  // Update member password
  await updateMember(member.id, {
    passwordHash,
  });
  
  return {
    success: true,
    message: "Password reset successfully",
  };
}

/**
 * Get current authenticated member
 */
export async function getCurrentMember(memberId: string): Promise<any> {
  const member = await getMember(memberId);
  
  return {
    id: member.id,
    memberNumber: member.memberNumber,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
    role: (member as any).role || "player",
    emailVerified: member.emailVerified || false,
    isActive: member.isActive,
  };
}
