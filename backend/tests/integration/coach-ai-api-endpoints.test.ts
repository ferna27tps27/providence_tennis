import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import path from "path";
import { promises as fs } from "fs";
import os from "os";

import app from "../../src/app";
import { memberCache } from "../../src/lib/cache/member-cache";
import { reservationCache } from "../../src/lib/cache/reservation-cache";

let tempDir = "";
let originalDataDir: string | undefined;
let originalJwtSecret: string | undefined;
let originalFrontendUrl: string | undefined;
let originalGoogleApiKey: string | undefined;

async function resetFiles() {
  const files = [
    "members.json",
    "journal-entries.json",
    "training-plans.json",
  ];

  const lockFiles = files.map((file) => `${file}.lock`);

  for (const file of lockFiles) {
    await fs.unlink(path.join(tempDir, file)).catch(() => {});
  }

  await new Promise((resolve) => setTimeout(resolve, 25));

  for (const file of files) {
    await fs.writeFile(path.join(tempDir, file), JSON.stringify([], null, 2)).catch(() => {});
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

async function createJournalEntry(token: string, playerId: string, summary: string, areasWorkedOn: string[]) {
  return request(app)
    .post("/api/journal/entries")
    .set("Authorization", `Bearer ${token}`)
    .send({
      playerId,
      sessionDate: "2026-03-20",
      summary,
      areasWorkedOn,
      pointersForNextSession: "Keep building consistency.",
    });
}

beforeAll(async () => {
  originalDataDir = process.env.DATA_DIR;
  originalJwtSecret = process.env.JWT_SECRET;
  originalFrontendUrl = process.env.FRONTEND_URL;
  originalGoogleApiKey = process.env.GOOGLE_API_KEY;

  process.env.JWT_SECRET = "test-secret-key-for-testing-only";
  process.env.FRONTEND_URL = "http://localhost:3009";
  delete process.env.GOOGLE_API_KEY;

  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pta-coach-ai-"));
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

  if (originalGoogleApiKey !== undefined) {
    process.env.GOOGLE_API_KEY = originalGoogleApiKey;
  } else {
    delete process.env.GOOGLE_API_KEY;
  }

  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

describe("Coach AI API Endpoints", () => {
  it("requires authentication for player summary", async () => {
    const response = await request(app).post("/api/coach-ai/player-summary").send({
      playerId: "player-1",
    });

    expect(response.status).toBe(401);
  });

  it("rejects player access to coach AI endpoints", async () => {
    const { member: player, token } = await createUserAndGetToken(
      "Player",
      "Access",
      "player-access@test.com",
      "player"
    );

    const response = await request(app)
      .post("/api/coach-ai/player-summary")
      .set("Authorization", `Bearer ${token}`)
      .send({ playerId: player.id });

    expect(response.status).toBe(403);
  });

  it("supports coach chat for the selected player", async () => {
    const { member: player } = await createUserAndGetToken(
      "Chat",
      "Player",
      "chat-player@test.com",
      "player"
    );
    const { token: coachToken } = await createUserAndGetToken(
      "Chat",
      "Coach",
      "chat-coach@test.com",
      "coach"
    );

    await createJournalEntry(coachToken, player.id, "Worked on serve targets", ["serve", "footwork"]);

    const response = await request(app)
      .post("/api/coach-ai/chat")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({
        playerId: player.id,
        message: "Make this week's plan more serve-focused.",
        conversationHistory: [],
      });

    expect(response.status).toBe(200);
    expect(typeof response.body.response).toBe("string");
    expect(response.body.response.toLowerCase()).toContain("serve");
  });

  it("returns a structured player summary for coaches", async () => {
    const { member: player } = await createUserAndGetToken(
      "Summary",
      "Player",
      "summary-player@test.com",
      "player"
    );
    const { token: coachToken } = await createUserAndGetToken(
      "Coach",
      "Summary",
      "coach-summary@test.com",
      "coach"
    );

    await createJournalEntry(coachToken, player.id, "Worked on serve rhythm", ["serve", "footwork"]);
    await createJournalEntry(coachToken, player.id, "Worked on backhand depth", ["backhand", "serve"]);

    const response = await request(app)
      .post("/api/coach-ai/player-summary")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ playerId: player.id });

    expect(response.status).toBe(200);
    expect(response.body.player.fullName).toBe("Summary Player");
    expect(response.body.totalSessions).toBe(2);
    expect(response.body.recentFocusAreas).toContain("serve");
    expect(response.body.recentNotes).toHaveLength(2);
  });

  it("saves a generated training plan draft for coach workflows", async () => {
    const { member: player } = await createUserAndGetToken(
      "Plan",
      "Player",
      "plan-player@test.com",
      "player"
    );
    const { member: coach, token: coachToken } = await createUserAndGetToken(
      "Plan",
      "Coach",
      "plan-coach@test.com",
      "coach"
    );

    await createJournalEntry(coachToken, player.id, "Serve and forehand session", ["serve", "forehand"]);

    const response = await request(app)
      .post("/api/coach-ai/training-plan-draft/save")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ playerId: player.id });

    expect(response.status).toBe(201);
    expect(response.body.playerId).toBe(player.id);
    expect(response.body.createdBy).toBe(coach.id);
    expect(response.body.focusAreas).toContain("serve");

    const savedPlans = JSON.parse(
      await fs.readFile(path.join(tempDir, "training-plans.json"), "utf8")
    );

    expect(savedPlans).toHaveLength(1);
    expect(savedPlans[0].playerId).toBe(player.id);
    expect(savedPlans[0].createdBy).toBe(coach.id);
  });

  it("rejects saving a training plan draft when no journal history exists", async () => {
    const { member: player } = await createUserAndGetToken(
      "NoJournal",
      "Player",
      "nojournal-player@test.com",
      "player"
    );
    const { token: coachToken } = await createUserAndGetToken(
      "NoJournal",
      "Coach",
      "nojournal-coach@test.com",
      "coach"
    );

    const response = await request(app)
      .post("/api/coach-ai/training-plan-draft/save")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ playerId: player.id });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("no journal entries");
  });
});
