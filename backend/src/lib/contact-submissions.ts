import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { ValidationError, LockError } from "./errors/reservation-errors";
import { FileLock } from "./utils/file-lock";
import { getPrismaClient } from "./db/prisma-client";
import {
  ContactSubmission,
  ContactSubmissionRequest,
  ContactSubmissionStatus,
} from "../types/contact-submission";

function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.isAbsolute(process.env.DATA_DIR)
      ? process.env.DATA_DIR
      : path.join(process.cwd(), process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

function getSubmissionsFile(): string {
  return path.join(getDataDir(), "contact-submissions.json");
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateRequest(request: ContactSubmissionRequest): void {
  if (!request.name?.trim()) {
    throw new ValidationError("Name is required");
  }

  if (!request.email?.trim() || !validateEmail(request.email)) {
    throw new ValidationError("A valid email address is required");
  }

  if (!request.message?.trim()) {
    throw new ValidationError("Message is required");
  }
}

function normalizeSubmission(submission: {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): ContactSubmission {
  return {
    id: submission.id,
    name: submission.name,
    email: submission.email,
    message: submission.message,
    status: (submission.status as ContactSubmissionStatus) || "new",
    createdAt: submission.createdAt.toISOString(),
    lastModified: submission.updatedAt.toISOString(),
  };
}

async function ensureDataFiles(): Promise<void> {
  const dataDir = getDataDir();
  const submissionsFile = getSubmissionsFile();
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(submissionsFile);
  } catch {
    await fs.writeFile(submissionsFile, JSON.stringify([], null, 2));
  }
}

async function readSubmissions(): Promise<ContactSubmission[]> {
  await ensureDataFiles();

  try {
    const data = await fs.readFile(getSubmissionsFile(), "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading contact submissions:", error);
    return [];
  }
}

async function writeSubmissions(submissions: ContactSubmission[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(getSubmissionsFile(), JSON.stringify(submissions, null, 2));
}

export async function listContactSubmissions(): Promise<ContactSubmission[]> {
  const prisma = getPrismaClient();

  if (prisma) {
    const submissions = await prisma.contactSubmission.findMany({
      orderBy: { createdAt: "desc" },
    });

    return submissions.map(normalizeSubmission);
  }

  return readSubmissions();
}

export async function createContactSubmission(
  request: ContactSubmissionRequest
): Promise<ContactSubmission> {
  validateRequest(request);

  const prisma = getPrismaClient();
  const now = new Date().toISOString();

  if (prisma) {
    const submission = await prisma.contactSubmission.create({
      data: {
        name: request.name.trim(),
        email: request.email.trim().toLowerCase(),
        message: request.message.trim(),
        status: "new",
      },
    });

    return normalizeSubmission(submission);
  }

  const lock = new FileLock(getSubmissionsFile());
  const release = await lock.acquire();

  try {
    const submissions = await readSubmissions();
    const submission: ContactSubmission = {
      id: randomUUID(),
      name: request.name.trim(),
      email: request.email.trim().toLowerCase(),
      message: request.message.trim(),
      status: "new",
      createdAt: now,
      lastModified: now,
    };

    submissions.unshift(submission);
    await writeSubmissions(submissions);
    return submission;
  } catch (error) {
    if (error instanceof Error) {
      throw new LockError(error.message);
    }
    throw error;
  } finally {
    await release();
  }
}
