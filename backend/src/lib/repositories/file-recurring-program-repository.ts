import { LessonStatus, ProgramStatus } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import { getPrismaClient } from "../db/prisma-client";
import { ensurePrismaCourt, ensurePrismaMembers } from "../db/prisma-legacy-sync";
import { FileLock } from "../utils/file-lock";
import {
  ProgramSession,
  ProgramSessionFilter,
  RecurringProgram,
  RecurringProgramFilter,
  RecurringProgramStatus,
} from "../../types/recurring-program";
import { PrivateLessonStatus } from "../../types/private-lesson";

function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.isAbsolute(process.env.DATA_DIR)
      ? process.env.DATA_DIR
      : path.join(process.cwd(), process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

function getProgramsFile(): string {
  return path.join(getDataDir(), "recurring-programs.json");
}

function getProgramSessionsFile(): string {
  return path.join(getDataDir(), "program-sessions.json");
}

function mapProgramStatus(status: ProgramStatus): RecurringProgramStatus {
  switch (status) {
    case ProgramStatus.PAUSED:
      return "paused";
    case ProgramStatus.COMPLETED:
      return "completed";
    case ProgramStatus.CANCELLED:
      return "cancelled";
    default:
      return "active";
  }
}

function toProgramStatus(status: RecurringProgramStatus): ProgramStatus {
  switch (status) {
    case "paused":
      return ProgramStatus.PAUSED;
    case "completed":
      return ProgramStatus.COMPLETED;
    case "cancelled":
      return ProgramStatus.CANCELLED;
    default:
      return ProgramStatus.ACTIVE;
  }
}

function mapSessionStatus(status: LessonStatus): PrivateLessonStatus {
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

function toSessionStatus(status: PrivateLessonStatus): LessonStatus {
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

function mapPrismaProgram(program: {
  id: string;
  name: string;
  coachUserId: string;
  courtId: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
  capacity: number;
  startsOn: string;
  endsOn: string | null;
  status: ProgramStatus;
  priceCents: number | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}): RecurringProgram {
  return {
    id: program.id,
    name: program.name,
    coachId: program.coachUserId,
    courtId: program.courtId || "",
    weekday: program.weekday,
    startTime: program.startTime,
    endTime: program.endTime,
    capacity: program.capacity,
    startsOn: program.startsOn,
    endsOn: program.endsOn || undefined,
    status: mapProgramStatus(program.status),
    price: program.priceCents ?? undefined,
    description: program.description || undefined,
    createdAt: program.createdAt.toISOString(),
    lastModified: program.updatedAt.toISOString(),
  };
}

function mapPrismaProgramSession(session: {
  id: string;
  programId: string;
  program: { name: string };
  coachUserId: string | null;
  courtId: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: LessonStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProgramSession {
  return {
    id: session.id,
    programId: session.programId,
    programName: session.program.name,
    coachId: session.coachUserId || "",
    courtId: session.courtId || "",
    date: session.sessionDate,
    startTime: session.startTime,
    endTime: session.endTime,
    status: mapSessionStatus(session.status),
    notes: session.notes || undefined,
    createdAt: session.createdAt.toISOString(),
    lastModified: session.updatedAt.toISOString(),
  };
}

async function ensureDataFiles(): Promise<void> {
  const dataDir = getDataDir();
  await fs.mkdir(dataDir, { recursive: true });

  for (const filePath of [getProgramsFile(), getProgramSessionsFile()]) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify([], null, 2));
    }
  }
}

async function readPrograms(): Promise<RecurringProgram[]> {
  await ensureDataFiles();

  try {
    const data = await fs.readFile(getProgramsFile(), "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading recurring programs:", error);
    return [];
  }
}

async function writePrograms(programs: RecurringProgram[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(getProgramsFile(), JSON.stringify(programs, null, 2));
}

async function readProgramSessions(): Promise<ProgramSession[]> {
  await ensureDataFiles();

  try {
    const data = await fs.readFile(getProgramSessionsFile(), "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading program sessions:", error);
    return [];
  }
}

async function writeProgramSessions(sessions: ProgramSession[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(getProgramSessionsFile(), JSON.stringify(sessions, null, 2));
}

function filterPrograms(
  programs: RecurringProgram[],
  filter?: RecurringProgramFilter
): RecurringProgram[] {
  if (!filter) {
    return programs;
  }

  let filtered = programs;

  if (filter.coachId) {
    filtered = filtered.filter((program) => program.coachId === filter.coachId);
  }

  if (filter.courtId) {
    filtered = filtered.filter((program) => program.courtId === filter.courtId);
  }

  if (filter.status) {
    filtered = filtered.filter((program) => program.status === filter.status);
  }

  return filtered.sort((a, b) => a.name.localeCompare(b.name));
}

function filterSessions(
  sessions: ProgramSession[],
  filter?: ProgramSessionFilter
): ProgramSession[] {
  if (!filter) {
    return sessions;
  }

  let filtered = sessions;

  if (filter.programId) {
    filtered = filtered.filter((session) => session.programId === filter.programId);
  }

  if (filter.coachId) {
    filtered = filtered.filter((session) => session.coachId === filter.coachId);
  }

  if (filter.courtId) {
    filtered = filtered.filter((session) => session.courtId === filter.courtId);
  }

  if (filter.status) {
    filtered = filtered.filter((session) => session.status === filter.status);
  }

  if (filter.dateFrom) {
    filtered = filtered.filter((session) => session.date >= filter.dateFrom!);
  }

  if (filter.dateTo) {
    filtered = filtered.filter((session) => session.date <= filter.dateTo!);
  }

  return filtered.sort((a, b) =>
    `${a.date}-${a.startTime}`.localeCompare(`${b.date}-${b.startTime}`)
  );
}

export class FileRecurringProgramRepository {
  async findAllPrograms(filter?: RecurringProgramFilter): Promise<RecurringProgram[]> {
    const prisma = getPrismaClient();

    if (prisma) {
      const programs = await prisma.recurringProgram.findMany({
        where: {
          ...(filter?.coachId ? { coachUserId: filter.coachId } : {}),
          ...(filter?.courtId ? { courtId: filter.courtId } : {}),
          ...(filter?.status ? { status: toProgramStatus(filter.status) } : {}),
        },
        orderBy: { name: "asc" },
      });

      return programs.map(mapPrismaProgram);
    }

    const programs = await readPrograms();
    return filterPrograms(programs, filter);
  }

  async findProgramById(id: string): Promise<RecurringProgram | null> {
    const prisma = getPrismaClient();

    if (prisma) {
      const program = await prisma.recurringProgram.findUnique({ where: { id } });
      return program ? mapPrismaProgram(program) : null;
    }

    const programs = await readPrograms();
    return programs.find((program) => program.id === id) || null;
  }

  async createProgram(
    programData: Omit<RecurringProgram, "id" | "createdAt" | "lastModified">
  ): Promise<RecurringProgram> {
    const prisma = getPrismaClient();

    if (prisma) {
      await ensurePrismaMembers([programData.coachId]);
      await ensurePrismaCourt(programData.courtId || undefined);

      const program = await prisma.recurringProgram.create({
        data: {
          name: programData.name,
          coachUserId: programData.coachId,
          courtId: programData.courtId || null,
          weekday: programData.weekday,
          startTime: programData.startTime,
          endTime: programData.endTime,
          capacity: programData.capacity,
          startsOn: programData.startsOn,
          endsOn: programData.endsOn,
          status: toProgramStatus(programData.status),
          priceCents: programData.price,
          description: programData.description,
        },
      });

      return mapPrismaProgram(program);
    }

    const lock = new FileLock(getProgramsFile());
    const release = await lock.acquire();

    try {
      const programs = await readPrograms();
      const now = new Date().toISOString();

      const program: RecurringProgram = {
        ...programData,
        id: `program-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: now,
        lastModified: now,
      };

      programs.push(program);
      await writePrograms(programs);
      return program;
    } finally {
      await release();
    }
  }

  async updateProgram(id: string, updates: Partial<RecurringProgram>): Promise<RecurringProgram> {
    const prisma = getPrismaClient();

    if (prisma) {
      await ensurePrismaMembers([updates.coachId]);
      await ensurePrismaCourt(updates.courtId || undefined);

      const program = await prisma.recurringProgram.update({
        where: { id },
        data: {
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.coachId ? { coachUserId: updates.coachId } : {}),
          ...(updates.courtId !== undefined ? { courtId: updates.courtId || null } : {}),
          ...(updates.weekday !== undefined ? { weekday: updates.weekday } : {}),
          ...(updates.startTime !== undefined ? { startTime: updates.startTime } : {}),
          ...(updates.endTime !== undefined ? { endTime: updates.endTime } : {}),
          ...(updates.capacity !== undefined ? { capacity: updates.capacity } : {}),
          ...(updates.startsOn !== undefined ? { startsOn: updates.startsOn } : {}),
          ...(updates.endsOn !== undefined ? { endsOn: updates.endsOn || null } : {}),
          ...(updates.status ? { status: toProgramStatus(updates.status) } : {}),
          ...(updates.price !== undefined ? { priceCents: updates.price } : {}),
          ...(updates.description !== undefined ? { description: updates.description } : {}),
        },
      });

      return mapPrismaProgram(program);
    }

    const lock = new FileLock(getProgramsFile());
    const release = await lock.acquire();

    try {
      const programs = await readPrograms();
      const index = programs.findIndex((program) => program.id === id);

      if (index === -1) {
        throw new Error(`Recurring program ${id} not found`);
      }

      const updatedProgram: RecurringProgram = {
        ...programs[index],
        ...updates,
        id,
        lastModified: new Date().toISOString(),
      };

      programs[index] = updatedProgram;
      await writePrograms(programs);
      return updatedProgram;
    } finally {
      await release();
    }
  }

  async findAllSessions(filter?: ProgramSessionFilter): Promise<ProgramSession[]> {
    const prisma = getPrismaClient();

    if (prisma) {
      const sessions = await prisma.programSession.findMany({
        where: {
          ...(filter?.programId ? { programId: filter.programId } : {}),
          ...(filter?.coachId ? { coachUserId: filter.coachId } : {}),
          ...(filter?.courtId ? { courtId: filter.courtId } : {}),
          ...(filter?.status ? { status: toSessionStatus(filter.status) } : {}),
          ...(filter?.dateFrom || filter?.dateTo
            ? {
                sessionDate: {
                  ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
                  ...(filter.dateTo ? { lte: filter.dateTo } : {}),
                },
              }
            : {}),
        },
        include: {
          program: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
      });

      return sessions.map(mapPrismaProgramSession);
    }

    const sessions = await readProgramSessions();
    return filterSessions(sessions, filter);
  }

  async replaceSessionsForProgram(programId: string, sessions: ProgramSession[]): Promise<void> {
    const prisma = getPrismaClient();

    if (prisma) {
      for (const session of sessions) {
        await ensurePrismaCourt(session.courtId || undefined);
        await ensurePrismaMembers([session.coachId]);
      }

      await prisma.$transaction(async (tx) => {
        await tx.programSession.deleteMany({
          where: { programId },
        });

        if (sessions.length > 0) {
          await tx.programSession.createMany({
            data: sessions.map((session) => ({
              id: session.id,
              programId,
              sessionDate: session.date,
              courtId: session.courtId || null,
              coachUserId: session.coachId || null,
              startTime: session.startTime,
              endTime: session.endTime,
              status: toSessionStatus(session.status),
              notes: session.notes,
              createdAt: new Date(session.createdAt),
              updatedAt: new Date(session.lastModified),
            })),
          });
        }
      });
      return;
    }

    const lock = new FileLock(getProgramSessionsFile());
    const release = await lock.acquire();

    try {
      const existingSessions = await readProgramSessions();
      const retainedSessions = existingSessions.filter((session) => session.programId !== programId);
      await writeProgramSessions([...retainedSessions, ...sessions]);
    } finally {
      await release();
    }
  }
}

export const recurringProgramRepository = new FileRecurringProgramRepository();
