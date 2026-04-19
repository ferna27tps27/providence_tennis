import { LessonStatus } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import { getPrismaClient } from "../db/prisma-client";
import { ensurePrismaCourt, ensurePrismaMembers } from "../db/prisma-legacy-sync";
import { FileLock } from "../utils/file-lock";
import { PrivateLesson, PrivateLessonFilter, PrivateLessonStatus } from "../../types/private-lesson";

function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.isAbsolute(process.env.DATA_DIR)
      ? process.env.DATA_DIR
      : path.join(process.cwd(), process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

function getPrivateLessonsFile(): string {
  return path.join(getDataDir(), "private-lessons.json");
}

function mapLessonStatus(status: LessonStatus): PrivateLessonStatus {
  switch (status) {
    case LessonStatus.COMPLETED:
      return "completed";
    case LessonStatus.CANCELLED:
      return "cancelled";
    case LessonStatus.NO_SHOW:
      return "no_show";
    default:
      return "scheduled";
  }
}

function toLessonStatus(status: PrivateLessonStatus): LessonStatus {
  switch (status) {
    case "completed":
      return LessonStatus.COMPLETED;
    case "cancelled":
      return LessonStatus.CANCELLED;
    case "no_show":
      return LessonStatus.NO_SHOW;
    default:
      return LessonStatus.SCHEDULED;
  }
}

function mapPrismaLesson(lesson: {
  id: string;
  courtId: string;
  court: { name: string } | null;
  coachUserId: string;
  playerUserId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: LessonStatus;
  lessonType: string | null;
  priceCents: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PrivateLesson {
  return {
    id: lesson.id,
    courtId: lesson.courtId,
    courtName: lesson.court?.name || "",
    coachId: lesson.coachUserId,
    playerId: lesson.playerUserId,
    date: lesson.scheduledDate,
    timeSlot: {
      start: lesson.startTime,
      end: lesson.endTime,
    },
    status: mapLessonStatus(lesson.status),
    lessonType: lesson.lessonType || undefined,
    price: lesson.priceCents ?? undefined,
    notes: lesson.notes || undefined,
    createdAt: lesson.createdAt.toISOString(),
    lastModified: lesson.updatedAt.toISOString(),
  };
}

async function ensureDataFiles(): Promise<void> {
  const dataDir = getDataDir();
  const privateLessonsFile = getPrivateLessonsFile();
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(privateLessonsFile);
  } catch {
    await fs.writeFile(privateLessonsFile, JSON.stringify([], null, 2));
  }
}

async function readPrivateLessons(): Promise<PrivateLesson[]> {
  await ensureDataFiles();

  try {
    const data = await fs.readFile(getPrivateLessonsFile(), "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading private lessons:", error);
    return [];
  }
}

async function writePrivateLessons(lessons: PrivateLesson[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(getPrivateLessonsFile(), JSON.stringify(lessons, null, 2));
}

function filterLessons(lessons: PrivateLesson[], filter?: PrivateLessonFilter): PrivateLesson[] {
  if (!filter) {
    return lessons;
  }

  let filtered = lessons;

  if (filter.coachId) {
    filtered = filtered.filter((lesson) => lesson.coachId === filter.coachId);
  }

  if (filter.playerId) {
    filtered = filtered.filter((lesson) => lesson.playerId === filter.playerId);
  }

  if (filter.courtId) {
    filtered = filtered.filter((lesson) => lesson.courtId === filter.courtId);
  }

  if (filter.status) {
    filtered = filtered.filter((lesson) => lesson.status === filter.status);
  }

  if (filter.dateFrom) {
    filtered = filtered.filter((lesson) => lesson.date >= filter.dateFrom!);
  }

  if (filter.dateTo) {
    filtered = filtered.filter((lesson) => lesson.date <= filter.dateTo!);
  }

  return filtered.sort((a, b) =>
    `${a.date}-${a.timeSlot.start}`.localeCompare(`${b.date}-${b.timeSlot.start}`)
  );
}

export class FilePrivateLessonRepository {
  async findAll(filter?: PrivateLessonFilter): Promise<PrivateLesson[]> {
    const prisma = getPrismaClient();

    if (prisma) {
      const lessons = await prisma.privateLesson.findMany({
        where: {
          ...(filter?.coachId ? { coachUserId: filter.coachId } : {}),
          ...(filter?.playerId ? { playerUserId: filter.playerId } : {}),
          ...(filter?.courtId ? { courtId: filter.courtId } : {}),
          ...(filter?.status ? { status: toLessonStatus(filter.status) } : {}),
          ...(filter?.dateFrom || filter?.dateTo
            ? {
                scheduledDate: {
                  ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
                  ...(filter.dateTo ? { lte: filter.dateTo } : {}),
                },
              }
            : {}),
        },
        include: {
          court: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
      });

      return lessons.map(mapPrismaLesson);
    }

    const lessons = await readPrivateLessons();
    return filterLessons(lessons, filter);
  }

  async findById(id: string): Promise<PrivateLesson | null> {
    const prisma = getPrismaClient();

    if (prisma) {
      const lesson = await prisma.privateLesson.findUnique({
        where: { id },
        include: {
          court: {
            select: {
              name: true,
            },
          },
        },
      });

      return lesson ? mapPrismaLesson(lesson) : null;
    }

    const lessons = await readPrivateLessons();
    return lessons.find((lesson) => lesson.id === id) || null;
  }

  async create(
    lessonData: Omit<PrivateLesson, "id" | "createdAt" | "lastModified">
  ): Promise<PrivateLesson> {
    const prisma = getPrismaClient();

    if (prisma) {
      await ensurePrismaCourt(lessonData.courtId);
      await ensurePrismaMembers([lessonData.coachId, lessonData.playerId]);

      const lesson = await prisma.privateLesson.create({
        data: {
          courtId: lessonData.courtId,
          coachUserId: lessonData.coachId,
          playerUserId: lessonData.playerId,
          scheduledDate: lessonData.date,
          startTime: lessonData.timeSlot.start,
          endTime: lessonData.timeSlot.end,
          status: toLessonStatus(lessonData.status),
          lessonType: lessonData.lessonType,
          priceCents: lessonData.price,
          notes: lessonData.notes,
        },
        include: {
          court: {
            select: {
              name: true,
            },
          },
        },
      });

      return mapPrismaLesson(lesson);
    }

    const lock = new FileLock(getPrivateLessonsFile());
    const release = await lock.acquire();

    try {
      const lessons = await readPrivateLessons();
      const now = new Date().toISOString();

      const lesson: PrivateLesson = {
        ...lessonData,
        id: `lesson-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: now,
        lastModified: now,
      };

      lessons.push(lesson);
      await writePrivateLessons(lessons);
      return lesson;
    } finally {
      await release();
    }
  }

  async update(id: string, updates: Partial<PrivateLesson>): Promise<PrivateLesson> {
    const prisma = getPrismaClient();

    if (prisma) {
      await ensurePrismaCourt(updates.courtId);
      await ensurePrismaMembers([updates.coachId, updates.playerId]);

      const lesson = await prisma.privateLesson.update({
        where: { id },
        data: {
          ...(updates.courtId ? { courtId: updates.courtId } : {}),
          ...(updates.coachId ? { coachUserId: updates.coachId } : {}),
          ...(updates.playerId ? { playerUserId: updates.playerId } : {}),
          ...(updates.date ? { scheduledDate: updates.date } : {}),
          ...(updates.timeSlot
            ? {
                startTime: updates.timeSlot.start,
                endTime: updates.timeSlot.end,
              }
            : {}),
          ...(updates.status ? { status: toLessonStatus(updates.status) } : {}),
          ...(updates.lessonType !== undefined ? { lessonType: updates.lessonType } : {}),
          ...(updates.price !== undefined ? { priceCents: updates.price } : {}),
          ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
        },
        include: {
          court: {
            select: {
              name: true,
            },
          },
        },
      });

      return mapPrismaLesson(lesson);
    }

    const lock = new FileLock(getPrivateLessonsFile());
    const release = await lock.acquire();

    try {
      const lessons = await readPrivateLessons();
      const index = lessons.findIndex((lesson) => lesson.id === id);

      if (index === -1) {
        throw new Error(`Private lesson ${id} not found`);
      }

      const updatedLesson: PrivateLesson = {
        ...lessons[index],
        ...updates,
        id,
        lastModified: new Date().toISOString(),
      };

      lessons[index] = updatedLesson;
      await writePrivateLessons(lessons);
      return updatedLesson;
    } finally {
      await release();
    }
  }
}

export const privateLessonRepository = new FilePrivateLessonRepository();
