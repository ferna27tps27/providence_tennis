/**
 * Training plan repository.
 *
 * Uses Prisma/Postgres when DATABASE_URL is configured and falls back to the
 * legacy JSON file store otherwise.
 */

import { TrainingPlan, TrainingPlanRequest } from "../../types/training-plan";
import { promises as fs } from "fs";
import path from "path";
import { FileLock } from "../utils/file-lock";
import { getPrismaClient } from "../db/prisma-client";
import { TrainingPlanStatus } from "@prisma/client";
import { ensurePrismaMembers } from "../db/prisma-legacy-sync";

function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.isAbsolute(process.env.DATA_DIR)
      ? process.env.DATA_DIR
      : path.join(process.cwd(), process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

function getTrainingPlansFile(): string {
  return path.join(getDataDir(), "training-plans.json");
}

function toIsoString(value?: string | Date | null): string {
  if (!value) {
    return new Date().toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapPrismaTrainingPlan(plan: {
  id: string;
  playerId: string;
  createdAt: Date;
  updatedAt: Date;
  focusAreas: string[];
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string;
  suggestedDrills: string[];
  weeklyGoals: string[];
  progressNotes: string | null;
  sessionCount: number;
  lastReviewDate: Date | null;
  createdByUserId: string | null;
  createdByLabel: string | null;
  version: number;
}): TrainingPlan {
  return {
    id: plan.id,
    playerId: plan.playerId,
    createdAt: plan.createdAt.toISOString(),
    lastModified: plan.updatedAt.toISOString(),
    focusAreas: plan.focusAreas,
    strengths: plan.strengths,
    areasForImprovement: plan.areasForImprovement,
    recommendations: plan.recommendations,
    suggestedDrills: plan.suggestedDrills,
    weeklyGoals: plan.weeklyGoals,
    sessionCount: plan.sessionCount,
    lastReviewDate: toIsoString(plan.lastReviewDate || plan.updatedAt),
    progressNotes: plan.progressNotes || undefined,
    createdBy: plan.createdByUserId || plan.createdByLabel || "",
    version: plan.version,
  };
}

async function resolveCreatedBy(createdBy: string | undefined): Promise<{
  createdByUserId: string | null;
  createdByLabel: string | null;
}> {
  if (!createdBy) {
    return {
      createdByUserId: null,
      createdByLabel: null,
    };
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return {
      createdByUserId: null,
      createdByLabel: createdBy,
    };
  }

  await ensurePrismaMembers([createdBy]);
  const user = await prisma.user.findUnique({
    where: { id: createdBy },
    select: { id: true },
  });

  if (user) {
    return {
      createdByUserId: user.id,
      createdByLabel: null,
    };
  }

  return {
    createdByUserId: null,
    createdByLabel: createdBy,
  };
}

/**
 * Ensure data directory and file exist
 */
async function ensureDataFile(): Promise<void> {
  try {
    const dataDir = getDataDir();
    const trainingPlansFile = getTrainingPlansFile();

    await fs.mkdir(dataDir, { recursive: true });
    try {
      await fs.access(trainingPlansFile);
    } catch {
      await fs.writeFile(trainingPlansFile, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error("Error ensuring training plans data file:", error);
    throw error;
  }
}

/**
 * Read all training plans from file
 */
async function readTrainingPlans(): Promise<TrainingPlan[]> {
  await ensureDataFile();
  const data = await fs.readFile(getTrainingPlansFile(), "utf-8");
  return JSON.parse(data);
}

/**
 * Write training plans to file
 */
async function writeTrainingPlans(plans: TrainingPlan[]): Promise<void> {
  await fs.writeFile(getTrainingPlansFile(), JSON.stringify(plans, null, 2));
}

/**
 * Get all training plans for a player
 */
export async function getPlayerTrainingPlans(playerId: string): Promise<TrainingPlan[]> {
  const prisma = getPrismaClient();

  if (prisma) {
    const plans = await prisma.trainingPlan.findMany({
      where: { playerId },
      orderBy: { createdAt: "desc" },
    });

    return plans.map(mapPrismaTrainingPlan);
  }

  const lock = new FileLock(getTrainingPlansFile());
  const release = await lock.acquire();
  try {
    const plans = await readTrainingPlans();
    return plans
      .filter((plan) => plan.playerId === playerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } finally {
    await release();
  }
}

/**
 * Get the latest training plan for a player
 */
export async function getLatestTrainingPlan(playerId: string): Promise<TrainingPlan | null> {
  const prisma = getPrismaClient();

  if (prisma) {
    const plan = await prisma.trainingPlan.findFirst({
      where: { playerId },
      orderBy: { createdAt: "desc" },
    });

    return plan ? mapPrismaTrainingPlan(plan) : null;
  }

  const plans = await getPlayerTrainingPlans(playerId);
  return plans.length > 0 ? plans[0] : null;
}

/**
 * Get training plan by ID
 */
export async function getTrainingPlanById(id: string): Promise<TrainingPlan | null> {
  const prisma = getPrismaClient();

  if (prisma) {
    const plan = await prisma.trainingPlan.findUnique({ where: { id } });
    return plan ? mapPrismaTrainingPlan(plan) : null;
  }

  const lock = new FileLock(getTrainingPlansFile());
  const release = await lock.acquire();
  try {
    const plans = await readTrainingPlans();
    return plans.find((plan) => plan.id === id) || null;
  } finally {
    await release();
  }
}

/**
 * Create a new training plan
 */
export async function createTrainingPlan(
  planData: Omit<
    TrainingPlan,
    "id" | "createdAt" | "lastModified" | "version" | "sessionCount" | "lastReviewDate"
  >
): Promise<TrainingPlan> {
  const prisma = getPrismaClient();

  if (prisma) {
    await ensurePrismaMembers([planData.playerId, planData.createdBy]);
    const createdBy = await resolveCreatedBy(planData.createdBy);
    const createdPlan = await prisma.trainingPlan.create({
      data: {
        playerId: planData.playerId,
        focusAreas: planData.focusAreas,
        strengths: planData.strengths,
        areasForImprovement: planData.areasForImprovement,
        recommendations: planData.recommendations,
        suggestedDrills: planData.suggestedDrills,
        weeklyGoals: planData.weeklyGoals,
        progressNotes: planData.progressNotes,
        sessionCount: 0,
        lastReviewDate: new Date(),
        version: 1,
        status: TrainingPlanStatus.DRAFT,
        createdByUserId: createdBy.createdByUserId,
        createdByLabel: createdBy.createdByLabel,
      },
    });

    return mapPrismaTrainingPlan(createdPlan);
  }

  const lock = new FileLock(getTrainingPlansFile());
  const release = await lock.acquire();
  try {
    const plans = await readTrainingPlans();
    const now = new Date().toISOString();

    const newPlan: TrainingPlan = {
      ...planData,
      id: `train-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: now,
      lastModified: now,
      version: 1,
      sessionCount: 0,
      lastReviewDate: now,
    };

    plans.push(newPlan);
    await writeTrainingPlans(plans);

    return newPlan;
  } finally {
    await release();
  }
}

/**
 * Update an existing training plan
 */
export async function updateTrainingPlan(
  id: string,
  updates: Partial<Omit<TrainingPlan, "id" | "playerId" | "createdAt" | "createdBy">>
): Promise<TrainingPlan> {
  const prisma = getPrismaClient();

  if (prisma) {
    const existing = await prisma.trainingPlan.findUnique({ where: { id } });

    if (!existing) {
      throw new Error(`Training plan with id ${id} not found`);
    }

    const updatedPlan = await prisma.trainingPlan.update({
      where: { id },
      data: {
        ...(updates.focusAreas ? { focusAreas: updates.focusAreas } : {}),
        ...(updates.strengths ? { strengths: updates.strengths } : {}),
        ...(updates.areasForImprovement
          ? { areasForImprovement: updates.areasForImprovement }
          : {}),
        ...(updates.recommendations !== undefined
          ? { recommendations: updates.recommendations }
          : {}),
        ...(updates.suggestedDrills ? { suggestedDrills: updates.suggestedDrills } : {}),
        ...(updates.weeklyGoals ? { weeklyGoals: updates.weeklyGoals } : {}),
        ...(updates.progressNotes !== undefined ? { progressNotes: updates.progressNotes } : {}),
        ...(updates.sessionCount !== undefined ? { sessionCount: updates.sessionCount } : {}),
        ...(updates.lastReviewDate
          ? { lastReviewDate: new Date(updates.lastReviewDate) }
          : {}),
        version: existing.version + 1,
      },
    });

    return mapPrismaTrainingPlan(updatedPlan);
  }

  const lock = new FileLock(getTrainingPlansFile());
  const release = await lock.acquire();
  try {
    const plans = await readTrainingPlans();
    const index = plans.findIndex((plan) => plan.id === id);

    if (index === -1) {
      throw new Error(`Training plan with id ${id} not found`);
    }

    const updatedPlan: TrainingPlan = {
      ...plans[index],
      ...updates,
      lastModified: new Date().toISOString(),
      version: plans[index].version + 1,
    };

    plans[index] = updatedPlan;
    await writeTrainingPlans(plans);

    return updatedPlan;
  } finally {
    await release();
  }
}

/**
 * Delete a training plan
 */
export async function deleteTrainingPlan(id: string): Promise<boolean> {
  const prisma = getPrismaClient();

  if (prisma) {
    const deleted = await prisma.trainingPlan.deleteMany({ where: { id } });
    return deleted.count > 0;
  }

  const lock = new FileLock(getTrainingPlansFile());
  const release = await lock.acquire();
  try {
    const plans = await readTrainingPlans();
    const filteredPlans = plans.filter((plan) => plan.id !== id);

    if (filteredPlans.length === plans.length) {
      return false;
    }

    await writeTrainingPlans(filteredPlans);
    return true;
  } finally {
    await release();
  }
}
