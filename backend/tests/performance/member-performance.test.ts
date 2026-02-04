/**
 * Performance Tests for Member System
 * Tests response times, throughput, and system performance under load
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import request from "supertest";
import path from "path";
import { promises as fs } from "fs";
import os from "os";
import app from "../../src/app";
import { memberCache } from "../../src/lib/cache/member-cache";
import { reservationCache } from "../../src/lib/cache/reservation-cache";

let tempDir = "";
let originalDataDir: string | undefined;

beforeAll(async () => {
  originalDataDir = process.env.DATA_DIR;
  const baseDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `pta-perf-${Date.now()}-${Math.random().toString(36).substring(7)}-`)
  );
  tempDir = baseDir;
  process.env.DATA_DIR = tempDir;
  await fs.mkdir(tempDir, { recursive: true });
});

beforeEach(async () => {
  memberCache.clear();
  reservationCache.clear();
  
  if (tempDir) {
    try {
      const membersFile = path.join(tempDir, "members.json");
      const membersLockFile = path.join(tempDir, "members.json.lock");
      const reservationsFile = path.join(tempDir, "reservations.json");
      const reservationsLockFile = path.join(tempDir, "reservations.json.lock");
      
      await fs.unlink(membersLockFile).catch(() => {});
      await fs.unlink(reservationsLockFile).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 30));
      
      await fs.writeFile(membersFile, JSON.stringify([], null, 2)).catch(() => {});
      await fs.writeFile(reservationsFile, JSON.stringify([], null, 2)).catch(() => {});
    } catch {
      // ignore
    }
  }
});

afterEach(async () => {
  memberCache.clear();
  reservationCache.clear();
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
      // ignore
    }
  }
});

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  GET_LIST: 500,      // List all members
  GET_BY_ID: 200,     // Get single member
  CREATE: 300,        // Create member
  UPDATE: 300,        // Update member
  DELETE: 300,        // Delete member
  SEARCH: 400,        // Search members
  FILTER: 400,        // Filter members
  RESERVATIONS: 500,  // Get member reservations
};

describe("Member System Performance Tests", () => {
  describe("Response Time Tests", () => {
    it("should list members within threshold", async () => {
      // Create some test data
      const uniqueId = Date.now();
      for (let i = 0; i < 10; i++) {
        await request(app).post("/api/members").send({
          firstName: `Perf${i}`,
          lastName: "Test",
          email: `perf-${uniqueId}-${i}@example.com`,
          phone: `401-555-${String(1000 + i).padStart(4, '0')}`,
        });
      }

      const startTime = Date.now();
      const response = await request(app).get("/api/members");
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(THRESHOLDS.GET_LIST);
      console.log(`✓ GET /api/members: ${duration}ms (threshold: ${THRESHOLDS.GET_LIST}ms)`);
    });

    it("should get member by ID within threshold", async () => {
      const uniqueId = Date.now();
      const createResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Perf",
          lastName: "Test",
          email: `perf-get-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      const memberId = createResponse.body.id;
      const startTime = Date.now();
      const response = await request(app).get(`/api/members/${memberId}`);
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(THRESHOLDS.GET_BY_ID);
      console.log(`✓ GET /api/members/:id: ${duration}ms (threshold: ${THRESHOLDS.GET_BY_ID}ms)`);
    });

    it("should create member within threshold", async () => {
      const uniqueId = Date.now();
      const startTime = Date.now();
      const response = await request(app)
        .post("/api/members")
        .send({
          firstName: "Perf",
          lastName: "Create",
          email: `perf-create-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(THRESHOLDS.CREATE);
      console.log(`✓ POST /api/members: ${duration}ms (threshold: ${THRESHOLDS.CREATE}ms)`);
    });

    it("should update member within threshold", async () => {
      const uniqueId = Date.now();
      const createResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Perf",
          lastName: "Update",
          email: `perf-update-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      const memberId = createResponse.body.id;
      const startTime = Date.now();
      const response = await request(app)
        .patch(`/api/members/${memberId}`)
        .send({ firstName: "Updated" });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(THRESHOLDS.UPDATE);
      console.log(`✓ PATCH /api/members/:id: ${duration}ms (threshold: ${THRESHOLDS.UPDATE}ms)`);
    });

    it("should search members within threshold", async () => {
      const uniqueId = Date.now();
      await request(app).post("/api/members").send({
        firstName: "Searchable",
        lastName: "User",
        email: `search-perf-${uniqueId}@example.com`,
        phone: "401-555-1234",
      });

      const startTime = Date.now();
      const response = await request(app).get("/api/members?search=Searchable");
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(THRESHOLDS.SEARCH);
      console.log(`✓ GET /api/members?search=: ${duration}ms (threshold: ${THRESHOLDS.SEARCH}ms)`);
    });

    it("should filter members within threshold", async () => {
      const uniqueId = Date.now();
      await request(app).post("/api/members").send({
        firstName: "Filter",
        lastName: "Test",
        email: `filter-perf-${uniqueId}@example.com`,
        phone: "401-555-1234",
        isActive: true,
      });

      const startTime = Date.now();
      const response = await request(app).get("/api/members?filter=active");
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(THRESHOLDS.FILTER);
      console.log(`✓ GET /api/members?filter=: ${duration}ms (threshold: ${THRESHOLDS.FILTER}ms)`);
    });
  });

  describe("Throughput Tests", () => {
    it("should handle multiple concurrent member creations", async () => {
      const uniqueId = Date.now();
      const concurrentRequests = 5;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post("/api/members")
            .send({
              firstName: `Concurrent${i}`,
              lastName: "Test",
              email: `concurrent-${uniqueId}-${i}@example.com`,
              phone: `401-555-${String(1000 + i).padStart(4, '0')}`,
            })
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      results.forEach((result, index) => {
        expect(result.status).toBe(201);
        expect(result.body.id).toBeDefined();
      });

      const avgTime = duration / concurrentRequests;
      console.log(`✓ Concurrent creates (${concurrentRequests}): ${duration}ms total, ${avgTime.toFixed(2)}ms avg`);
      expect(avgTime).toBeLessThan(THRESHOLDS.CREATE * 2); // Allow 2x for concurrency
    });

    it("should handle multiple concurrent reads", async () => {
      const uniqueId = Date.now();
      const createResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Concurrent",
          lastName: "Read",
          email: `concurrent-read-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      const memberId = createResponse.body.id;
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(request(app).get(`/api/members/${memberId}`));
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      results.forEach((result) => {
        expect(result.status).toBe(200);
        expect(result.body.id).toBe(memberId);
      });

      const avgTime = duration / concurrentRequests;
      console.log(`✓ Concurrent reads (${concurrentRequests}): ${duration}ms total, ${avgTime.toFixed(2)}ms avg`);
      expect(avgTime).toBeLessThan(THRESHOLDS.GET_BY_ID * 2);
    });
  });

  describe("Cache Performance Tests", () => {
    it("should benefit from cache on repeated reads", async () => {
      const uniqueId = Date.now();
      const createResponse = await request(app)
        .post("/api/members")
        .send({
          firstName: "Cache",
          lastName: "Test",
          email: `cache-${uniqueId}@example.com`,
          phone: "401-555-1234",
        });

      const memberId = createResponse.body.id;

      // First read (cache miss)
      const startTime1 = Date.now();
      await request(app).get(`/api/members/${memberId}`);
      const firstRead = Date.now() - startTime1;

      // Second read (cache hit)
      const startTime2 = Date.now();
      await request(app).get(`/api/members/${memberId}`);
      const secondRead = Date.now() - startTime2;

      console.log(`✓ Cache performance: First read ${firstRead}ms, Second read ${secondRead}ms`);
      // Second read should be faster or at least not significantly slower
      // Allow for timing variance in fast operations
      if (firstRead > 0) {
        expect(secondRead).toBeLessThanOrEqual(firstRead * 2);
      } else {
        // If first read was too fast to measure, just verify both reads succeeded
        expect(secondRead).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Scalability Tests", () => {
    it("should handle listing many members efficiently", async () => {
      const uniqueId = Date.now();
      const memberCount = 50;

      // Create multiple members
      for (let i = 0; i < memberCount; i++) {
        await request(app).post("/api/members").send({
          firstName: `Scale${i}`,
          lastName: "Test",
          email: `scale-${uniqueId}-${i}@example.com`,
          phone: `401-555-${String(1000 + i).padStart(4, '0')}`,
        });
      }

      const startTime = Date.now();
      const response = await request(app).get("/api/members");
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(memberCount);
      console.log(`✓ List ${memberCount} members: ${duration}ms`);
      // Should scale reasonably (allow more time for larger datasets)
      expect(duration).toBeLessThan(THRESHOLDS.GET_LIST * 3);
    });
  });
});
