/**
 * Session management using JWT tokens
 */

import * as jwt from "jsonwebtoken";
import { Session } from "../../types/auth";

const JWT_SECRET: string = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "7d"; // 7 days default

// In-memory session store (in production, use Redis or database)
const activeSessions = new Map<string, Session>();

/**
 * Create a JWT token for a session
 */
export function createToken(session: Session): string {
  const payload = {
    memberId: session.memberId,
    email: session.email,
    role: session.role,
    expiresAt: session.expiresAt,
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): Session | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }
    
    return {
      memberId: decoded.memberId,
      email: decoded.email,
      role: decoded.role,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Create a session object
 */
export function createSession(
  memberId: string,
  email: string,
  role: string
): Session {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
  
  const session: Session = {
    memberId,
    email,
    role,
    expiresAt: expiresAt.toISOString(),
  };
  
  // Store session in memory
  activeSessions.set(memberId, session);
  
  return session;
}

/**
 * Get session by member ID
 */
export function getSession(memberId: string): Session | null {
  return activeSessions.get(memberId) || null;
}

/**
 * Remove a session (logout)
 */
export function removeSession(memberId: string): void {
  activeSessions.delete(memberId);
}

/**
 * Remove all expired sessions (cleanup)
 */
export function cleanupExpiredSessions(): void {
  const now = new Date();
  
  for (const [memberId, session] of Array.from(activeSessions.entries())) {
    if (new Date(session.expiresAt) < now) {
      activeSessions.delete(memberId);
    }
  }
}

// Run cleanup every hour
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredSessions, 60 * 60 * 1000); // 1 hour
}
