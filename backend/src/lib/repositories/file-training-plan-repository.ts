/**
 * File-based repository for training plan data
 */

import { promises as fs } from "fs";
import path from "path";
import { TrainingPlan } from "../../types/training-plan";
import { FileLock } from "../utils/file-lock";

const DATA_DIR = process.env.DATA_DIR
  ? path.isAbsolute(process.env.DATA_DIR)
    ? process.env.DATA_DIR
    : path.join(process.cwd(), process.env.DATA_DIR)
  : path.join(process.cwd(), "data");
const TRAINING_PLANS_FILE = path.join(DATA_DIR, "training-plans.json");

/**
 * Ensure data directory and file exist
 */
async function ensureDataFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(TRAINING_PLANS_FILE);
    } catch {
      await fs.writeFile(TRAINING_PLANS_FILE, JSON.stringify([], null, 2));
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
  const data = await fs.readFile(TRAINING_PLANS_FILE, "utf-8");
  return JSON.parse(data);
}

/**
 * Write training plans to file
 */
async function writeTrainingPlans(plans: TrainingPlan[]): Promise<void> {
  await fs.writeFile(TRAINING_PLANS_FILE, JSON.stringify(plans, null, 2));
}

/**
 * Get all training plans for a player
 */
export async function getPlayerTrainingPlans(playerId: string): Promise<TrainingPlan[]> {
  const lock = new FileLock(TRAINING_PLANS_FILE);
  const release = await lock.acquire();
  try {
    const plans = await readTrainingPlans();
    return plans.filter(plan => plan.playerId === playerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } finally {
    await release();
  }
}

/**
 * Get the latest training plan for a player
 */
export async function getLatestTrainingPlan(playerId: string): Promise<TrainingPlan | null> {
  const plans = await getPlayerTrainingPlans(playerId);
  return plans.length > 0 ? plans[0] : null;
}

/**
 * Get training plan by ID
 */
export async function getTrainingPlanById(id: string): Promise<TrainingPlan | null> {
  const lock = new FileLock(TRAINING_PLANS_FILE);
  const release = await lock.acquire();
  try {
    const plans = await readTrainingPlans();
    return plans.find(plan => plan.id === id) || null;
  } finally {
    await release();
  }
}

/**
 * Create a new training plan
 */
export async function createTrainingPlan(
  planData: Omit<TrainingPlan, "id" | "createdAt" | "lastModified" | "version" | "sessionCount" | "lastReviewDate">
): Promise<TrainingPlan> {
  const lock = new FileLock(TRAINING_PLANS_FILE);
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
  const lock = new FileLock(TRAINING_PLANS_FILE);
  const release = await lock.acquire();
  try {
    const plans = await readTrainingPlans();
    const index = plans.findIndex(plan => plan.id === id);
    
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
  const lock = new FileLock(TRAINING_PLANS_FILE);
  const release = await lock.acquire();
  try {
    const plans = await readTrainingPlans();
    const filteredPlans = plans.filter(plan => plan.id !== id);
    
    if (filteredPlans.length === plans.length) {
      return false; // Plan not found
    }
    
    await writeTrainingPlans(filteredPlans);
    return true;
  } finally {
    await release();
  }
}
