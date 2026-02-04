/**
 * Unit tests for role utilities
 */

import { describe, it, expect } from "vitest";
import {
  isValidRole,
  normalizeRole,
  hasPermission,
  isAdmin,
  isStaff,
  getRoleLevel,
  hasMinimumRole,
  getRoleDisplayName,
  getAssignableRoles,
  VALID_ROLES,
  DEFAULT_ROLE,
  MemberRole,
} from "../../lib/utils/role-utils";

describe("Role Utilities", () => {
  describe("isValidRole", () => {
    it("should validate valid roles", () => {
      expect(isValidRole("player")).toBe(true);
      expect(isValidRole("coach")).toBe(true);
      expect(isValidRole("parent")).toBe(true);
      expect(isValidRole("admin")).toBe(true);
    });

    it("should reject invalid roles", () => {
      expect(isValidRole("invalid")).toBe(false);
      expect(isValidRole("")).toBe(false);
      expect(isValidRole("PLAYER")).toBe(false); // case sensitive
      expect(isValidRole("user")).toBe(false);
    });
  });

  describe("normalizeRole", () => {
    it("should return role if valid", () => {
      expect(normalizeRole("player")).toBe("player");
      expect(normalizeRole("coach")).toBe("coach");
      expect(normalizeRole("parent")).toBe("parent");
      expect(normalizeRole("admin")).toBe("admin");
    });

    it("should default to player for invalid role", () => {
      expect(normalizeRole("invalid")).toBe("player");
      expect(normalizeRole("")).toBe("player");
      expect(normalizeRole(null)).toBe("player");
      expect(normalizeRole(undefined)).toBe("player");
    });
  });

  describe("hasPermission", () => {
    it("should return true if user has required role", () => {
      expect(hasPermission("admin", "admin")).toBe(true);
      expect(hasPermission("coach", "coach")).toBe(true);
      expect(hasPermission("player", "player")).toBe(true);
    });

    it("should return false if user doesn't have required role", () => {
      expect(hasPermission("player", "admin")).toBe(false);
      expect(hasPermission("coach", "admin")).toBe(false);
      expect(hasPermission("parent", "coach")).toBe(false);
    });

    it("should return true if user has one of multiple required roles", () => {
      expect(hasPermission("coach", ["coach", "admin"])).toBe(true);
      expect(hasPermission("admin", ["coach", "admin"])).toBe(true);
      expect(hasPermission("player", ["coach", "admin"])).toBe(false);
    });

    it("should normalize undefined role to player", () => {
      expect(hasPermission(undefined, "player")).toBe(true);
      expect(hasPermission(undefined, "admin")).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("should return true for admin role", () => {
      expect(isAdmin("admin")).toBe(true);
    });

    it("should return false for non-admin roles", () => {
      expect(isAdmin("player")).toBe(false);
      expect(isAdmin("coach")).toBe(false);
      expect(isAdmin("parent")).toBe(false);
      expect(isAdmin(undefined)).toBe(false);
    });
  });

  describe("isStaff", () => {
    it("should return true for coach and admin", () => {
      expect(isStaff("coach")).toBe(true);
      expect(isStaff("admin")).toBe(true);
    });

    it("should return false for player and parent", () => {
      expect(isStaff("player")).toBe(false);
      expect(isStaff("parent")).toBe(false);
      expect(isStaff(undefined)).toBe(false);
    });
  });

  describe("getRoleLevel", () => {
    it("should return correct level for each role", () => {
      expect(getRoleLevel("admin")).toBe(4);
      expect(getRoleLevel("coach")).toBe(3);
      expect(getRoleLevel("parent")).toBe(2);
      expect(getRoleLevel("player")).toBe(1);
      expect(getRoleLevel(undefined)).toBe(1); // undefined normalizes to "player"
    });
  });

  describe("hasMinimumRole", () => {
    it("should return true if user has minimum role or higher", () => {
      expect(hasMinimumRole("admin", "player")).toBe(true);
      expect(hasMinimumRole("admin", "coach")).toBe(true);
      expect(hasMinimumRole("admin", "admin")).toBe(true);
      expect(hasMinimumRole("coach", "player")).toBe(true);
      expect(hasMinimumRole("coach", "coach")).toBe(true);
    });

    it("should return false if user has lower role", () => {
      expect(hasMinimumRole("player", "coach")).toBe(false);
      expect(hasMinimumRole("player", "admin")).toBe(false);
      expect(hasMinimumRole("coach", "admin")).toBe(false);
    });
  });

  describe("getRoleDisplayName", () => {
    it("should return correct display names", () => {
      expect(getRoleDisplayName("admin")).toBe("Administrator");
      expect(getRoleDisplayName("coach")).toBe("Coach");
      expect(getRoleDisplayName("parent")).toBe("Parent");
      expect(getRoleDisplayName("player")).toBe("Player");
      expect(getRoleDisplayName(undefined)).toBe("Player");
    });
  });

  describe("getAssignableRoles", () => {
    it("should return all valid roles", () => {
      const roles = getAssignableRoles();
      expect(roles).toHaveLength(4);
      expect(roles).toContain("player");
      expect(roles).toContain("coach");
      expect(roles).toContain("parent");
      expect(roles).toContain("admin");
    });
  });

  describe("Constants", () => {
    it("should have correct default role", () => {
      expect(DEFAULT_ROLE).toBe("player");
    });

    it("should have all valid roles", () => {
      expect(VALID_ROLES).toHaveLength(4);
      expect(VALID_ROLES).toContain("player");
      expect(VALID_ROLES).toContain("coach");
      expect(VALID_ROLES).toContain("parent");
      expect(VALID_ROLES).toContain("admin");
    });
  });
});
