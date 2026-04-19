/**
 * Integration tests for summer camp registration payment tracking
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import os from "os";
import path from "path";
import { promises as fs } from "fs";

import {
  createSummerCampRegistration,
  updateSummerCampRegistrationPayment,
  listSummerCampRegistrations,
} from "../../src/lib/summer-camp-registrations";

let tempDir = "";
let originalDataDir: string | undefined;

beforeAll(async () => {
  originalDataDir = process.env.DATA_DIR;

  tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `pta-summer-camp-${Date.now()}-${Math.random().toString(36).slice(2)}-`)
  );
  process.env.DATA_DIR = tempDir;
});

beforeEach(async () => {
  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(path.join(tempDir, "summer-camp-registrations.json"), JSON.stringify([], null, 2));
  await fs.unlink(path.join(tempDir, "summer-camp-registrations.json.lock")).catch(() => {});
});

afterAll(async () => {
  if (originalDataDir !== undefined) {
    process.env.DATA_DIR = originalDataDir;
  } else {
    delete process.env.DATA_DIR;
  }

  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

describe("Summer camp registration payment tracking", () => {
  it("creates a registration and persists payment details after confirmation", async () => {
    const registration = await createSummerCampRegistration({
      guardianName: "Test Guardian",
      guardianEmail: "guardian@example.com",
      guardianPhone: "401-555-1212",
      playerName: "Jordan Ponce",
      playerAge: 8,
      skillLevel: "intermediate",
      track: "full_day",
      sessionPreference: "full_day",
      preferredWeeks: ["Week 1 · June 15-19"],
      contactPreference: "email",
      depositAcknowledged: true,
    });

    const updated = await updateSummerCampRegistrationPayment(registration.id, {
      paymentStatus: "paid",
      paymentId: "payment_123",
      paymentIntentId: "pi_123",
      paymentAmount: 5000,
      paidAt: "2026-04-19T12:00:00.000Z",
    });

    expect(updated.paymentStatus).toBe("paid");
    expect(updated.paymentId).toBe("payment_123");
    expect(updated.paymentIntentId).toBe("pi_123");
    expect(updated.paymentAmount).toBe(5000);
    expect(updated.paidAt).toBe("2026-04-19T12:00:00.000Z");

    const registrations = await listSummerCampRegistrations();
    expect(registrations).toHaveLength(1);
    expect(registrations[0].paymentStatus).toBe("paid");
    expect(registrations[0].paymentIntentId).toBe("pi_123");
  });
});
