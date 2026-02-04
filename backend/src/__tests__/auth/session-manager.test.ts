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
    it("should create a session with correct fields", () => {
      const session = createSession("member123", "test@example.com", "player");
      
      expect(session.memberId).toBe("member123");
      expect(session.email).toBe("test@example.com");
      expect(session.role).toBe("player");
      expect(session.expiresAt).toBeDefined();
      expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it("should set expiration to 7 days from now", () => {
      const session = createSession("member123", "test@example.com", "player");
      const expiresAt = new Date(session.expiresAt);
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 7);
      
      // Allow 1 minute tolerance
      const diff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
      expect(diff).toBeLessThan(60 * 1000);
    });
  });

  describe("createToken", () => {
    it("should create a JWT token from session", () => {
      const session = createSession("member123", "test@example.com", "player");
      const token = createToken(session);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should create different tokens for different sessions", () => {
      const session1 = createSession("member1", "test1@example.com", "player");
      const session2 = createSession("member2", "test2@example.com", "coach");
      
      const token1 = createToken(session1);
      const token2 = createToken(session2);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe("verifyToken", () => {
    it("should verify a valid token", () => {
      const session = createSession("member123", "test@example.com", "player");
      const token = createToken(session);
      const verified = verifyToken(token);
      
      expect(verified).not.toBeNull();
      expect(verified?.memberId).toBe("member123");
      expect(verified?.email).toBe("test@example.com");
      expect(verified?.role).toBe("player");
    });

    it("should return null for invalid token", () => {
      const verified = verifyToken("invalid.token.here");
      
      expect(verified).toBeNull();
    });

    it("should return null for empty token", () => {
      const verified = verifyToken("");
      
      expect(verified).toBeNull();
    });

    it("should return null for malformed token", () => {
      const verified = verifyToken("not.a.valid.jwt.token");
      
      expect(verified).toBeNull();
    });
  });

  describe("getSession", () => {
    it("should retrieve a stored session", () => {
      const session = createSession("member123", "test@example.com", "player");
      const retrieved = getSession("member123");
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.memberId).toBe("member123");
      expect(retrieved?.email).toBe("test@example.com");
    });

    it("should return null for non-existent session", () => {
      const retrieved = getSession("nonexistent");
      
      expect(retrieved).toBeNull();
    });
  });

  describe("removeSession", () => {
    it("should remove a session", () => {
      const session = createSession("member123", "test@example.com", "player");
      expect(getSession("member123")).not.toBeNull();
      
      removeSession("member123");
      expect(getSession("member123")).toBeNull();
    });

    it("should not throw when removing non-existent session", () => {
      expect(() => removeSession("nonexistent")).not.toThrow();
    });
  });
});
