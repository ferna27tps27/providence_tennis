import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { FileLock } from "./utils/file-lock";
import { ValidationError } from "./errors/reservation-errors";
import {
  SummerCampRegistration,
  SummerCampRegistrationRequest,
  SummerCampPaymentStatus,
} from "../types/summer-camp-registration";

function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.isAbsolute(process.env.DATA_DIR)
      ? process.env.DATA_DIR
      : path.join(process.cwd(), process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

function getRegistrationsFile(): string {
  return path.join(getDataDir(), "summer-camp-registrations.json");
}

function toConfirmationCode(id: string): string {
  return `PTC-CAMP-${id.slice(0, 8).toUpperCase()}`;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeWeek(value: string): string {
  return value.trim();
}

function validateRequest(request: SummerCampRegistrationRequest): void {
  if (!request.guardianName?.trim()) {
    throw new ValidationError("Guardian name is required");
  }

  if (!request.guardianEmail?.trim() || !validateEmail(request.guardianEmail)) {
    throw new ValidationError("A valid guardian email is required");
  }

  if (!request.guardianPhone?.trim()) {
    throw new ValidationError("Guardian phone is required");
  }

  if (!request.playerName?.trim()) {
    throw new ValidationError("Player name is required");
  }

  if (!Number.isInteger(request.playerAge) || request.playerAge < 4 || request.playerAge > 17) {
    throw new ValidationError("Player age must be between 4 and 17");
  }

  if (!request.preferredWeeks?.length) {
    throw new ValidationError("Please choose at least one preferred week");
  }

  if (!request.depositAcknowledged) {
    throw new ValidationError("Please acknowledge the registration terms");
  }
}

async function ensureDataFiles(): Promise<void> {
  const dataDir = getDataDir();
  const registrationsFile = getRegistrationsFile();
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(registrationsFile);
  } catch {
    await fs.writeFile(registrationsFile, JSON.stringify([], null, 2));
  }
}

async function readRegistrations(): Promise<SummerCampRegistration[]> {
  await ensureDataFiles();

  try {
    const data = await fs.readFile(getRegistrationsFile(), "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading summer camp registrations:", error);
    return [];
  }
}

async function writeRegistrations(registrations: SummerCampRegistration[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(getRegistrationsFile(), JSON.stringify(registrations, null, 2));
}

export async function listSummerCampRegistrations(): Promise<SummerCampRegistration[]> {
  return readRegistrations();
}

export async function createSummerCampRegistration(
  request: SummerCampRegistrationRequest
): Promise<SummerCampRegistration> {
  validateRequest(request);

  const lock = new FileLock(getRegistrationsFile());
  const release = await lock.acquire();

  try {
    const registrations = await readRegistrations();
    const now = new Date().toISOString();
    const id = randomUUID();

    const registration: SummerCampRegistration = {
      id,
      confirmationCode: toConfirmationCode(id),
      createdAt: now,
      lastModified: now,
      status: "pending_review",
      guardianName: request.guardianName.trim(),
      guardianEmail: request.guardianEmail.trim().toLowerCase(),
      guardianPhone: request.guardianPhone.trim(),
      playerName: request.playerName.trim(),
      playerAge: request.playerAge,
      skillLevel: request.skillLevel,
      track: request.track,
      sessionPreference: request.sessionPreference,
      preferredWeeks: request.preferredWeeks.map(normalizeWeek).filter(Boolean),
      notes: request.notes?.trim() || undefined,
      contactPreference: request.contactPreference,
      depositAcknowledged: request.depositAcknowledged,
    };

    registrations.unshift(registration);
    await writeRegistrations(registrations);
    return registration;
  } finally {
    await release();
  }
}

export interface SummerCampPaymentUpdate {
  paymentStatus: SummerCampPaymentStatus;
  paymentId?: string;
  paymentIntentId?: string;
  paymentAmount?: number;
  paidAt?: string;
}

export async function updateSummerCampRegistrationPayment(
  registrationId: string,
  updates: SummerCampPaymentUpdate
): Promise<SummerCampRegistration> {
  if (!registrationId?.trim()) {
    throw new ValidationError("Registration ID is required");
  }

  const lock = new FileLock(getRegistrationsFile());
  const release = await lock.acquire();

  try {
    const registrations = await readRegistrations();
    const index = registrations.findIndex((registration) => registration.id === registrationId);

    if (index === -1) {
      throw new ValidationError("Registration not found");
    }

    const current = registrations[index];
    const now = new Date().toISOString();
    const updated: SummerCampRegistration = {
      ...current,
      lastModified: now,
      paymentStatus: updates.paymentStatus,
      paymentId: updates.paymentId ?? current.paymentId,
      paymentIntentId: updates.paymentIntentId ?? current.paymentIntentId,
      paymentAmount: updates.paymentAmount ?? current.paymentAmount,
      paidAt: updates.paidAt ?? current.paidAt,
    };

    registrations[index] = updated;
    await writeRegistrations(registrations);
    return updated;
  } finally {
    await release();
  }
}
