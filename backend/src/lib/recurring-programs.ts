import { getCourt, getReservationsByDate } from "./reservations";
import { getMember } from "./members";
import { timeRangesOverlap } from "./utils/time-ranges";
import { privateLessonRepository } from "./repositories/file-private-lesson-repository";
import { recurringProgramRepository } from "./repositories/file-recurring-program-repository";
import {
  ProgramSession,
  ProgramSessionFilter,
  RecurringProgram,
  RecurringProgramFilter,
  RecurringProgramRequest,
} from "../types/recurring-program";
import { ConflictError, NotFoundError, ValidationError } from "./errors/reservation-errors";

function programBlocksSchedule(status: ProgramSession["status"]): boolean {
  return status !== "cancelled";
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function generateSessionDates(program: {
  weekday: number;
  startsOn: string;
  endsOn?: string;
}): string[] {
  const startDate = new Date(`${program.startsOn}T00:00:00Z`);
  const explicitEnd = program.endsOn
    ? new Date(`${program.endsOn}T00:00:00Z`)
    : addDays(startDate, 84);
  const dates: string[] = [];

  for (
    let cursor = new Date(startDate);
    cursor <= explicitEnd;
    cursor = addDays(cursor, 1)
  ) {
    if (cursor.getUTCDay() === program.weekday) {
      dates.push(toDateString(cursor));
    }
  }

  return dates;
}

async function ensureProgramSessionsAvailable(
  courtId: string,
  startTime: string,
  endTime: string,
  dates: string[],
  excludeProgramId?: string
): Promise<void> {
  for (const date of dates) {
    const [reservations, lessons, sessions] = await Promise.all([
      getReservationsByDate(date),
      privateLessonRepository.findAll({ courtId, dateFrom: date, dateTo: date }),
      recurringProgramRepository.findAllSessions({ courtId, dateFrom: date, dateTo: date }),
    ]);

    const conflictingReservation = reservations.find(
      (reservation) =>
        reservation.courtId === courtId &&
        reservation.status !== "cancelled" &&
        timeRangesOverlap(startTime, endTime, reservation.timeSlot.start, reservation.timeSlot.end)
    );

    if (conflictingReservation) {
      throw new ConflictError(`Recurring program conflicts with a reservation on ${date}`);
    }

    const conflictingLesson = lessons.find(
      (lesson) =>
        lesson.status !== "cancelled" &&
        timeRangesOverlap(startTime, endTime, lesson.timeSlot.start, lesson.timeSlot.end)
    );

    if (conflictingLesson) {
      throw new ConflictError(`Recurring program conflicts with a private lesson on ${date}`);
    }

    const conflictingSession = sessions.find(
      (session) =>
        session.programId !== excludeProgramId &&
        programBlocksSchedule(session.status) &&
        timeRangesOverlap(startTime, endTime, session.startTime, session.endTime)
    );

    if (conflictingSession) {
      throw new ConflictError(`Recurring program conflicts with another program session on ${date}`);
    }
  }
}

function buildProgramSessions(program: RecurringProgram): ProgramSession[] {
  const now = new Date().toISOString();

  return generateSessionDates(program).map((date, index) => ({
    id: `program-session-${program.id}-${date}-${index}`,
    programId: program.id,
    programName: program.name,
    coachId: program.coachId,
    courtId: program.courtId,
    date,
    startTime: program.startTime,
    endTime: program.endTime,
    status: "scheduled",
    createdAt: now,
    lastModified: now,
  }));
}

export async function listRecurringPrograms(
  filter?: RecurringProgramFilter
): Promise<RecurringProgram[]> {
  return recurringProgramRepository.findAllPrograms(filter);
}

export async function getRecurringProgram(id: string): Promise<RecurringProgram> {
  const program = await recurringProgramRepository.findProgramById(id);

  if (!program) {
    throw new NotFoundError(`Recurring program ${id} not found`);
  }

  return program;
}

export async function createRecurringProgram(
  programData: RecurringProgramRequest
): Promise<RecurringProgram> {
  if (
    !programData.name ||
    !programData.coachId ||
    !programData.courtId ||
    programData.weekday === undefined ||
    !programData.startTime ||
    !programData.endTime ||
    !programData.capacity ||
    !programData.startsOn
  ) {
    throw new ValidationError("Missing required fields for recurring program");
  }

  if (programData.weekday < 0 || programData.weekday > 6) {
    throw new ValidationError("weekday must be between 0 and 6");
  }

  const [court, coach] = await Promise.all([
    getCourt(programData.courtId),
    getMember(programData.coachId),
  ]);

  if (!court) {
    throw new ValidationError(`Court ${programData.courtId} not found`);
  }

  if (!coach.isActive) {
    throw new ValidationError("Coach must be active");
  }

  const dates = generateSessionDates(programData);
  await ensureProgramSessionsAvailable(
    programData.courtId,
    programData.startTime,
    programData.endTime,
    dates
  );

  const program = await recurringProgramRepository.createProgram({
    name: programData.name,
    coachId: programData.coachId,
    courtId: programData.courtId,
    weekday: programData.weekday,
    startTime: programData.startTime,
    endTime: programData.endTime,
    capacity: programData.capacity,
    startsOn: programData.startsOn,
    endsOn: programData.endsOn,
    status: "active",
    price: programData.price,
    description: programData.description,
  });

  await recurringProgramRepository.replaceSessionsForProgram(program.id, buildProgramSessions(program));
  return program;
}

export async function updateRecurringProgram(
  id: string,
  updates: Partial<RecurringProgramRequest & { status: RecurringProgram["status"] }>
): Promise<RecurringProgram> {
  const existingProgram = await getRecurringProgram(id);
  const nextProgram: RecurringProgram = {
    ...existingProgram,
    ...updates,
    lastModified: existingProgram.lastModified,
  };

  const sessionDates = generateSessionDates(nextProgram);
  if (nextProgram.status !== "cancelled") {
    await ensureProgramSessionsAvailable(
      nextProgram.courtId,
      nextProgram.startTime,
      nextProgram.endTime,
      sessionDates,
      id
    );
  }

  const updatedProgram = await recurringProgramRepository.updateProgram(id, updates);

  const nextSessions = updatedProgram.status === "cancelled"
    ? []
    : buildProgramSessions(updatedProgram);

  await recurringProgramRepository.replaceSessionsForProgram(id, nextSessions);
  return updatedProgram;
}

export async function listProgramSessions(
  filter?: ProgramSessionFilter
): Promise<ProgramSession[]> {
  return recurringProgramRepository.findAllSessions(filter);
}
