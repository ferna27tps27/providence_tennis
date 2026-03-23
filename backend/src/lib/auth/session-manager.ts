/**
 * Session management using JWT tokens with optional Prisma-backed persistence.
 */

import { randomUUID } from "crypto";

import { UserRole } from "@prisma/client";
import * as jwt from "jsonwebtoken";

import { Session } from "../../types/auth";
import { getPrismaClient } from "../db/prisma-client";

function getJwtSecret(): string {
  return process.env.JWT_SECRET || "your-secret-key-change-in-production";
}

function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || "7d";
}

function getSessionExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}

function toUserRole(role: string): UserRole {
  switch (role) {
    case "admin":
      return UserRole.ADMIN;
    case "coach":
      return UserRole.COACH;
    case "parent":
      return UserRole.PARENT;
    default:
      return UserRole.PLAYER;
  }
}

function mapSessionRecord(session: {
  id: string;
  userId: string;
  email: string;
  role: UserRole;
  expiresAt: Date;
}): Session {
  return {
    sessionId: session.id,
    memberId: session.userId,
    email: session.email,
    role: session.role.toLowerCase(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

// In-memory fallback for non-DB runtimes.
const activeSessions = new Map<string, Session>();

/**
 * Create a JWT token for a session
 */
export function createToken(session: Session): string {
  const payload = {
    sessionId: session.sessionId,
    memberId: session.memberId,
    email: session.email,
    role: session.role,
    expiresAt: session.expiresAt,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn(),
  } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload & {
      sessionId?: string;
      memberId?: string;
      email?: string;
      role?: string;
      expiresAt?: string;
    };

    if (!decoded.memberId || !decoded.email || !decoded.role) {
      return null;
    }

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }

    const prisma = getPrismaClient();
    if (prisma) {
      if (!decoded.sessionId) {
        return null;
      }

      const session = await prisma.authSession.findUnique({
        where: { id: decoded.sessionId },
      });

      if (!session || session.userId !== decoded.memberId || session.revokedAt) {
        return null;
      }

      if (session.expiresAt.getTime() < Date.now()) {
        return null;
      }

      return mapSessionRecord(session);
    }

    return {
      sessionId: decoded.sessionId,
      memberId: decoded.memberId,
      email: decoded.email,
      role: decoded.role,
      expiresAt:
        decoded.expiresAt ||
        (decoded.exp ? new Date(decoded.exp * 1000).toISOString() : getSessionExpiryDate().toISOString()),
    };
  } catch {
    return null;
  }
}

/**
 * Create a session object and persist it when Prisma runtime is enabled.
 */
export async function createSession(
  memberId: string,
  email: string,
  role: string
): Promise<Session> {
  const expiresAt = getSessionExpiryDate();
  const sessionId = randomUUID();

  const session: Session = {
    sessionId,
    memberId,
    email,
    role,
    expiresAt: expiresAt.toISOString(),
  };

  const prisma = getPrismaClient();
  if (prisma) {
    await prisma.authSession.create({
      data: {
        id: sessionId,
        userId: memberId,
        email,
        role: toUserRole(role),
        expiresAt,
      },
    });
    return session;
  }

  activeSessions.set(memberId, session);
  return session;
}

/**
 * Get the active session for a member.
 */
export async function getSession(memberId: string): Promise<Session | null> {
  const prisma = getPrismaClient();
  if (prisma) {
    const session = await prisma.authSession.findFirst({
      where: {
        userId: memberId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return session ? mapSessionRecord(session) : null;
  }

  return activeSessions.get(memberId) || null;
}

/**
 * Revoke a session (logout). If sessionId is omitted, revoke all sessions for the member.
 */
export async function removeSession(memberId: string, sessionId?: string): Promise<void> {
  const prisma = getPrismaClient();
  if (prisma) {
    await prisma.authSession.updateMany({
      where: {
        userId: memberId,
        revokedAt: null,
        ...(sessionId ? { id: sessionId } : {}),
      },
      data: {
        revokedAt: new Date(),
      },
    });
    return;
  }

  activeSessions.delete(memberId);
}

/**
 * Remove all expired sessions (cleanup).
 */
export async function cleanupExpiredSessions(): Promise<void> {
  const prisma = getPrismaClient();
  if (prisma) {
    await prisma.authSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
    });
    return;
  }

  const now = new Date();
  for (const [memberId, session] of Array.from(activeSessions.entries())) {
    if (new Date(session.expiresAt) < now) {
      activeSessions.delete(memberId);
    }
  }
}

// Run cleanup every hour.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    void cleanupExpiredSessions();
  }, 60 * 60 * 1000);
}
