/**
 * Integration tests for member role management (Phase 2)
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import {
  createMember,
  getMember,
  updateMember,
  updateMemberRole,
  getMembersByRole,
  memberHasRole,
} from "../../src/lib/members";
import { memberCache } from "../../src/lib/cache/member-cache";
import {
  MemberValidationError,
} from "../../src/lib/errors/member-errors";
import { normalizeRole } from "../../src/lib/utils/role-utils";

let tempDir = "";
let originalDataDir: string | undefined;

beforeAll(async () => {
  originalDataDir = process.env.DATA_DIR;
  
  const baseDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `pta-role-${Date.now()}-${Math.random().toString(36).substring(7)}-`)
  );
  tempDir = baseDir;
  process.env.DATA_DIR = tempDir;
  await fs.mkdir(tempDir, { recursive: true });
});

beforeEach(async () => {
  memberCache.clear();
  
  if (tempDir) {
    try {
      const membersFile = path.join(tempDir, "members.json");
      const membersLockFile = path.join(tempDir, "members.json.lock");
      await fs.unlink(membersLockFile).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 50));
      await fs.writeFile(membersFile, JSON.stringify([], null, 2)).catch(() => {});
    } catch {
      // ignore errors
    }
  }
});

afterEach(async () => {
  memberCache.clear();
  
  if (!tempDir) return;
  try {
    const membersLockFile = path.join(tempDir, "members.json.lock");
    await fs.unlink(membersLockFile).catch(() => {});
  } catch {
    // ignore cleanup errors
  }
});

afterAll(async () => {
  if (originalDataDir !== undefined) {
    process.env.DATA_DIR = originalDataDir;
  } else {
    delete process.env.DATA_DIR;
  }
  
  if (tempDir) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
});

describe("Member Role Management Integration Tests (Phase 2)", () => {
  describe("Member Creation with Roles", () => {
    it("should create member with default role (player)", async () => {
      const member = await createMember({
        firstName: "Default",
        lastName: "Role",
        email: "default@example.com",
        phone: "401-555-0001",
      });
      
      expect(member.role).toBe("player");
    });

    it("should create member with specified role", async () => {
      const member = await createMember({
        firstName: "Coach",
        lastName: "Smith",
        email: "coach@example.com",
        phone: "401-555-0002",
        role: "coach",
      });
      
      expect(member.role).toBe("coach");
    });

    it("should create member with admin role", async () => {
      const member = await createMember({
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        phone: "401-555-0003",
        role: "admin",
      });
      
      expect(member.role).toBe("admin");
    });

    it("should reject invalid role", async () => {
      await expect(
        createMember({
          firstName: "Invalid",
          lastName: "Role",
          email: "invalid@example.com",
          phone: "401-555-0004",
          role: "invalid" as any,
        })
      ).rejects.toThrow(MemberValidationError);
    });
  });

  describe("Update Member Role", () => {
    let memberId: string;

    beforeEach(async () => {
      const member = await createMember({
        firstName: "Update",
        lastName: "Role",
        email: "updaterole@example.com",
        phone: "401-555-0005",
        role: "player",
      });
      memberId = member.id;
    });

    it("should update member role", async () => {
      const updated = await updateMemberRole(memberId, "coach");
      
      expect(updated.role).toBe("coach");
    });

    it("should update role to admin", async () => {
      const updated = await updateMemberRole(memberId, "admin");
      
      expect(updated.role).toBe("admin");
    });

    it("should reject invalid role update", async () => {
      await expect(
        updateMemberRole(memberId, "invalid" as any)
      ).rejects.toThrow(MemberValidationError);
    });

    it("should update role via general updateMember", async () => {
      const updated = await updateMember(memberId, { role: "parent" });
      
      expect(updated.role).toBe("parent");
    });
  });

  describe("Get Members by Role", () => {
    beforeEach(async () => {
      // Create members with different roles
      await createMember({
        firstName: "Player1",
        lastName: "One",
        email: "player1@example.com",
        phone: "401-555-0010",
        role: "player",
      });
      
      await createMember({
        firstName: "Player2",
        lastName: "Two",
        email: "player2@example.com",
        phone: "401-555-0011",
        role: "player",
      });
      
      await createMember({
        firstName: "Coach1",
        lastName: "One",
        email: "coach1@example.com",
        phone: "401-555-0012",
        role: "coach",
      });
      
      await createMember({
        firstName: "Admin1",
        lastName: "One",
        email: "admin1@example.com",
        phone: "401-555-0013",
        role: "admin",
      });
    });

    it("should get all players", async () => {
      const players = await getMembersByRole("player");
      
      expect(players.length).toBeGreaterThanOrEqual(2);
      players.forEach((p) => {
        expect(normalizeRole(p.role)).toBe("player");
      });
    });

    it("should get all coaches", async () => {
      const coaches = await getMembersByRole("coach");
      
      expect(coaches.length).toBeGreaterThanOrEqual(1);
      coaches.forEach((c) => {
        expect(normalizeRole(c.role)).toBe("coach");
      });
    });

    it("should get all admins", async () => {
      const admins = await getMembersByRole("admin");
      
      expect(admins.length).toBeGreaterThanOrEqual(1);
      admins.forEach((a) => {
        expect(normalizeRole(a.role)).toBe("admin");
      });
    });

    it("should return empty array for role with no members", async () => {
      const parents = await getMembersByRole("parent");
      
      expect(parents).toHaveLength(0);
    });
  });

  describe("Check Member Role", () => {
    let playerId: string;
    let coachId: string;
    let adminId: string;

    beforeEach(async () => {
      const player = await createMember({
        firstName: "Check",
        lastName: "Player",
        email: "checkplayer@example.com",
        phone: "401-555-0020",
        role: "player",
      });
      playerId = player.id;
      
      const coach = await createMember({
        firstName: "Check",
        lastName: "Coach",
        email: "checkcoach@example.com",
        phone: "401-555-0021",
        role: "coach",
      });
      coachId = coach.id;
      
      const admin = await createMember({
        firstName: "Check",
        lastName: "Admin",
        email: "checkadmin@example.com",
        phone: "401-555-0022",
        role: "admin",
      });
      adminId = admin.id;
    });

    it("should return true if member has role", async () => {
      expect(await memberHasRole(playerId, "player")).toBe(true);
      expect(await memberHasRole(coachId, "coach")).toBe(true);
      expect(await memberHasRole(adminId, "admin")).toBe(true);
    });

    it("should return false if member doesn't have role", async () => {
      expect(await memberHasRole(playerId, "admin")).toBe(false);
      expect(await memberHasRole(coachId, "admin")).toBe(false);
      expect(await memberHasRole(adminId, "player")).toBe(false);
    });

    it("should return true if member has one of multiple roles", async () => {
      expect(await memberHasRole(coachId, ["coach", "admin"])).toBe(true);
      expect(await memberHasRole(adminId, ["coach", "admin"])).toBe(true);
      expect(await memberHasRole(playerId, ["coach", "admin"])).toBe(false);
    });
  });

  describe("Role Normalization", () => {
    it("should normalize undefined role to player when creating", async () => {
      const member = await createMember({
        firstName: "No",
        lastName: "Role",
        email: "norole@example.com",
        phone: "401-555-0030",
        // role not specified
      });
      
      expect(member.role).toBe("player");
    });

    it("should handle role in member retrieval", async () => {
      const member = await createMember({
        firstName: "Retrieve",
        lastName: "Role",
        email: "retrieverole@example.com",
        phone: "401-555-0031",
        role: "parent",
      });
      
      const retrieved = await getMember(member.id);
      expect(retrieved.role).toBe("parent");
    });
  });
});
