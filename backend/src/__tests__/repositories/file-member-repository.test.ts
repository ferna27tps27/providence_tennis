/**
 * Unit tests for FileMemberRepository
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import { FileMemberRepository } from "../../lib/repositories/file-member-repository";
import { Member } from "../../types/member";
import { memberCache } from "../../lib/cache/member-cache";
import {
  MemberNotFoundError,
  DuplicateEmailError,
  DuplicateMemberNumberError,
} from "../../lib/errors/member-errors";

let tempDir = "";
let repository: FileMemberRepository;

beforeAll(async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "pta-member-repo-"));
  tempDir = baseDir;
  process.env.DATA_DIR = tempDir;
});

beforeEach(async () => {
  memberCache.clear();
  
  if (!tempDir) return;
  try {
    // Ensure directory exists
    await fs.mkdir(tempDir, { recursive: true });
    
    const membersFile = path.join(tempDir, "members.json");
    const lockFile = path.join(tempDir, "members.json.lock");
    
    // Remove lock file if it exists - wait first for any locks to release
    await new Promise(resolve => setTimeout(resolve, 20));
    await fs.unlink(lockFile).catch(() => {});
    
    // Clear members file - write empty array
    await fs.writeFile(membersFile, JSON.stringify([], null, 2));
    
    // Verify file is empty
    const fileContent = await fs.readFile(membersFile, "utf-8");
    const members = JSON.parse(fileContent);
    if (members.length > 0) {
      // Force clear if not empty
      await fs.writeFile(membersFile, JSON.stringify([], null, 2));
    }
    
    // Wait a bit longer to ensure file operations complete and lock is released
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Create a new repository instance to ensure it picks up the cleared file
    repository = new FileMemberRepository();
  } catch (error) {
    console.error("Error in beforeEach:", error);
  }
});

afterEach(async () => {
  memberCache.clear();
});

describe("FileMemberRepository", () => {
  describe("create", () => {
    it("should create a new member", async () => {
      const memberData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "401-555-1234",
      };

      const member = await repository.create(memberData);

      expect(member.id).toBeDefined();
      expect(member.memberNumber).toMatch(/^MEM-\d{4}$/);
      expect(member.firstName).toBe(memberData.firstName);
      expect(member.lastName).toBe(memberData.lastName);
      expect(member.email).toBe(memberData.email.toLowerCase());
      expect(member.phone).toBe(memberData.phone);
      expect(member.isActive).toBe(true);
      expect(member.createdAt).toBeDefined();
      expect(member.lastModified).toBeDefined();
      expect(member.penaltyCancellations).toBe(0);
      expect(member.unsubscribeEmail).toBe(false);
    });

    it("should auto-generate member number if not provided", async () => {
      const memberData = {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phone: "401-555-5678",
      };

      const member = await repository.create(memberData);

      expect(member.memberNumber).toMatch(/^MEM-0001$/);
    });

    it("should generate sequential member numbers", async () => {
      const member1 = await repository.create({
        firstName: "First",
        lastName: "Member",
        email: "first@example.com",
        phone: "401-555-1111",
      });

      const member2 = await repository.create({
        firstName: "Second",
        lastName: "Member",
        email: "second@example.com",
        phone: "401-555-2222",
      });

      expect(member1.memberNumber).toBe("MEM-0001");
      expect(member2.memberNumber).toBe("MEM-0002");
    });

    it("should use provided member number if given", async () => {
      const memberData = {
        firstName: "Custom",
        lastName: "Number",
        email: "custom@example.com",
        phone: "401-555-9999",
        memberNumber: "CUSTOM-001",
      };

      const member = await repository.create(memberData);

      expect(member.memberNumber).toBe("CUSTOM-001");
    });

    it("should normalize email to lowercase", async () => {
      const memberData = {
        firstName: "Test",
        lastName: "User",
        email: "TEST@EXAMPLE.COM",
        phone: "401-555-0000",
      };

      const member = await repository.create(memberData);

      expect(member.email).toBe("test@example.com");
    });

    it("should throw DuplicateEmailError for duplicate email", async () => {
      const memberData = {
        firstName: "First",
        lastName: "User",
        email: "duplicate@example.com",
        phone: "401-555-1111",
      };

      await repository.create(memberData);

      const duplicateData = {
        ...memberData,
        firstName: "Second",
        phone: "401-555-2222",
      };

      await expect(repository.create(duplicateData)).rejects.toThrow(
        DuplicateEmailError
      );
    });

    it("should throw DuplicateEmailError for case-insensitive duplicate email", async () => {
      const memberData = {
        firstName: "First",
        lastName: "User",
        email: "test@example.com",
        phone: "401-555-1111",
      };

      await repository.create(memberData);

      const duplicateData = {
        ...memberData,
        email: "TEST@EXAMPLE.COM",
        firstName: "Second",
      };

      await expect(repository.create(duplicateData)).rejects.toThrow(
        DuplicateEmailError
      );
    });

    it("should throw DuplicateMemberNumberError for duplicate member number", async () => {
      const memberData1 = {
        firstName: "First",
        lastName: "User",
        email: "first@example.com",
        phone: "401-555-1111",
        memberNumber: "DUPLICATE-001",
      };

      await repository.create(memberData1);

      const memberData2 = {
        firstName: "Second",
        lastName: "User",
        email: "second@example.com",
        phone: "401-555-2222",
        memberNumber: "DUPLICATE-001",
      };

      await expect(repository.create(memberData2)).rejects.toThrow(
        DuplicateMemberNumberError
      );
    });

    it("should set default values for optional fields", async () => {
      const memberData = {
        firstName: "Minimal",
        lastName: "Member",
        email: "minimal@example.com",
        phone: "401-555-0000",
      };

      const member = await repository.create(memberData);

      expect(member.isActive).toBe(true);
      expect(member.penaltyCancellations).toBe(0);
      expect(member.unsubscribeEmail).toBe(false);
    });
  });

  describe("findById", () => {
    it("should return member by ID", async () => {
      const memberData = {
        firstName: "Find",
        lastName: "Test",
        email: "find@example.com",
        phone: "401-555-3333",
      };

      const created = await repository.create(memberData);
      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(memberData.email.toLowerCase());
    });

    it("should return null for non-existent ID", async () => {
      const found = await repository.findById("non-existent-id");
      expect(found).toBeNull();
    });

    it("should cache member by ID", async () => {
      const member = await repository.create({
        firstName: "Cache",
        lastName: "Test",
        email: "cache@example.com",
        phone: "401-555-4444",
      });

      // First call - should read from file
      const found1 = await repository.findById(member.id);
      expect(found1).not.toBeNull();

      // Second call - should use cache
      const found2 = await repository.findById(member.id);
      expect(found2).not.toBeNull();
      expect(found2?.id).toBe(member.id);
    });
  });

  describe("findByEmail", () => {
    it("should return member by email", async () => {
      const memberData = {
        firstName: "Email",
        lastName: "Test",
        email: "email@example.com",
        phone: "401-555-5555",
      };

      await repository.create(memberData);
      const found = await repository.findByEmail("email@example.com");

      expect(found).not.toBeNull();
      expect(found?.email).toBe("email@example.com");
    });

    it("should find member with case-insensitive email", async () => {
      const memberData = {
        firstName: "Case",
        lastName: "Test",
        email: "case@example.com",
        phone: "401-555-6666",
      };

      await repository.create(memberData);
      const found = await repository.findByEmail("CASE@EXAMPLE.COM");

      expect(found).not.toBeNull();
      expect(found?.email).toBe("case@example.com");
    });

    it("should return null for non-existent email", async () => {
      const found = await repository.findByEmail("nonexistent@example.com");
      expect(found).toBeNull();
    });
  });

  describe("findByMemberNumber", () => {
    it("should return member by member number", async () => {
      const memberData = {
        firstName: "Number",
        lastName: "Test",
        email: "number@example.com",
        phone: "401-555-7777",
        memberNumber: "TEST-001",
      };

      await repository.create(memberData);
      const found = await repository.findByMemberNumber("TEST-001");

      expect(found).not.toBeNull();
      expect(found?.memberNumber).toBe("TEST-001");
    });

    it("should return null for non-existent member number", async () => {
      const found = await repository.findByMemberNumber("NON-EXISTENT");
      expect(found).toBeNull();
    });
  });

  describe("search", () => {
    it("should search by first name", async () => {
      await repository.create({
        firstName: "Search",
        lastName: "Test",
        email: "search1@example.com",
        phone: "401-555-8888",
      });

      await repository.create({
        firstName: "Other",
        lastName: "User",
        email: "other@example.com",
        phone: "401-555-9999",
      });

      const results = await repository.search("Search");

      expect(results.length).toBe(1);
      expect(results[0]?.firstName).toBe("Search");
    });

    it("should search by last name", async () => {
      await repository.create({
        firstName: "First",
        lastName: "Searchable",
        email: "first@example.com",
        phone: "401-555-0000",
      });

      const results = await repository.search("Searchable");

      expect(results.length).toBe(1);
      expect(results[0]?.lastName).toBe("Searchable");
    });

    it("should search by email", async () => {
      await repository.create({
        firstName: "Email",
        lastName: "Search",
        email: "emailsearch@example.com",
        phone: "401-555-1111",
      });

      const results = await repository.search("emailsearch");

      expect(results.length).toBe(1);
      expect(results[0]?.email).toBe("emailsearch@example.com");
    });

    it("should search by phone", async () => {
      await repository.create({
        firstName: "Phone",
        lastName: "Search",
        email: "phone@example.com",
        phone: "401-555-2222",
      });

      const results = await repository.search("401-555-2222");

      expect(results.length).toBe(1);
      expect(results[0]?.phone).toBe("401-555-2222");
    });

    it("should search by member number", async () => {
      await repository.create({
        firstName: "Member",
        lastName: "Number",
        email: "member@example.com",
        phone: "401-555-3333",
        memberNumber: "SEARCH-001",
      });

      const results = await repository.search("SEARCH-001");

      expect(results.length).toBe(1);
      expect(results[0]?.memberNumber).toBe("SEARCH-001");
    });

    it("should return empty array for no matches", async () => {
      const results = await repository.search("nonexistent");
      expect(results.length).toBe(0);
    });

    it("should be case-insensitive", async () => {
      await repository.create({
        firstName: "Case",
        lastName: "Insensitive",
        email: "case@example.com",
        phone: "401-555-4444",
      });

      const results = await repository.search("CASE");
      expect(results.length).toBe(1);
    });
  });

  describe("findAll", () => {
    it("should return all members", async () => {
      await repository.create({
        firstName: "First",
        lastName: "Member",
        email: "first@example.com",
        phone: "401-555-1111",
      });

      await repository.create({
        firstName: "Second",
        lastName: "Member",
        email: "second@example.com",
        phone: "401-555-2222",
      });

      const members = await repository.findAll();

      expect(members.length).toBe(2);
    });

    it("should filter by active status", async () => {
      const activeMember = await repository.create({
        firstName: "Active",
        lastName: "Member",
        email: "active@example.com",
        phone: "401-555-1111",
        isActive: true,
      });

      const inactiveMember = await repository.create({
        firstName: "Inactive",
        lastName: "Member",
        email: "inactive@example.com",
        phone: "401-555-2222",
        isActive: false,
      });

      const activeMembers = await repository.findAll({ status: "active" });
      const inactiveMembers = await repository.findAll({ status: "inactive" });

      expect(activeMembers.length).toBe(1);
      expect(activeMembers[0]?.id).toBe(activeMember.id);
      expect(inactiveMembers.length).toBe(1);
      expect(inactiveMembers[0]?.id).toBe(inactiveMember.id);
    });

    it("should filter by search query", async () => {
      await repository.create({
        firstName: "Searchable",
        lastName: "User",
        email: "searchable@example.com",
        phone: "401-555-1111",
      });

      await repository.create({
        firstName: "Other",
        lastName: "User",
        email: "other@example.com",
        phone: "401-555-2222",
      });

      const results = await repository.findAll({ search: "Searchable" });

      expect(results.length).toBe(1);
      expect(results[0]?.firstName).toBe("Searchable");
    });

    it("should combine status and search filters", async () => {
      await repository.create({
        firstName: "Active",
        lastName: "Searchable",
        email: "active1@example.com",
        phone: "401-555-1111",
        isActive: true,
      });

      await repository.create({
        firstName: "Inactive",
        lastName: "Searchable",
        email: "inactive1@example.com",
        phone: "401-555-2222",
        isActive: false,
      });

      const results = await repository.findAll({
        status: "active",
        search: "Searchable",
      });

      expect(results.length).toBe(1);
      expect(results[0]?.isActive).toBe(true);
    });
  });

  describe("update", () => {
    it("should update member fields", async () => {
      const uniqueId = Date.now();
      const created = await repository.create({
        firstName: "Update",
        lastName: "Test",
        email: `update-${uniqueId}@example.com`,
        phone: "401-555-1111",
      });

      const updated = await repository.update(created.id, {
        firstName: "Updated",
        notes: "Updated notes",
      });

      expect(updated.firstName).toBe("Updated");
      expect(updated.notes).toBe("Updated notes");
      expect(updated.id).toBe(created.id);
      expect(updated.lastModified).not.toBe(created.lastModified);
    });

    it("should throw MemberNotFoundError for non-existent member", async () => {
      await expect(
        repository.update("non-existent-id", { firstName: "New Name" })
      ).rejects.toThrow(MemberNotFoundError);
    });

    it("should throw DuplicateEmailError for duplicate email on update", async () => {
      const uniqueId = Date.now();
      const member1 = await repository.create({
        firstName: "First",
        lastName: "User",
        email: `first-${uniqueId}@example.com`,
        phone: "401-555-1111",
      });

      const member2 = await repository.create({
        firstName: "Second",
        lastName: "User",
        email: `second-${uniqueId}@example.com`,
        phone: "401-555-2222",
      });

      await expect(
        repository.update(member2.id, { email: `first-${uniqueId}@example.com` })
      ).rejects.toThrow(DuplicateEmailError);
    });

    it("should throw DuplicateMemberNumberError for duplicate member number on update", async () => {
      const uniqueId = Date.now();
      const member1 = await repository.create({
        firstName: "First",
        lastName: "User",
        email: `first-${uniqueId}@example.com`,
        phone: "401-555-1111",
        memberNumber: `DUPLICATE-${uniqueId}`,
      });

      const member2 = await repository.create({
        firstName: "Second",
        lastName: "User",
        email: `second-${uniqueId}@example.com`,
        phone: "401-555-2222",
      });

      await expect(
        repository.update(member2.id, { memberNumber: `DUPLICATE-${uniqueId}` })
      ).rejects.toThrow(DuplicateMemberNumberError);
    });

    it("should normalize email on update", async () => {
      const uniqueId = Date.now();
      const member = await repository.create({
        firstName: "Email",
        lastName: "Update",
        email: `original-${uniqueId}@example.com`,
        phone: "401-555-1111",
      });

      const updated = await repository.update(member.id, {
        email: `UPDATED-${uniqueId}@EXAMPLE.COM`,
      });

      expect(updated.email).toBe(`updated-${uniqueId}@example.com`);
    });
  });

  describe("delete", () => {
    it("should soft delete member (set isActive to false)", async () => {
      const uniqueId = Date.now();
      const member = await repository.create({
        firstName: "Delete",
        lastName: "Test",
        email: `delete-${uniqueId}@example.com`,
        phone: "401-555-1111",
        isActive: true,
      });

      const deleted = await repository.delete(member.id);

      expect(deleted).toBe(true);

      const found = await repository.findById(member.id);
      expect(found).not.toBeNull();
      expect(found?.isActive).toBe(false);
    });

    it("should return false for non-existent member", async () => {
      const deleted = await repository.delete("non-existent-id");
      expect(deleted).toBe(false);
    });

    it("should update lastModified on delete", async () => {
      const uniqueId = Date.now();
      const member = await repository.create({
        firstName: "Modified",
        lastName: "Test",
        email: `modified-${uniqueId}@example.com`,
        phone: "401-555-1111",
      });

      const originalModified = member.lastModified;
      
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await repository.delete(member.id);

      const found = await repository.findById(member.id);
      expect(found?.lastModified).not.toBe(originalModified);
    });
  });
});
