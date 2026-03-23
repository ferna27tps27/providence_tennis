import { CourtSurface, UserRole } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

import { Member } from "../../types/member";
import { Court } from "../../types/reservation";
import { getPrismaClient } from "./prisma-client";
import { normalizeEmail } from "../utils/member-validation";

function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.isAbsolute(process.env.DATA_DIR)
      ? process.env.DATA_DIR
      : path.join(process.cwd(), process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

function getCourtsFile(): string {
  return path.join(getDataDir(), "courts.json");
}

function getMembersFile(): string {
  return path.join(getDataDir(), "members.json");
}

function mapUserRole(role?: Member["role"]): UserRole {
  switch (role) {
    case "admin":
      return UserRole.ADMIN;
    case "coach":
      return UserRole.COACH;
    case "parent":
      return UserRole.PARENT;
    default:
      return UserRole.PLAYER;
  }
}

function mapCourtSurface(type?: Court["type"]): CourtSurface {
  switch (type) {
    case "clay":
      return CourtSurface.CLAY;
    case "indoor":
      return CourtSurface.INDOOR;
    default:
      return CourtSurface.HARD;
  }
}

function defaultCourts(): Court[] {
  return Array.from({ length: 10 }, (_, index) => ({
    id: String(index + 1),
    name: `Court ${index + 1}`,
    type: "clay",
    available: true,
  }));
}

async function ensureCourtsFile(): Promise<void> {
  const dataDir = getDataDir();
  const courtsFile = getCourtsFile();
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(courtsFile);
  } catch {
    await fs.writeFile(courtsFile, JSON.stringify(defaultCourts(), null, 2));
  }
}

async function ensureMembersFile(): Promise<void> {
  const dataDir = getDataDir();
  const membersFile = getMembersFile();
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(membersFile);
  } catch {
    await fs.writeFile(membersFile, JSON.stringify([], null, 2));
  }
}

async function readLegacyCourts(): Promise<Court[]> {
  await ensureCourtsFile();

  try {
    const raw = await fs.readFile(getCourtsFile(), "utf8");
    return JSON.parse(raw) as Court[];
  } catch (error) {
    console.error("Error reading legacy courts for Prisma sync:", error);
    return [];
  }
}

export async function readLegacyMembers(): Promise<Member[]> {
  await ensureMembersFile();

  try {
    const raw = await fs.readFile(getMembersFile(), "utf8");
    return JSON.parse(raw) as Member[];
  } catch (error) {
    console.error("Error reading legacy members for Prisma sync:", error);
    return [];
  }
}

export async function findLegacyMemberById(memberId: string): Promise<Member | null> {
  const members = await readLegacyMembers();
  return members.find((member) => member.id === memberId) || null;
}

export async function findLegacyMemberByEmail(email: string): Promise<Member | null> {
  const normalizedEmail = normalizeEmail(email);
  const members = await readLegacyMembers();
  return members.find((member) => normalizeEmail(member.email) === normalizedEmail) || null;
}

export async function findLegacyMemberByMemberNumber(memberNumber: string): Promise<Member | null> {
  const members = await readLegacyMembers();
  return members.find((member) => member.memberNumber === memberNumber) || null;
}

async function upsertLegacyMemberToPrisma(member: Member): Promise<void> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return;
  }

  await prisma.user.upsert({
    where: { id: member.id },
    update: {
      memberNumber: member.memberNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email.toLowerCase(),
      phone: member.phone,
      isActive: member.isActive,
      role: mapUserRole(member.role),
      penaltyCancellations: member.penaltyCancellations ?? 0,
      unsubscribeEmail: member.unsubscribeEmail ?? false,
      passwordHash: member.passwordHash,
      emailVerified: member.emailVerified ?? false,
      dateOfBirth: member.dateOfBirth,
      gender: member.gender,
      address: member.address,
      notes: member.notes,
      ntrpRating: member.ntrpRating,
      ustaNumber: member.ustaNumber,
      createdAt: new Date(member.createdAt),
      updatedAt: new Date(member.lastModified),
    },
    create: {
      id: member.id,
      memberNumber: member.memberNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email.toLowerCase(),
      phone: member.phone,
      isActive: member.isActive,
      role: mapUserRole(member.role),
      penaltyCancellations: member.penaltyCancellations ?? 0,
      unsubscribeEmail: member.unsubscribeEmail ?? false,
      passwordHash: member.passwordHash,
      emailVerified: member.emailVerified ?? false,
      dateOfBirth: member.dateOfBirth,
      gender: member.gender,
      address: member.address,
      notes: member.notes,
      ntrpRating: member.ntrpRating,
      ustaNumber: member.ustaNumber,
      createdAt: new Date(member.createdAt),
      updatedAt: new Date(member.lastModified),
    },
  });
}

export async function ensurePrismaMember(memberId?: string): Promise<void> {
  if (!memberId) {
    return;
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { id: memberId },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  const member = await findLegacyMemberById(memberId);
  if (!member) {
    return;
  }

  await upsertLegacyMemberToPrisma(member);
}

export async function ensurePrismaMembers(memberIds: Array<string | undefined>): Promise<void> {
  for (const memberId of memberIds) {
    await ensurePrismaMember(memberId);
  }
}

export async function ensurePrismaMemberByEmail(email?: string): Promise<void> {
  if (!email) {
    return;
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  const member = await findLegacyMemberByEmail(normalizedEmail);
  if (!member) {
    return;
  }

  await upsertLegacyMemberToPrisma(member);
}

export async function ensurePrismaMemberByMemberNumber(memberNumber?: string): Promise<void> {
  if (!memberNumber) {
    return;
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { memberNumber },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  const member = await findLegacyMemberByMemberNumber(memberNumber);
  if (!member) {
    return;
  }

  await upsertLegacyMemberToPrisma(member);
}

export async function syncAllLegacyMembersToPrisma(): Promise<void> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return;
  }

  const members = await readLegacyMembers();
  for (const member of members) {
    await upsertLegacyMemberToPrisma(member);
  }
}

export async function ensurePrismaCourt(courtId?: string): Promise<void> {
  if (!courtId) {
    return;
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return;
  }

  const existing = await prisma.court.findUnique({
    where: { id: courtId },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  const courts = await readLegacyCourts();
  const court = courts.find((item) => item.id === courtId);
  if (!court) {
    return;
  }

  await prisma.court.upsert({
    where: { id: court.id },
    update: {
      name: court.name,
      type: mapCourtSurface(court.type),
      available: court.available,
      updatedAt: new Date(),
    },
    create: {
      id: court.id,
      name: court.name,
      type: mapCourtSurface(court.type),
      available: court.available,
    },
  });
}

export async function syncAllLegacyCourtsToPrisma(): Promise<void> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return;
  }

  const courts = await readLegacyCourts();

  for (const court of courts) {
    await prisma.court.upsert({
      where: { id: court.id },
      update: {
        name: court.name,
        type: mapCourtSurface(court.type),
        available: court.available,
        updatedAt: new Date(),
      },
      create: {
        id: court.id,
        name: court.name,
        type: mapCourtSurface(court.type),
        available: court.available,
      },
    });
  }
}
