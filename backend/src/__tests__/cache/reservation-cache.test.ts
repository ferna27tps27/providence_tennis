import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ReservationCache } from "../../lib/cache/reservation-cache";

describe("ReservationCache", () => {
  let cache: ReservationCache;

  beforeEach(() => {
    cache = new ReservationCache(100); // 100ms TTL for testing
  });

  afterEach(() => {
    cache.stopCleanup();
    cache.clear();
  });

  describe("get and set", () => {
    it("should store and retrieve values", () => {
      cache.set("test-key", "test-value");
      const value = cache.get("test-key");
      expect(value).toBe("test-value");
    });

    it("should return null for non-existent keys", () => {
      const value = cache.get("non-existent");
      expect(value).toBeNull();
    });

    it("should return null for expired entries", async () => {
      cache.set("test-key", "test-value", 50); // 50ms TTL
      expect(cache.get("test-key")).toBe("test-value");
      
      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 60));
      
      expect(cache.get("test-key")).toBeNull();
    });

    it("should use default TTL when not specified", () => {
      cache.set("test-key", "test-value");
      expect(cache.get("test-key")).toBe("test-value");
    });
  });

  describe("invalidate", () => {
    it("should remove matching entries", () => {
      cache.set("availability:2026-01-24", "data1");
      cache.set("availability:2026-01-25", "data2");
      cache.set("other:key", "data3");
      
      cache.invalidate("availability:.*");
      
      expect(cache.get("availability:2026-01-24")).toBeNull();
      expect(cache.get("availability:2026-01-25")).toBeNull();
      expect(cache.get("other:key")).toBe("data3");
    });

    it("should handle no matches gracefully", () => {
      cache.set("test-key", "test-value");
      cache.invalidate("non-matching:.*");
      expect(cache.get("test-key")).toBe("test-value");
    });
  });

  describe("clear", () => {
    it("should remove all entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      
      cache.clear();
      
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBeNull();
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

  describe("cleanup", () => {
    it("should remove expired entries automatically", async () => {
      cache.set("key1", "value1", 50);
      cache.set("key2", "value2", 200);
      
      // Wait for first entry to expire
      await new Promise((resolve) => setTimeout(resolve, 60));
      
      // Trigger cleanup manually (normally done by interval)
      (cache as any).cleanup();
      
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBe("value2");
    });
  });
});
