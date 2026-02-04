/**
 * Unit tests for member business logic
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import path from "path";
import { promises as fs } from "fs";
import os from "os";

// Set up temp directory BEFORE importing modules that use DATA_DIR
let tempDir = "";
beforeAll(async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "pta-members-"));
  tempDir = baseDir;
  process.env.DATA_DIR = tempDir;
});

// Now import modules after DATA_DIR is set
import {
  createMember,
  getMember,
  getMemberByEmail,
  updateMember,
  deleteMember,
  listMembers,
  searchMembers,
  validateMemberActive,
} from "../lib/members";
import { MemberRequest } from "../types/member";
import { memberCache } from "../lib/cache/member-cache";
import {
  MemberNotFoundError,
  InvalidMemberStatusError,
  MemberValidationError,
} from "../lib/errors/member-errors";

beforeEach(async () => {
  memberCache.clear();
  
  if (!tempDir) return;
  try {
    await fs.mkdir(tempDir, { recursive: true });
    const membersFile = path.join(tempDir, "members.json");
    const lockFile = path.join(tempDir, "members.json.lock");
    
    // Remove lock file if it exists - wait a bit for any locks to release
    await new Promise(resolve => setTimeout(resolve, 20));
    await fs.unlink(lockFile).catch(() => {});
    
    // Clear members file - write empty array
    await fs.writeFile(membersFile, JSON.stringify([], null, 2));
    
    // Wait a bit longer to ensure file operations complete and lock is released
    await new Promise(resolve => setTimeout(resolve, 50));
  } catch (error) {
    console.error("Error in beforeEach:", error);
  }
});

afterEach(async () => {
  memberCache.clear();
});

describe("Member Business Logic", () => {
  describe("createMember", () => {
    it("should create a new member", async () => {
      const memberData: MemberRequest = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "401-555-1234",
      };

      const member = await createMember(memberData);

      expect(member.id).toBeDefined();
      expect(member.firstName).toBe(memberData.firstName);
      expect(member.lastName).toBe(memberData.lastName);
      expect(member.email).toBe(memberData.email);
      expect(member.phone).toBe(memberData.phone);
      expect(member.isActive).toBe(true);
    });

    it("should trim whitespace from fields", async () => {
      const memberData: MemberRequest = {
        firstName: "  John  ",
        lastName: "  Doe  ",
        email: "john@example.com", // Email is normalized, so don't add spaces
        phone: "  401-555-1234  ",
      };

      const member = await createMember(memberData);

      expect(member.firstName).toBe("John");
      expect(member.lastName).toBe("Doe");
      expect(member.email).toBe("john@example.com");
      expect(member.phone).toBe("401-555-1234");
    });

    it("should set default isActive to true", async () => {
      const memberData: MemberRequest = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        phone: "401-555-0000",
      };

      const member = await createMember(memberData);

      expect(member.isActive).toBe(true);
    });

    it("should respect provided isActive value", async () => {
      const memberData: MemberRequest = {
        firstName: "Inactive",
        lastName: "User",
        email: "inactive@example.com",
        phone: "401-555-0000",
        isActive: false,
      };

      const member = await createMember(memberData);

      expect(member.isActive).toBe(false);
    });

    it("should throw validation error for invalid email", async () => {
      const memberData: MemberRequest = {
        firstName: "Test",
        lastName: "User",
        email: "invalid-email",
        phone: "401-555-0000",
      };

      await expect(createMember(memberData)).rejects.toThrow(
        MemberValidationError
      );
    });

    it("should throw validation error for missing required fields", async () => {
      const invalidData = {
        firstName: "Test",
        // Missing lastName, email, phone
      } as any;

      await expect(createMember(invalidData)).rejects.toThrow(
        MemberValidationError
      );
    });
  });

  describe("getMember", () => {
    it("should return member by ID", async () => {
      const created = await createMember({
        firstName: "Get",
        lastName: "Test",
        email: "get@example.com",
        phone: "401-555-1111",
      });

      const member = await getMember(created.id);

      expect(member.id).toBe(created.id);
      expect(member.firstName).toBe("Get");
    });

    it("should throw MemberNotFoundError for non-existent ID", async () => {
      await expect(getMember("non-existent-id")).rejects.toThrow(
        MemberNotFoundError
      );
    });
  });

  describe("getMemberByEmail", () => {
    it("should return member by email", async () => {
      await createMember({
        firstName: "Email",
        lastName: "Test",
        email: "email@example.com",
        phone: "401-555-2222",
      });

      const member = await getMemberByEmail("email@example.com");

      expect(member).not.toBeNull();
      expect(member?.email).toBe("email@example.com");
    });

    it("should return null for non-existent email", async () => {
      const member = await getMemberByEmail("nonexistent@example.com");
      expect(member).toBeNull();
    });
  });

  describe("updateMember", () => {
    it("should update member fields", async () => {
      const created = await createMember({
        firstName: "Update",
        lastName: "Test",
        email: "update@example.com",
        phone: "401-555-3333",
      });

      const updated = await updateMember(created.id, {
        firstName: "Updated",
        notes: "New notes",
      });

      expect(updated.firstName).toBe("Updated");
      expect(updated.notes).toBe("New notes");
      expect(updated.id).toBe(created.id);
    });

    it("should throw MemberNotFoundError for non-existent member", async () => {
      await expect(
        updateMember("non-existent-id", { firstName: "New Name" })
      ).rejects.toThrow(MemberNotFoundError);
    });

    it("should throw validation error for invalid update data", async () => {
      const member = await createMember({
        firstName: "Valid",
        lastName: "Member",
        email: "valid@example.com",
        phone: "401-555-4444",
      });

      await expect(
        updateMember(member.id, { email: "invalid-email" })
      ).rejects.toThrow(MemberValidationError);
    });
  });

  describe("deleteMember", () => {
    it("should delete member (soft delete)", async () => {
      const member = await createMember({
        firstName: "Delete",
        lastName: "Test",
        email: "delete@example.com",
        phone: "401-555-5555",
      });

      const deleted = await deleteMember(member.id);

      expect(deleted).toBe(true);

      const found = await getMember(member.id);
      expect(found.isActive).toBe(false);
    });

    it("should return false for non-existent member", async () => {
      const deleted = await deleteMember("non-existent-id");
      expect(deleted).toBe(false);
    });
  });

  describe("listMembers", () => {
    it("should return all members", async () => {
      await createMember({
        firstName: "First",
        lastName: "Member",
        email: "first@example.com",
        phone: "401-555-1111",
      });

      await createMember({
        firstName: "Second",
        lastName: "Member",
        email: "second@example.com",
        phone: "401-555-2222",
      });

      const members = await listMembers();

      expect(members.length).toBe(2);
    });

    it("should filter by active status", async () => {
      await createMember({
        firstName: "Active",
        lastName: "Member",
        email: "active@example.com",
        phone: "401-555-1111",
        isActive: true,
      });

      await createMember({
        firstName: "Inactive",
        lastName: "Member",
        email: "inactive@example.com",
        phone: "401-555-2222",
        isActive: false,
      });

      const activeMembers = await listMembers({ status: "active" });
      const inactiveMembers = await listMembers({ status: "inactive" });

      expect(activeMembers.length).toBe(1);
      expect(activeMembers[0]?.isActive).toBe(true);
      expect(inactiveMembers.length).toBe(1);
      expect(inactiveMembers[0]?.isActive).toBe(false);
    });

    it("should filter by search query", async () => {
      await createMember({
        firstName: "Searchable",
        lastName: "User",
        email: "searchable@example.com",
        phone: "401-555-1111",
      });

      await createMember({
        firstName: "Other",
        lastName: "User",
        email: "other@example.com",
        phone: "401-555-2222",
      });

      const results = await listMembers({ search: "Searchable" });

      expect(results.length).toBe(1);
      expect(results[0]?.firstName).toBe("Searchable");
    });
  });

  describe("searchMembers", () => {
    it("should search members by query", async () => {
      await createMember({
        firstName: "Search",
        lastName: "Test",
        email: "search@example.com",
        phone: "401-555-1111",
      });

      const results = await searchMembers("Search");

      expect(results.length).toBe(1);
      expect(results[0]?.firstName).toBe("Search");
    });

    it("should return empty array for no matches", async () => {
      const results = await searchMembers("nonexistent");
      expect(results.length).toBe(0);
    });
  });

  describe("validateMemberActive", () => {
    it("should not throw for active member", async () => {
      const member = await createMember({
        firstName: "Active",
        lastName: "Member",
        email: "active@example.com",
        phone: "401-555-1111",
        isActive: true,
      });

      await expect(validateMemberActive(member.id)).resolves.not.toThrow();
    });

    it("should throw InvalidMemberStatusError for inactive member", async () => {
      const member = await createMember({
        firstName: "Inactive",
        lastName: "Member",
        email: "inactive@example.com",
        phone: "401-555-2222",
        isActive: false,
      });

      await expect(validateMemberActive(member.id)).rejects.toThrow(
        InvalidMemberStatusError
      );
    });

    it("should throw MemberNotFoundError for non-existent member", async () => {
      await expect(validateMemberActive("non-existent-id")).rejects.toThrow(
        MemberNotFoundError
      );
    });
  });
});
