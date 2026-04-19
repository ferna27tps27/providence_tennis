import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import os from "os";
import path from "path";
import { promises as fs } from "fs";

import app from "../../src/app";
import { memberCache } from "../../src/lib/cache/member-cache";
import { reservationCache } from "../../src/lib/cache/reservation-cache";

let tempDir = "";
let originalDataDir: string | undefined;
let originalJwtSecret: string | undefined;
let originalFrontendUrl: string | undefined;

const baseFiles: Record<string, unknown> = {
  "members.json": [],
  "payments.json": [],
  "memberships.json": [],
  "lesson-packages.json": [],
  "courts.json": [
    {
      id: "court-1",
      name: "Court 1",
      type: "hard",
      available: true,
    },
  ],
  "reservations.json": [],
  "private-lessons.json": [],
  "recurring-programs.json": [],
  "program-sessions.json": [],
};

async function resetFiles() {
  const fileNames = Object.keys(baseFiles);

  for (const file of fileNames.map((name) => `${name}.lock`)) {
    await fs.unlink(path.join(tempDir, file)).catch(() => {});
  }

  await new Promise((resolve) => setTimeout(resolve, 25));

  for (const [fileName, contents] of Object.entries(baseFiles)) {
    await fs.writeFile(path.join(tempDir, fileName), JSON.stringify(contents, null, 2)).catch(() => {});
  }
}

async function createUserAndGetToken(
  firstName: string,
  lastName: string,
  email: string,
  role: "admin" | "coach" | "player"
) {
  await request(app).post("/api/auth/signup").send({
    firstName,
    lastName,
    email,
    phone: "401-555-0000",
    password: "TestPass123",
    role,
  });

  const signinResponse = await request(app).post("/api/auth/signin").send({
    email,
    password: "TestPass123",
  });

  return {
    member: signinResponse.body.member,
    token: signinResponse.body.token,
  };
}

async function appendRefundedPayment(memberId: string) {
  const paymentsPath = path.join(tempDir, "payments.json");
  const payments = JSON.parse(await fs.readFile(paymentsPath, "utf8"));

  payments.push({
    id: "refund-seed-1",
    memberId,
    type: "court_booking",
    amount: 8000,
    currency: "usd",
    status: "refunded",
    description: "Refunded Court Booking",
    createdAt: "2026-03-18T12:00:00.000Z",
    lastModified: "2026-03-19T12:00:00.000Z",
    paidAt: "2026-03-18T12:00:00.000Z",
    refundedAt: "2026-03-19T12:00:00.000Z",
    refundAmount: 4000,
  });

  await fs.writeFile(paymentsPath, JSON.stringify(payments, null, 2));
}

beforeAll(async () => {
  originalDataDir = process.env.DATA_DIR;
  originalJwtSecret = process.env.JWT_SECRET;
  originalFrontendUrl = process.env.FRONTEND_URL;

  process.env.JWT_SECRET = "test-secret-key-for-testing-only";
  process.env.FRONTEND_URL = "http://localhost:3009";

  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pta-reports-"));
  process.env.DATA_DIR = tempDir;
  await fs.mkdir(tempDir, { recursive: true });
});

beforeEach(async () => {
  memberCache.clear();
  reservationCache.clear();
  await resetFiles();
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

  if (originalJwtSecret !== undefined) {
    process.env.JWT_SECRET = originalJwtSecret;
  } else {
    delete process.env.JWT_SECRET;
  }

  if (originalFrontendUrl !== undefined) {
    process.env.FRONTEND_URL = originalFrontendUrl;
  } else {
    delete process.env.FRONTEND_URL;
  }

  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

describe("Reports and Finance API Endpoints", () => {
  it("rejects player access to admin finance routes", async () => {
    const { token } = await createUserAndGetToken("Player", "Viewer", "player-viewer@test.com", "player");

    const membershipsResponse = await request(app)
      .get("/api/admin/memberships")
      .set("Authorization", `Bearer ${token}`);

    const overviewResponse = await request(app)
      .get("/api/reports/overview")
      .set("Authorization", `Bearer ${token}`);

    expect(membershipsResponse.status).toBe(403);
    expect(overviewResponse.status).toBe(403);
  });

  it("creates memberships and lesson packages with matching payment records", async () => {
    const { member: admin, token: adminToken } = await createUserAndGetToken(
      "Owner",
      "Admin",
      "owner-admin@test.com",
      "admin"
    );
    const { member: player } = await createUserAndGetToken(
      "Finance",
      "Player",
      "finance-player@test.com",
      "player"
    );
    const { member: coach } = await createUserAndGetToken(
      "Finance",
      "Coach",
      "finance-coach@test.com",
      "coach"
    );

    const membershipResponse = await request(app)
      .post("/api/admin/memberships")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        memberId: player.id,
        planName: "Annual Membership",
        billingPeriod: "yearly",
        price: 12000,
        startsOn: "2026-03-01",
      });

    const packageResponse = await request(app)
      .post("/api/admin/lesson-packages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        memberId: player.id,
        coachId: coach.id,
        packageName: "10 Lesson Pack",
        sessionCountTotal: 10,
        price: 30000,
      });

    expect(membershipResponse.status).toBe(201);
    expect(packageResponse.status).toBe(201);
    expect(membershipResponse.body.memberId).toBe(player.id);
    expect(packageResponse.body.coachId).toBe(coach.id);

    const payments = JSON.parse(await fs.readFile(path.join(tempDir, "payments.json"), "utf8"));
    const paymentTypes = payments.map((payment: any) => payment.type);

    expect(paymentTypes).toContain("membership");
    expect(paymentTypes).toContain("lesson_package");
    expect(admin.id).toBeDefined();
  });

  it("returns owner reporting for memberships, packages, refunds, utilization, and coach load", async () => {
    const { token: adminToken } = await createUserAndGetToken(
      "Reports",
      "Admin",
      "reports-admin@test.com",
      "admin"
    );
    const { member: player } = await createUserAndGetToken(
      "Reports",
      "Player",
      "reports-player@test.com",
      "player"
    );
    const { member: coach, token: coachToken } = await createUserAndGetToken(
      "Reports",
      "Coach",
      "reports-coach@test.com",
      "coach"
    );

    await request(app)
      .post("/api/admin/memberships")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        memberId: player.id,
        planName: "Monthly Membership",
        billingPeriod: "monthly",
        price: 15000,
        startsOn: "2026-03-01",
      });

    await request(app)
      .post("/api/admin/lesson-packages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        memberId: player.id,
        coachId: coach.id,
        packageName: "5 Lesson Package",
        sessionCountTotal: 5,
        price: 25000,
      });

    const lessonResponse = await request(app)
      .post("/api/private-lessons")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({
        courtId: "court-1",
        coachId: coach.id,
        playerId: player.id,
        date: "2026-03-24",
        timeSlot: {
          start: "10:00",
          end: "11:00",
        },
        lessonType: "private",
        price: 9000,
      });

    expect(lessonResponse.status).toBe(201);

    await appendRefundedPayment(player.id);

    const [overviewResponse, refundsResponse, courtUtilizationResponse, coachLoadResponse] = await Promise.all([
      request(app).get("/api/reports/overview").set("Authorization", `Bearer ${adminToken}`),
      request(app).get("/api/reports/refunds").set("Authorization", `Bearer ${adminToken}`),
      request(app).get("/api/reports/court-utilization").set("Authorization", `Bearer ${adminToken}`),
      request(app).get("/api/reports/coach-load").set("Authorization", `Bearer ${coachToken}`),
    ]);

    expect(overviewResponse.status).toBe(200);
    expect(overviewResponse.body.activeMemberships).toBe(1);
    expect(overviewResponse.body.activeLessonPackages).toBe(1);
    expect(overviewResponse.body.revenueByType.some((row: any) => row.type === "membership")).toBe(true);
    expect(overviewResponse.body.revenueByType.some((row: any) => row.type === "lesson_package")).toBe(true);

    expect(refundsResponse.status).toBe(200);
    expect(refundsResponse.body.totalRefunded).toBe(4000);
    expect(refundsResponse.body.refunds).toHaveLength(1);

    expect(courtUtilizationResponse.status).toBe(200);
    expect(courtUtilizationResponse.body[0].courtId).toBe("court-1");
    expect(courtUtilizationResponse.body[0].totalScheduledBlocks).toBe(1);

    expect(coachLoadResponse.status).toBe(200);
    expect(coachLoadResponse.body[0].coachId).toBe(coach.id);
    expect(coachLoadResponse.body[0].totalBlocks).toBe(1);
  });
});
