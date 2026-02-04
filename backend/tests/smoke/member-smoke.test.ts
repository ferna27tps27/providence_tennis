/**
 * Smoke Tests for Member System
 * Quick tests to verify basic functionality is working
 * These should run fast and catch critical issues
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
    path.join(os.tmpdir(), `pta-smoke-${Date.now()}-${Math.random().toString(36).substring(7)}-`)
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

describe("Member System Smoke Tests", () => {
  it("should respond to health check (GET /api/members)", async () => {
    const response = await request(app).get("/api/members");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("should create a member", async () => {
    const uniqueId = Date.now();
    const response = await request(app)
      .post("/api/members")
      .send({
        firstName: "Smoke",
        lastName: "Test",
        email: `smoke-${uniqueId}@example.com`,
        phone: "401-555-1234",
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.firstName).toBe("Smoke");
  });

  it("should retrieve a member by ID", async () => {
    const uniqueId = Date.now();
    const createResponse = await request(app)
      .post("/api/members")
      .send({
        firstName: "Retrieve",
        lastName: "Test",
        email: `retrieve-${uniqueId}@example.com`,
        phone: "401-555-1234",
      });

    const memberId = createResponse.body.id;
    const getResponse = await request(app).get(`/api/members/${memberId}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.id).toBe(memberId);
  });

  it("should update a member", async () => {
    const uniqueId = Date.now();
    const createResponse = await request(app)
      .post("/api/members")
      .send({
        firstName: "Update",
        lastName: "Test",
        email: `update-${uniqueId}@example.com`,
        phone: "401-555-1234",
      });

    const memberId = createResponse.body.id;
    const updateResponse = await request(app)
      .patch(`/api/members/${memberId}`)
      .send({ firstName: "Updated" });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.firstName).toBe("Updated");
  });

  it("should filter members by active status", async () => {
    const uniqueId = Date.now();
    await request(app).post("/api/members").send({
      firstName: "Active",
      lastName: "Member",
      email: `active-${uniqueId}@example.com`,
      phone: "401-555-1111",
      isActive: true,
    });

    const response = await request(app).get("/api/members?filter=active");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("should search members", async () => {
    const uniqueId = Date.now();
    await request(app).post("/api/members").send({
      firstName: "Searchable",
      lastName: "User",
      email: `search-${uniqueId}@example.com`,
      phone: "401-555-1234",
    });

    const response = await request(app).get("/api/members?search=Searchable");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("should create member reservation", async () => {
    const uniqueId = Date.now();
    const memberResponse = await request(app)
      .post("/api/members")
      .send({
        firstName: "Reservation",
        lastName: "Test",
        email: `res-${uniqueId}@example.com`,
        phone: "401-555-1234",
      });

    const memberId = memberResponse.body.id;
    const uniqueDate = `2026-08-${String(1 + (uniqueId % 28)).padStart(2, '0')}`;
    const uniqueHour = 10 + Math.floor((uniqueId / 100) % 5);

    const reservationResponse = await request(app)
      .post("/api/reservations")
      .send({
        courtId: "1",
        date: uniqueDate,
        timeSlot: {
          start: `${String(uniqueHour).padStart(2, '0')}:00`,
          end: `${String(uniqueHour + 1).padStart(2, '0')}:00`,
        },
        memberId: memberId,
      });

    expect(reservationResponse.status).toBe(201);
    expect(reservationResponse.body.memberId).toBe(memberId);
  });

  it("should handle error responses correctly", async () => {
    const response = await request(app).get("/api/members/non-existent-id");
    expect(response.status).toBe(404);
    expect(response.body.error).toBeDefined();
    expect(response.body.code).toBe("NOT_FOUND");
  });
});
