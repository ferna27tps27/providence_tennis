import { LessonPackageStatus as PrismaLessonPackageStatus } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

import { LessonPackage } from "../../types/lesson-package";
import { FileLock } from "../utils/file-lock";
import { ensurePrismaMember } from "../db/prisma-legacy-sync";
import { getPrismaClient } from "../db/prisma-client";

function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.isAbsolute(process.env.DATA_DIR)
      ? process.env.DATA_DIR
      : path.join(process.cwd(), process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

function getLessonPackagesFile(): string {
  return path.join(getDataDir(), "lesson-packages.json");
}

function mapLessonPackageStatus(status: PrismaLessonPackageStatus): LessonPackage["status"] {
  switch (status) {
    case PrismaLessonPackageStatus.EXHAUSTED:
      return "exhausted";
    case PrismaLessonPackageStatus.EXPIRED:
      return "expired";
    case PrismaLessonPackageStatus.CANCELLED:
      return "cancelled";
    default:
      return "active";
  }
}

function toLessonPackageStatus(status: LessonPackage["status"]): PrismaLessonPackageStatus {
  switch (status) {
    case "exhausted":
      return PrismaLessonPackageStatus.EXHAUSTED;
    case "expired":
      return PrismaLessonPackageStatus.EXPIRED;
    case "cancelled":
      return PrismaLessonPackageStatus.CANCELLED;
    default:
      return PrismaLessonPackageStatus.ACTIVE;
  }
}

function mapPrismaLessonPackage(lessonPackage: {
  id: string;
  playerUserId: string;
  coachUserId: string | null;
  packageName: string;
  sessionCountTotal: number;
  sessionCountUsed: number;
  priceCents: number;
  expiresOn: string | null;
  status: PrismaLessonPackageStatus;
  notes: string | null;
  paymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): LessonPackage {
  return {
    id: lessonPackage.id,
    memberId: lessonPackage.playerUserId,
    coachId: lessonPackage.coachUserId || undefined,
    packageName: lessonPackage.packageName,
    sessionCountTotal: lessonPackage.sessionCountTotal,
    sessionCountUsed: lessonPackage.sessionCountUsed,
    price: lessonPackage.priceCents,
    expiresOn: lessonPackage.expiresOn || undefined,
    status: mapLessonPackageStatus(lessonPackage.status),
    notes: lessonPackage.notes || undefined,
    paymentId: lessonPackage.paymentId || undefined,
    createdAt: lessonPackage.createdAt.toISOString(),
    lastModified: lessonPackage.updatedAt.toISOString(),
  };
}

async function ensureDataFiles(): Promise<void> {
  const dataDir = getDataDir();
  const lessonPackagesFile = getLessonPackagesFile();
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(lessonPackagesFile);
  } catch {
    await fs.writeFile(lessonPackagesFile, JSON.stringify([], null, 2));
  }
}

async function readLessonPackages(): Promise<LessonPackage[]> {
  await ensureDataFiles();

  try {
    const data = await fs.readFile(getLessonPackagesFile(), "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading lesson packages:", error);
    return [];
  }
}

async function writeLessonPackages(lessonPackages: LessonPackage[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(getLessonPackagesFile(), JSON.stringify(lessonPackages, null, 2));
}

export class FileLessonPackageRepository {
  async findAll(): Promise<LessonPackage[]> {
    const prisma = getPrismaClient();

    if (prisma) {
      const lessonPackages = await prisma.lessonPackage.findMany({
        orderBy: { createdAt: "desc" },
      });

      return lessonPackages.map(mapPrismaLessonPackage);
    }

    const lessonPackages = await readLessonPackages();
    return lessonPackages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findById(id: string): Promise<LessonPackage | null> {
    const prisma = getPrismaClient();

    if (prisma) {
      const lessonPackage = await prisma.lessonPackage.findUnique({ where: { id } });
      return lessonPackage ? mapPrismaLessonPackage(lessonPackage) : null;
    }

    const lessonPackages = await readLessonPackages();
    return lessonPackages.find((lessonPackage) => lessonPackage.id === id) || null;
  }

  async findByMemberId(memberId: string): Promise<LessonPackage[]> {
    const prisma = getPrismaClient();

    if (prisma) {
      const lessonPackages = await prisma.lessonPackage.findMany({
        where: { playerUserId: memberId },
        orderBy: { createdAt: "desc" },
      });

      return lessonPackages.map(mapPrismaLessonPackage);
    }

    const lessonPackages = await readLessonPackages();
    return lessonPackages.filter((lessonPackage) => lessonPackage.memberId === memberId);
  }

  async create(
    lessonPackageData: Omit<LessonPackage, "id" | "createdAt" | "lastModified">
  ): Promise<LessonPackage> {
    const prisma = getPrismaClient();

    if (prisma) {
      await ensurePrismaMember(lessonPackageData.memberId);
      await ensurePrismaMember(lessonPackageData.coachId);

      const player = await prisma.user.findUnique({
        where: { id: lessonPackageData.memberId },
        select: { id: true },
      });

      if (!player) {
        throw new Error(`Lesson package member ${lessonPackageData.memberId} not found in Prisma runtime`);
      }

      const coach = lessonPackageData.coachId
        ? await prisma.user.findUnique({
            where: { id: lessonPackageData.coachId },
            select: { id: true },
          })
        : null;

      const lessonPackage = await prisma.lessonPackage.create({
        data: {
          playerUserId: lessonPackageData.memberId,
          coachUserId: coach ? lessonPackageData.coachId : null,
          packageName: lessonPackageData.packageName,
          sessionCountTotal: lessonPackageData.sessionCountTotal,
          sessionCountUsed: lessonPackageData.sessionCountUsed,
          priceCents: lessonPackageData.price,
          expiresOn: lessonPackageData.expiresOn,
          status: toLessonPackageStatus(lessonPackageData.status),
          notes: lessonPackageData.notes,
          paymentId: lessonPackageData.paymentId,
        },
      });

      return mapPrismaLessonPackage(lessonPackage);
    }

    const lock = new FileLock(getLessonPackagesFile());
    const release = await lock.acquire();

    try {
      const lessonPackages = await readLessonPackages();
      const now = new Date().toISOString();
      const lessonPackage: LessonPackage = {
        ...lessonPackageData,
        id: `lesson-package-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: now,
        lastModified: now,
      };

      lessonPackages.push(lessonPackage);
      await writeLessonPackages(lessonPackages);
      return lessonPackage;
    } finally {
      await release();
    }
  }

  async update(id: string, updates: Partial<LessonPackage>): Promise<LessonPackage> {
    const prisma = getPrismaClient();

    if (prisma) {
      const existing = await prisma.lessonPackage.findUnique({ where: { id } });

      if (!existing) {
        throw new Error(`Lesson package ${id} not found`);
      }

      const memberId = updates.memberId !== undefined ? updates.memberId : existing.playerUserId;
      const coachId = updates.coachId !== undefined ? updates.coachId : existing.coachUserId;
      await ensurePrismaMember(memberId);
      await ensurePrismaMember(coachId || undefined);

      const player = await prisma.user.findUnique({
        where: { id: memberId },
        select: { id: true },
      });

      if (!player) {
        throw new Error(`Lesson package member ${memberId} not found in Prisma runtime`);
      }

      const coach = coachId
        ? await prisma.user.findUnique({
            where: { id: coachId },
            select: { id: true },
          })
        : null;

      const updatedLessonPackage = await prisma.lessonPackage.update({
        where: { id },
        data: {
          playerUserId: memberId,
          coachUserId: coach ? coachId : null,
          packageName: updates.packageName !== undefined ? updates.packageName : existing.packageName,
          sessionCountTotal:
            updates.sessionCountTotal !== undefined
              ? updates.sessionCountTotal
              : existing.sessionCountTotal,
          sessionCountUsed:
            updates.sessionCountUsed !== undefined
              ? updates.sessionCountUsed
              : existing.sessionCountUsed,
          priceCents: updates.price !== undefined ? updates.price : existing.priceCents,
          expiresOn: updates.expiresOn !== undefined ? updates.expiresOn : existing.expiresOn,
          status: updates.status ? toLessonPackageStatus(updates.status) : existing.status,
          notes: updates.notes !== undefined ? updates.notes : existing.notes,
          paymentId: updates.paymentId !== undefined ? updates.paymentId : existing.paymentId,
          updatedAt: new Date(),
        },
      });

      return mapPrismaLessonPackage(updatedLessonPackage);
    }

    const lock = new FileLock(getLessonPackagesFile());
    const release = await lock.acquire();

    try {
      const lessonPackages = await readLessonPackages();
      const index = lessonPackages.findIndex((lessonPackage) => lessonPackage.id === id);

      if (index === -1) {
        throw new Error(`Lesson package ${id} not found`);
      }

      const updatedLessonPackage: LessonPackage = {
        ...lessonPackages[index],
        ...updates,
        id,
        lastModified: new Date().toISOString(),
      };

      lessonPackages[index] = updatedLessonPackage;
      await writeLessonPackages(lessonPackages);
      return updatedLessonPackage;
    } finally {
      await release();
    }
  }
}

export const lessonPackageRepository = new FileLessonPackageRepository();
