/**
 * Unit tests for MemberCache
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemberCache } from "../../lib/cache/member-cache";

describe("MemberCache", () => {
  let cache: MemberCache;

  beforeEach(() => {
    cache = new MemberCache(1000); // 1 second TTL for testing
  });

  afterEach(() => {
    cache.stopCleanup();
    cache.clear();
  });

  describe("get and set", () => {
    it("should store and retrieve values", () => {
      cache.set("test-key", "test-value");
      expect(cache.get("test-key")).toBe("test-value");
    });

    it("should return null for non-existent keys", () => {
      expect(cache.get("non-existent")).toBeNull();
    });

    it("should return null for expired entries", async () => {
      cache.set("expired-key", "value", 100); // 100ms TTL
      expect(cache.get("expired-key")).toBe("value");
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get("expired-key")).toBeNull();
    });

    it("should handle different data types", () => {
      cache.set("string", "test");
      cache.set("number", 42);
      cache.set("object", { key: "value" });
      cache.set("array", [1, 2, 3]);

      expect(cache.get("string")).toBe("test");
      expect(cache.get("number")).toBe(42);
      expect(cache.get("object")).toEqual({ key: "value" });
      expect(cache.get("array")).toEqual([1, 2, 3]);
    });
  });

  describe("invalidate", () => {
    it("should invalidate entries matching pattern", () => {
      cache.set("member:1", { id: "1" });
      cache.set("member:2", { id: "2" });
      cache.set("member:email:test@example.com", { email: "test@example.com" });
      cache.set("other:key", "value");

      cache.invalidate("member:.*");

      expect(cache.get("member:1")).toBeNull();
      expect(cache.get("member:2")).toBeNull();
      expect(cache.get("member:email:test@example.com")).toBeNull();
      expect(cache.get("other:key")).toBe("value"); // Should not be invalidated
    });

    it("should invalidate specific key pattern", () => {
      cache.set("member:1", { id: "1" });
      cache.set("member:2", { id: "2" });
      cache.set("member:email:test@example.com", { email: "test@example.com" });

      cache.invalidate("member:email:.*");

      expect(cache.get("member:1")).not.toBeNull();
      expect(cache.get("member:2")).not.toBeNull();
      expect(cache.get("member:email:test@example.com")).toBeNull();
    });
  });

  describe("clear", () => {
    it("should clear all entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      cache.clear();

      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBeNull();
      expect(cache.get("key3")).toBeNull();
    });
  });

  describe("getStats", () => {
    it("should return cache statistics", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.keys).toContain("key1");
      expect(stats.keys).toContain("key2");
    });
  });
});
