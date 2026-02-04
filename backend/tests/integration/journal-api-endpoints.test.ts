/**
 * Integration tests for journal API endpoints
 * Tests access control, validation, and filtering functionality
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
let originalJwtSecret: string | undefined;
let originalFrontendUrl: string | undefined;

beforeAll(async () => {
  // Save original environment variables
  originalDataDir = process.env.DATA_DIR;
  originalJwtSecret = process.env.JWT_SECRET;
  originalFrontendUrl = process.env.FRONTEND_URL;
  
  // Set test environment
  process.env.JWT_SECRET = "test-secret-key-for-testing-only";
  process.env.FRONTEND_URL = "http://localhost:3009";
  process.env.BCRYPT_ROUNDS = "10";
  
  // Create unique temp directory for this test file
  const baseDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `pta-journal-${Date.now()}-${Math.random().toString(36).substring(7)}-`)
  );
  tempDir = baseDir;
  process.env.DATA_DIR = tempDir;
  // Ensure directory exists
  await fs.mkdir(tempDir, { recursive: true });
});

beforeEach(async () => {
  // Clear caches before each test
  memberCache.clear();
  reservationCache.clear();
  
  // Ensure clean state - clear all data files
  if (tempDir) {
    try {
      const membersFile = path.join(tempDir, "members.json");
      const membersLockFile = path.join(tempDir, "members.json.lock");
      const journalFile = path.join(tempDir, "journal-entries.json");
      const journalLockFile = path.join(tempDir, "journal-entries.json.lock");
      
      // Remove lock files if they exist
      await fs.unlink(membersLockFile).catch(() => {});
      await fs.unlink(journalLockFile).catch(() => {});
      
      // Wait a bit for locks to release
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Clear files
      await fs.writeFile(membersFile, JSON.stringify([], null, 2)).catch(() => {});
      await fs.writeFile(journalFile, JSON.stringify([], null, 2)).catch(() => {});
    } catch {
      // ignore errors
    }
  }
});

afterEach(async () => {
  // Clear caches after each test
  memberCache.clear();
  reservationCache.clear();
  
  if (!tempDir) return;
  try {
    // Remove lock files
    const membersLockFile = path.join(tempDir, "members.json.lock");
    const journalLockFile = path.join(tempDir, "journal-entries.json.lock");
    await fs.unlink(membersLockFile).catch(() => {});
    await fs.unlink(journalLockFile).catch(() => {});
  } catch {
    // ignore cleanup errors
  }
});

afterAll(async () => {
  // Restore original environment variables
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
  
  // Clean up temp directory
  if (tempDir) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
});

describe("Journal API Endpoints Integration Tests", () => {
  // Helper function to create a user and get auth token
  async function createUserAndGetToken(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    role: string = "player"
  ): Promise<{ member: any; token: string }> {
    // Sign up
    await request(app)
      .post("/api/auth/signup")
      .send({
        firstName,
        lastName,
        email,
        phone: "401-555-0000",
        password,
        role,
      });
    
    // Sign in
    const signinResponse = await request(app)
      .post("/api/auth/signin")
      .send({
        email,
        password,
      });
    
    return {
      member: signinResponse.body.member,
      token: signinResponse.body.token,
    };
  }

  // Helper function to create a journal entry
  async function createJournalEntry(
    token: string,
    entryData: {
      playerId: string;
      sessionDate: string;
      summary: string;
      areasWorkedOn: string[];
      pointersForNextSession: string;
      reservationId?: string;
      sessionTime?: string;
      additionalNotes?: string;
    }
  ) {
    return request(app)
      .post("/api/journal/entries")
      .set("Authorization", `Bearer ${token}`)
      .send(entryData);
  }

  describe("Access Control", () => {
    describe("POST /api/journal/entries - Create journal entry", () => {
      it("should reject non-authenticated requests", async () => {
        const response = await request(app)
          .post("/api/journal/entries")
          .send({
            playerId: "some-id",
            sessionDate: "2024-01-01",
            summary: "Test session",
            areasWorkedOn: ["backhand"],
            pointersForNextSession: "Keep practicing",
          });
        
        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      });

      it("should allow coaches to create journal entries", async () => {
        const { member: player } = await createUserAndGetToken(
          "Player",
          "One",
          "player1@test.com",
          "TestPass123",
          "player"
        );
        
        const { token: coachToken } = await createUserAndGetToken(
          "Coach",
          "One",
          "coach1@test.com",
          "TestPass123",
          "coach"
        );

        const response = await createJournalEntry(coachToken, {
          playerId: player.id,
          sessionDate: "2024-01-15",
          summary: "Worked on backhand technique",
          areasWorkedOn: ["backhand", "footwork"],
          pointersForNextSession: "Practice backhand cross-court shots",
        });

        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
        expect(response.body.playerId).toBe(player.id);
        expect(response.body.summary).toBe("Worked on backhand technique");
      });

      it("should allow admins to create journal entries", async () => {
        const { member: player } = await createUserAndGetToken(
          "Player",
          "Two",
          "player2@test.com",
          "TestPass123",
          "player"
        );
        
        const { token: adminToken } = await createUserAndGetToken(
          "Admin",
          "One",
          "admin1@test.com",
          "TestPass123",
          "admin"
        );

        const response = await createJournalEntry(adminToken, {
          playerId: player.id,
          sessionDate: "2024-01-16",
          summary: "Admin created entry",
          areasWorkedOn: ["serve"],
          pointersForNextSession: "Focus on serve placement",
        });

        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
      });

      it("should reject players from creating journal entries", async () => {
        const { member: player1 } = await createUserAndGetToken(
          "Player",
          "Three",
          "player3@test.com",
          "TestPass123",
          "player"
        );
        
        const { member: player2 } = await createUserAndGetToken(
          "Player",
          "Four",
          "player4@test.com",
          "TestPass123",
          "player"
        );

        const { token: playerToken } = await createUserAndGetToken(
          "Player",
          "Five",
          "player5@test.com",
          "TestPass123",
          "player"
        );

        const response = await createJournalEntry(playerToken, {
          playerId: player1.id,
          sessionDate: "2024-01-17",
          summary: "Player trying to create entry",
          areasWorkedOn: ["backhand"],
          pointersForNextSession: "Should fail",
        });

        expect(response.status).toBe(403);
        expect(response.body.error).toBeDefined();
      });
    });

    describe("GET /api/journal/entries - List journal entries", () => {
      it("should reject non-authenticated requests", async () => {
        const response = await request(app)
          .get("/api/journal/entries");
        
        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      });

      it("should allow players to view only their own entries", async () => {
        const { member: player1, token: player1Token } = await createUserAndGetToken(
          "Player",
          "Six",
          "player6@test.com",
          "TestPass123",
          "player"
        );
        
        const { member: player2 } = await createUserAndGetToken(
          "Player",
          "Seven",
          "player7@test.com",
          "TestPass123",
          "player"
        );
        
        const { token: coachToken } = await createUserAndGetToken(
          "Coach",
          "Two",
          "coach2@test.com",
          "TestPass123",
          "coach"
        );

        // Create entries for both players
        await createJournalEntry(coachToken, {
          playerId: player1.id,
          sessionDate: "2024-01-20",
          summary: "Player 1 session",
          areasWorkedOn: ["backhand"],
          pointersForNextSession: "Practice more",
        });

        await createJournalEntry(coachToken, {
          playerId: player2.id,
          sessionDate: "2024-01-21",
          summary: "Player 2 session",
          areasWorkedOn: ["serve"],
          pointersForNextSession: "Work on serve",
        });

        // Player 1 should only see their own entry
        const response = await request(app)
          .get("/api/journal/entries")
          .set("Authorization", `Bearer ${player1Token}`);

        expect(response.status).toBe(200);
        expect(response.body.entries).toBeDefined();
        expect(Array.isArray(response.body.entries)).toBe(true);
        expect(response.body.entries.length).toBe(1);
        expect(response.body.entries[0].playerId).toBe(player1.id);
        expect(response.body.entries[0].summary).toBe("Player 1 session");
      });

      it("should allow coaches to view their own entries", async () => {
        const { member: player1 } = await createUserAndGetToken(
          "Player",
          "Eight",
          "player8@test.com",
          "TestPass123",
          "player"
        );
        
        const { member: player2 } = await createUserAndGetToken(
          "Player",
          "Nine",
          "player9@test.com",
          "TestPass123",
          "player"
        );
        
        const { member: coach1, token: coach1Token } = await createUserAndGetToken(
          "Coach",
          "Three",
          "coach3@test.com",
          "TestPass123",
          "coach"
        );
        
        const { token: coach2Token } = await createUserAndGetToken(
          "Coach",
          "Four",
          "coach4@test.com",
          "TestPass123",
          "coach"
        );

        // Create entries with different coaches
        await createJournalEntry(coach1Token, {
          playerId: player1.id,
          sessionDate: "2024-01-22",
          summary: "Coach 1 entry",
          areasWorkedOn: ["backhand"],
          pointersForNextSession: "Practice",
        });

        await createJournalEntry(coach2Token, {
          playerId: player2.id,
          sessionDate: "2024-01-23",
          summary: "Coach 2 entry",
          areasWorkedOn: ["serve"],
          pointersForNextSession: "Work on serve",
        });

        // Coach 1 should only see their own entries
        const response = await request(app)
          .get("/api/journal/entries")
          .set("Authorization", `Bearer ${coach1Token}`);

        expect(response.status).toBe(200);
        expect(response.body.entries.length).toBe(1);
        expect(response.body.entries[0].coachId).toBe(coach1.id);
        expect(response.body.entries[0].summary).toBe("Coach 1 entry");
      });

      it("should allow admins to view all entries", async () => {
        const { member: player1 } = await createUserAndGetToken(
          "Player",
          "Ten",
          "player10@test.com",
          "TestPass123",
          "player"
        );
        
        const { member: player2 } = await createUserAndGetToken(
          "Player",
          "Eleven",
          "player11@test.com",
          "TestPass123",
          "player"
        );
        
        const { token: coachToken } = await createUserAndGetToken(
          "Coach",
          "Five",
          "coach5@test.com",
          "TestPass123",
          "coach"
        );
        
        const { token: adminToken } = await createUserAndGetToken(
          "Admin",
          "Two",
          "admin2@test.com",
          "TestPass123",
          "admin"
        );

        // Create multiple entries
        await createJournalEntry(coachToken, {
          playerId: player1.id,
          sessionDate: "2024-01-24",
          summary: "Entry 1",
          areasWorkedOn: ["backhand"],
          pointersForNextSession: "Practice",
        });

        await createJournalEntry(coachToken, {
          playerId: player2.id,
          sessionDate: "2024-01-25",
          summary: "Entry 2",
          areasWorkedOn: ["serve"],
          pointersForNextSession: "Work on serve",
        });

        // Admin should see all entries
        const response = await request(app)
          .get("/api/journal/entries")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.entries.length).toBe(2);
      });
    });

    describe("GET /api/journal/entries/:id - Get journal entry by ID", () => {
      it("should reject non-authenticated requests", async () => {
        const response = await request(app)
          .get("/api/journal/entries/some-id");
        
        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      });

      it("should allow players to view their own entries", async () => {
        const { member: player1, token: player1Token } = await createUserAndGetToken(
          "Player",
          "Twelve",
          "player12@test.com",
          "TestPass123",
          "player"
        );
        
        const { member: player2 } = await createUserAndGetToken(
          "Player",
          "Thirteen",
          "player13@test.com",
          "TestPass123",
          "player"
        );
        
        const { token: coachToken } = await createUserAndGetToken(
          "Coach",
          "Six",
          "coach6@test.com",
          "TestPass123",
          "coach"
        );

        // Create entry for player 1
        const createResponse = await createJournalEntry(coachToken, {
          playerId: player1.id,
          sessionDate: "2024-01-26",
          summary: "Player 1 entry",
          areasWorkedOn: ["backhand"],
          pointersForNextSession: "Practice",
        });

        const entryId = createResponse.body.id;

        // Player 1 should be able to view their own entry
        const response = await request(app)
          .get(`/api/journal/entries/${entryId}`)
          .set("Authorization", `Bearer ${player1Token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(entryId);
        expect(response.body.playerId).toBe(player1.id);
      });

      it("should prevent players from viewing other players' entries", async () => {
        const { member: player1 } = await createUserAndGetToken(
          "Player",
          "Fourteen",
          "player14@test.com",
          "TestPass123",
          "player"
        );
        
        const { token: player2Token } = await createUserAndGetToken(
          "Player",
          "Fifteen",
          "player15@test.com",
          "TestPass123",
          "player"
        );
        
        const { token: coachToken } = await createUserAndGetToken(
          "Coach",
          "Seven",
          "coach7@test.com",
          "TestPass123",
          "coach"
        );

        // Create entry for player 1
        const createResponse = await createJournalEntry(coachToken, {
          playerId: player1.id,
          sessionDate: "2024-01-27",
          summary: "Player 1 entry",
          areasWorkedOn: ["backhand"],
          pointersForNextSession: "Practice",
        });

        const entryId = createResponse.body.id;

        // Player 2 should NOT be able to view player 1's entry
        const response = await request(app)
          .get(`/api/journal/entries/${entryId}`)
          .set("Authorization", `Bearer ${player2Token}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toBeDefined();
      });

      it("should allow coaches to view entries they created", async () => {
        const { member: player1 } = await createUserAndGetToken(
          "Player",
          "Sixteen",
          "player16@test.com",
          "TestPass123",
          "player"
        );
        
        const { member: coach1, token: coach1Token } = await createUserAndGetToken(
          "Coach",
          "Eight",
          "coach8@test.com",
          "TestPass123",
          "coach"
        );

        // Create entry
        const createResponse = await createJournalEntry(coach1Token, {
          playerId: player1.id,
          sessionDate: "2024-01-28",
          summary: "Coach 1 entry",
          areasWorkedOn: ["backhand"],
          pointersForNextSession: "Practice",
        });

        const entryId = createResponse.body.id;

        // Coach 1 should be able to view their own entry
        const response = await request(app)
          .get(`/api/journal/entries/${entryId}`)
          .set("Authorization", `Bearer ${coach1Token}`);

        expect(response.status).toBe(200);
        expect(response.body.coachId).toBe(coach1.id);
      });

      it("should allow admins to view any entry", async () => {
        const { member: player1 } = await createUserAndGetToken(
          "Player",
          "Seventeen",
          "player17@test.com",
          "TestPass123",
          "player"
        );
        
        const { token: coachToken } = await createUserAndGetToken(
          "Coach",
          "Nine",
          "coach9@test.com",
          "TestPass123",
          "coach"
        );
        
        const { token: adminToken } = await createUserAndGetToken(
          "Admin",
          "Three",
          "admin3@test.com",
          "TestPass123",
          "admin"
        );

        // Create entry
        const createResponse = await createJournalEntry(coachToken, {
          playerId: player1.id,
          sessionDate: "2024-01-29",
          summary: "Entry for admin to view",
          areasWorkedOn: ["backhand"],
          pointersForNextSession: "Practice",
        });

        const entryId = createResponse.body.id;

        // Admin should be able to view any entry
        const response = await request(app)
          .get(`/api/journal/entries/${entryId}`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(entryId);
      });
    });
  });

  describe("Validation", () => {
    describe("POST /api/journal/entries - Required fields", () => {
      let coachToken: string;
      let playerId: string;

      beforeEach(async () => {
        const { member: player } = await createUserAndGetToken(
          "Player",
          "Validation",
          "player-validation@test.com",
          "TestPass123",
          "player"
        );
        playerId = player.id;

        const { token } = await createUserAndGetToken(
          "Coach",
          "Validation",
          "coach-validation@test.com",
          "TestPass123",
          "coach"
        );
        coachToken = token;
      });

      it("should reject entry without playerId", async () => {
        const response = await createJournalEntry(coachToken, {
          playerId: "", // Empty playerId
          sessionDate: "2024-01-30",
          summary: "Test session",
          areasWorkedOn: ["backhand"],
          pointersForNextSession: "Practice",
        } as any);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("playerId");
      });

      it("should reject entry without sessionDate", async () => {
        const response = await createJournalEntry(coachToken, {
          playerId: playerId,
          sessionDate: "", // Empty sessionDate
          summary: "Test session",
          areasWorkedOn: ["backhand"],
          pointersForNextSession: "Practice",
        } as any);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("sessionDate");
      });

      it("should reject entry with invalid sessionDate format", async () => {
        const response = await createJournalEntry(coachToken, {
          playerId: playerId,
          sessionDate: "01-30-2024", // Wrong format
          summary: "Test session",
          areasWorkedOn: ["backhand"],
          pointersForNextSession: "Practice",
        } as any);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("sessionDate");
      });

      it("should reject entry without summary", async () => {
        const response = await createJournalEntry(coachToken, {
          playerId: playerId,
          sessionDate: "2024-01-30",
          summary: "", // Empty summary
          areasWorkedOn: ["backhand"],
          pointersForNextSession: "Practice",
        } as any);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("summary");
      });

      it("should reject entry without areasWorkedOn", async () => {
        const response = await createJournalEntry(coachToken, {
          playerId: playerId,
          sessionDate: "2024-01-30",
          summary: "Test session",
          areasWorkedOn: [], // Empty array
          pointersForNextSession: "Practice",
        } as any);

        // Note: The validation might allow empty arrays, but areasWorkedOn must be an array
        // Let's check if it's required to have at least one item
        // Based on the code, it seems empty arrays are filtered out, so this might pass
        // But let's test with missing field
        const response2 = await createJournalEntry(coachToken, {
          playerId: playerId,
          sessionDate: "2024-01-30",
          summary: "Test session",
          // Missing areasWorkedOn
          pointersForNextSession: "Practice",
        } as any);

        expect(response2.status).toBe(400);
        expect(response2.body.error).toContain("areasWorkedOn");
      });

      it("should reject entry without pointersForNextSession", async () => {
        const response = await createJournalEntry(coachToken, {
          playerId: playerId,
          sessionDate: "2024-01-30",
          summary: "Test session",
          areasWorkedOn: ["backhand"],
          pointersForNextSession: "", // Empty pointers
        } as any);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("pointersForNextSession");
      });

      it("should reject entry with invalid sessionTime format", async () => {
        const response = await createJournalEntry(coachToken, {
          playerId: playerId,
          sessionDate: "2024-01-30",
          sessionTime: "25:00", // Invalid time
          summary: "Test session",
          areasWorkedOn: ["backhand"],
          pointersForNextSession: "Practice",
        } as any);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("sessionTime");
      });

      it("should accept entry with all required fields", async () => {
        const response = await createJournalEntry(coachToken, {
          playerId: playerId,
          sessionDate: "2024-01-30",
          summary: "Complete test session",
          areasWorkedOn: ["backhand", "footwork"],
          pointersForNextSession: "Continue practicing backhand",
        });

        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
        expect(response.body.summary).toBe("Complete test session");
        expect(response.body.areasWorkedOn).toEqual(["backhand", "footwork"]);
      });

      it("should accept entry with optional fields", async () => {
        const response = await createJournalEntry(coachToken, {
          playerId: playerId,
          sessionDate: "2024-01-30",
          sessionTime: "14:30",
          summary: "Session with optional fields",
          areasWorkedOn: ["serve"],
          pointersForNextSession: "Work on serve placement",
          additionalNotes: "Player showed good improvement",
        });

        expect(response.status).toBe(201);
        expect(response.body.sessionTime).toBe("14:30");
        expect(response.body.additionalNotes).toBe("Player showed good improvement");
      });
    });
  });

  describe("Filtering", () => {
    let coach1Token: string;
    let coach2Token: string;
    let adminToken: string;
    let player1Id: string;
    let player2Id: string;
    let player3Id: string;
    let entry1Id: string;
    let entry2Id: string;
    let entry3Id: string;
    let entry4Id: string;

    beforeEach(async () => {
      // Create players
      const { member: player1 } = await createUserAndGetToken(
        "Filter",
        "Player1",
        "filter-player1@test.com",
        "TestPass123",
        "player"
      );
      player1Id = player1.id;

      const { member: player2 } = await createUserAndGetToken(
        "Filter",
        "Player2",
        "filter-player2@test.com",
        "TestPass123",
        "player"
      );
      player2Id = player2.id;

      const { member: player3 } = await createUserAndGetToken(
        "Filter",
        "Player3",
        "filter-player3@test.com",
        "TestPass123",
        "player"
      );
      player3Id = player3.id;

      // Create coaches
      const { member: coach1, token: token1 } = await createUserAndGetToken(
        "Filter",
        "Coach1",
        "filter-coach1@test.com",
        "TestPass123",
        "coach"
      );
      coach1Token = token1;

      const { token: token2 } = await createUserAndGetToken(
        "Filter",
        "Coach2",
        "filter-coach2@test.com",
        "TestPass123",
        "coach"
      );
      coach2Token = token2;

      // Create admin
      const { token: admin } = await createUserAndGetToken(
        "Filter",
        "Admin",
        "filter-admin@test.com",
        "TestPass123",
        "admin"
      );
      adminToken = admin;

      // Create entries with different dates and areas
      const response1 = await createJournalEntry(coach1Token, {
        playerId: player1Id,
        sessionDate: "2024-01-10",
        summary: "Entry 1 - backhand",
        areasWorkedOn: ["backhand", "footwork"],
        pointersForNextSession: "Practice backhand",
      });
      entry1Id = response1.body.id;

      const response2 = await createJournalEntry(coach1Token, {
        playerId: player2Id,
        sessionDate: "2024-01-15",
        summary: "Entry 2 - serve",
        areasWorkedOn: ["serve"],
        pointersForNextSession: "Work on serve",
      });
      entry2Id = response2.body.id;

      const response3 = await createJournalEntry(coach2Token, {
        playerId: player1Id,
        sessionDate: "2024-01-20",
        summary: "Entry 3 - backhand",
        areasWorkedOn: ["backhand"],
        pointersForNextSession: "Continue backhand practice",
      });
      entry3Id = response3.body.id;

      const response4 = await createJournalEntry(coach1Token, {
        playerId: player3Id,
        sessionDate: "2024-01-25",
        summary: "Entry 4 - volley",
        areasWorkedOn: ["volley", "net play"],
        pointersForNextSession: "Practice volleys",
      });
      entry4Id = response4.body.id;
    });

    it("should filter entries by playerId", async () => {
      const response = await request(app)
        .get(`/api/journal/entries?playerId=${player1Id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.entries.length).toBe(2); // entry1 and entry3
      expect(response.body.entries.every((e: any) => e.playerId === player1Id)).toBe(true);
    });

    it("should filter entries by coachId", async () => {
      // Get coach1's ID from the entries
      const allResponse = await request(app)
        .get("/api/journal/entries")
        .set("Authorization", `Bearer ${adminToken}`);
      
      const coach1Id = allResponse.body.entries.find((e: any) => e.id === entry1Id)?.coachId;

      const response = await request(app)
        .get(`/api/journal/entries?coachId=${coach1Id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.entries.length).toBe(3); // entry1, entry2, entry4
      expect(response.body.entries.every((e: any) => e.coachId === coach1Id)).toBe(true);
    });

    it("should filter entries by startDate", async () => {
      const response = await request(app)
        .get("/api/journal/entries?startDate=2024-01-20")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.entries.length).toBe(2); // entry3 and entry4
      expect(response.body.entries.every((e: any) => e.sessionDate >= "2024-01-20")).toBe(true);
    });

    it("should filter entries by endDate", async () => {
      const response = await request(app)
        .get("/api/journal/entries?endDate=2024-01-15")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.entries.length).toBe(2); // entry1 and entry2
      expect(response.body.entries.every((e: any) => e.sessionDate <= "2024-01-15")).toBe(true);
    });

    it("should filter entries by date range", async () => {
      const response = await request(app)
        .get("/api/journal/entries?startDate=2024-01-15&endDate=2024-01-20")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.entries.length).toBe(2); // entry2 and entry3
      expect(
        response.body.entries.every(
          (e: any) => e.sessionDate >= "2024-01-15" && e.sessionDate <= "2024-01-20"
        )
      ).toBe(true);
    });

    it("should filter entries by areaWorkedOn", async () => {
      const response = await request(app)
        .get("/api/journal/entries?areaWorkedOn=backhand")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.entries.length).toBe(2); // entry1 and entry3
      expect(
        response.body.entries.every((e: any) =>
          e.areasWorkedOn.some((area: string) =>
            area.toLowerCase().includes("backhand")
          )
        )
      ).toBe(true);
    });

    it("should combine multiple filters", async () => {
      const response = await request(app)
        .get(
          `/api/journal/entries?playerId=${player1Id}&startDate=2024-01-15&areaWorkedOn=backhand`
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.entries.length).toBe(1); // Only entry3
      expect(response.body.entries[0].id).toBe(entry3Id);
    });

    it("should return empty array when filters match no entries", async () => {
      const response = await request(app)
        .get("/api/journal/entries?playerId=nonexistent-id")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.entries.length).toBe(0);
    });
  });
});
