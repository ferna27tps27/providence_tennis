/**
 * Unit tests for session management
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createSession,
  createToken,
  verifyToken,
  getSession,
  removeSession,
} from "../../lib/auth/session-manager";

describe("Session Manager", () => {
  beforeEach(() => {
    // Clear any existing sessions (if we had a way to do this)
    // For now, we'll just test with fresh sessions
  });

  describe("createSession", () => {
    it("should create a session with correct fields", async () => {
      const session = await createSession("member123", "test@example.com", "player");
      
      expect(session.memberId).toBe("member123");
      expect(session.sessionId).toBeDefined();
      expect(session.email).toBe("test@example.com");
      expect(session.role).toBe("player");
      expect(session.expiresAt).toBeDefined();
      expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it("should set expiration to 7 days from now", async () => {
      const session = await createSession("member123", "test@example.com", "player");
      const expiresAt = new Date(session.expiresAt);
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 7);
      
      // Allow 1 minute tolerance
      const diff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
      expect(diff).toBeLessThan(60 * 1000);
    });
  });

  describe("createToken", () => {
    it("should create a JWT token from session", async () => {
      const session = await createSession("member123", "test@example.com", "player");
      const token = createToken(session);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should create different tokens for different sessions", async () => {
      const session1 = await createSession("member1", "test1@example.com", "player");
      const session2 = await createSession("member2", "test2@example.com", "coach");
      
      const token1 = createToken(session1);
      const token2 = createToken(session2);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe("verifyToken", () => {
    it("should verify a valid token", async () => {
      const session = await createSession("member123", "test@example.com", "player");
      const token = createToken(session);
      const verified = await verifyToken(token);
      
      expect(verified).not.toBeNull();
      expect(verified?.sessionId).toBe(session.sessionId);
      expect(verified?.memberId).toBe("member123");
      expect(verified?.email).toBe("test@example.com");
      expect(verified?.role).toBe("player");
    });

    it("should return null for invalid token", async () => {
      const verified = await verifyToken("invalid.token.here");
      
      expect(verified).toBeNull();
    });

    it("should return null for empty token", async () => {
      const verified = await verifyToken("");
      
      expect(verified).toBeNull();
    });

    it("should return null for malformed token", async () => {
      const verified = await verifyToken("not.a.valid.jwt.token");
      
      expect(verified).toBeNull();
    });
  });

  describe("getSession", () => {
    it("should retrieve a stored session", async () => {
      const session = await createSession("member123", "test@example.com", "player");
      const retrieved = await getSession("member123");
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.sessionId).toBe(session.sessionId);
      expect(retrieved?.memberId).toBe("member123");
      expect(retrieved?.email).toBe("test@example.com");
    });

    it("should return null for non-existent session", async () => {
      const retrieved = await getSession("nonexistent");
      
      expect(retrieved).toBeNull();
    });
  });

  describe("removeSession", () => {
    it("should remove a session", async () => {
      const session = await createSession("member123", "test@example.com", "player");
      expect(await getSession("member123")).not.toBeNull();
      
      await removeSession("member123", session.sessionId);
      expect(await getSession("member123")).toBeNull();
    });

    it("should not throw when removing non-existent session", async () => {
      await expect(removeSession("nonexistent")).resolves.toBeUndefined();
    });
  });
});
