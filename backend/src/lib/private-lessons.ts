import { getCourt, getReservationsByDate } from "./reservations";
import { getMember } from "./members";
import { timeRangesOverlap } from "./utils/time-ranges";
import { privateLessonRepository } from "./repositories/file-private-lesson-repository";
import { recurringProgramRepository } from "./repositories/file-recurring-program-repository";
import { PrivateLesson, PrivateLessonFilter, PrivateLessonRequest } from "../types/private-lesson";
import { ConflictError, NotFoundError, ValidationError } from "./errors/reservation-errors";

function lessonBlocksSchedule(status: PrivateLesson["status"]): boolean {
  return status !== "cancelled";
}

async function ensureCourtAvailability(
  courtId: string,
  date: string,
  start: string,
  end: string,
  excludeLessonId?: string
): Promise<void> {
  const [reservations, lessons, sessions] = await Promise.all([
    getReservationsByDate(date),
    privateLessonRepository.findAll({ courtId, dateFrom: date, dateTo: date }),
    recurringProgramRepository.findAllSessions({ courtId, dateFrom: date, dateTo: date }),
  ]);

  const conflictingReservation = reservations.find(
    (reservation) =>
      reservation.courtId === courtId &&
      reservation.status !== "cancelled" &&
      timeRangesOverlap(start, end, reservation.timeSlot.start, reservation.timeSlot.end)
  );

  if (conflictingReservation) {
    throw new ConflictError("Court is already booked for that time");
  }

  const conflictingLesson = lessons.find(
    (lesson) =>
      lesson.id !== excludeLessonId &&
      lessonBlocksSchedule(lesson.status) &&
      timeRangesOverlap(start, end, lesson.timeSlot.start, lesson.timeSlot.end)
  );

  if (conflictingLesson) {
    throw new ConflictError("Court already has a private lesson scheduled for that time");
  }

  const conflictingSession = sessions.find(
    (session) =>
      lessonBlocksSchedule(session.status) &&
      timeRangesOverlap(start, end, session.startTime, session.endTime)
  );

  if (conflictingSession) {
    throw new ConflictError("Court already has a recurring program session scheduled for that time");
  }
}

export async function listPrivateLessons(filter?: PrivateLessonFilter): Promise<PrivateLesson[]> {
  return privateLessonRepository.findAll(filter);
}

export async function getPrivateLesson(id: string): Promise<PrivateLesson> {
  const lesson = await privateLessonRepository.findById(id);

  if (!lesson) {
    throw new NotFoundError(`Private lesson ${id} not found`);
  }

  return lesson;
}

export async function createPrivateLesson(
  lessonData: PrivateLessonRequest
): Promise<PrivateLesson> {
  if (
    !lessonData.courtId ||
    !lessonData.coachId ||
    !lessonData.playerId ||
    !lessonData.date ||
    !lessonData.timeSlot?.start ||
    !lessonData.timeSlot?.end
  ) {
    throw new ValidationError("Missing required fields for private lesson");
  }

  const [court, coach, player] = await Promise.all([
    getCourt(lessonData.courtId),
    getMember(lessonData.coachId),
    getMember(lessonData.playerId),
  ]);

  if (!court) {
    throw new ValidationError(`Court ${lessonData.courtId} not found`);
  }

  if (!coach.isActive || !player.isActive) {
    throw new ValidationError("Coach and player must both be active");
  }

  await ensureCourtAvailability(
    lessonData.courtId,
    lessonData.date,
    lessonData.timeSlot.start,
    lessonData.timeSlot.end
  );

  return privateLessonRepository.create({
    courtId: lessonData.courtId,
    courtName: court.name,
    coachId: lessonData.coachId,
    playerId: lessonData.playerId,
    date: lessonData.date,
    timeSlot: lessonData.timeSlot,
    status: "scheduled",
    lessonType: lessonData.lessonType,
    price: lessonData.price,
    notes: lessonData.notes,
  });
}

export async function updatePrivateLesson(
  id: string,
  updates: Partial<PrivateLessonRequest & { status: PrivateLesson["status"] }>
): Promise<PrivateLesson> {
  const existingLesson = await getPrivateLesson(id);

  const nextLesson = {
    ...existingLesson,
    ...updates,
    timeSlot: updates.timeSlot || existingLesson.timeSlot,
    courtId: updates.courtId || existingLesson.courtId,
    date: updates.date || existingLesson.date,
  };

  if (
    nextLesson.status !== "cancelled" &&
    (
      nextLesson.courtId !== existingLesson.courtId ||
      nextLesson.date !== existingLesson.date ||
      nextLesson.timeSlot.start !== existingLesson.timeSlot.start ||
      nextLesson.timeSlot.end !== existingLesson.timeSlot.end
    )
  ) {
    await ensureCourtAvailability(
      nextLesson.courtId,
      nextLesson.date,
      nextLesson.timeSlot.start,
      nextLesson.timeSlot.end,
      id
    );
  }

  let courtName = existingLesson.courtName;
  if (updates.courtId && updates.courtId !== existingLesson.courtId) {
    const court = await getCourt(updates.courtId);
    if (!court) {
      throw new ValidationError(`Court ${updates.courtId} not found`);
    }
    courtName = court.name;
  }

  return privateLessonRepository.update(id, {
    ...updates,
    courtName,
  });
}
