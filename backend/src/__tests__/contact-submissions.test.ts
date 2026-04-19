import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import path from "path";
import { promises as fs } from "fs";
import os from "os";

import {
  createContactSubmission,
  listContactSubmissions,
} from "../lib/contact-submissions";
import { ValidationError } from "../lib/errors/reservation-errors";

let tempDir = "";
let originalDataDir: string | undefined;
let originalDatabaseUrl: string | undefined;

beforeAll(async () => {
  originalDataDir = process.env.DATA_DIR;
  originalDatabaseUrl = process.env.DATABASE_URL;

  delete process.env.DATABASE_URL;

  const baseDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `pta-contact-${Date.now()}-${Math.random().toString(36).substring(7)}-`)
  );
  tempDir = baseDir;
  process.env.DATA_DIR = tempDir;
  await fs.mkdir(tempDir, { recursive: true });
});

beforeEach(async () => {
  if (!tempDir) {
    return;
  }

  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(
    path.join(tempDir, "contact-submissions.json"),
    JSON.stringify([], null, 2)
  );
  await fs.unlink(path.join(tempDir, "contact-submissions.json.lock")).catch(() => {});
});

afterAll(async () => {
  if (originalDataDir !== undefined) {
    process.env.DATA_DIR = originalDataDir;
  } else {
    delete process.env.DATA_DIR;
  }

  if (originalDatabaseUrl !== undefined) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  } else {
    delete process.env.DATABASE_URL;
  }

  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

describe("contact submissions service", () => {
  it("stores and lists contact submissions", async () => {
    const submission = await createContactSubmission({
      name: "Jordan Smith",
      email: "Jordan@example.com",
      message: "I would like more information about summer camp.",
    });

    expect(submission.id).toBeDefined();
    expect(submission.name).toBe("Jordan Smith");
    expect(submission.email).toBe("jordan@example.com");
    expect(submission.status).toBe("new");

    const submissions = await listContactSubmissions();
    expect(submissions).toHaveLength(1);
    expect(submissions[0].email).toBe("jordan@example.com");
    expect(submissions[0].message).toContain("summer camp");
  });

  it("rejects invalid submissions", async () => {
    await expect(
      createContactSubmission({
        name: "",
        email: "not-an-email",
        message: "",
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
