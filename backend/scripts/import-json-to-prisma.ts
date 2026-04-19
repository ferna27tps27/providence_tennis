import "dotenv/config";

import { promises as fs } from "fs";
import path from "path";

import {
  BillingPeriod,
  CourtSurface,
  LessonStatus,
  LessonPackageStatus,
  MembershipStatus,
  PaymentStatus,
  PaymentType,
  PrismaClient,
  ProgramStatus,
  ReservationStatus,
  TrainingPlanStatus,
  UserRole,
} from "@prisma/client";

type JsonMember = {
  id: string;
  memberNumber?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isActive?: boolean;
  role?: string;
  penaltyCancellations?: number;
  unsubscribeEmail?: boolean;
  passwordHash?: string;
  emailVerified?: boolean;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  notes?: string;
  ntrpRating?: string;
  ustaNumber?: string;
  createdAt?: string;
  lastModified?: string;
};

type JsonCourt = {
  id: string;
  name: string;
  type: string;
  available?: boolean;
};

type JsonReservation = {
  id: string;
  courtId: string;
  courtName?: string;
  date: string;
  timeSlot: {
    start: string;
    end: string;
  };
  memberId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  createdAt?: string;
  status?: string;
  paymentId?: string;
  paymentStatus?: string;
  paymentAmount?: number;
};

type JsonPayment = {
  id: string;
  memberId?: string;
  reservationId?: string;
  type: string;
  amount: number;
  currency?: string;
  status?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  description?: string;
  metadata?: Record<string, string>;
  createdAt?: string;
  lastModified?: string;
  paidAt?: string;
  refundedAt?: string;
  refundAmount?: number;
};

type JsonJournalEntry = {
  id: string;
  playerId: string;
  coachId: string;
  reservationId?: string;
  sessionDate: string;
  sessionTime?: string;
  summary: string;
  areasWorkedOn: string[];
  pointersForNextSession: string;
  additionalNotes?: string;
  playerReflection?: string;
  createdAt?: string;
  lastModified?: string;
  createdBy?: string;
};

type JsonTrainingPlan = {
  id: string;
  playerId: string;
  focusAreas: string[];
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string;
  suggestedDrills: string[];
  weeklyGoals: string[];
  progressNotes?: string;
  createdBy?: string;
  createdAt?: string;
  lastModified?: string;
  version?: number;
  sessionCount?: number;
  lastReviewDate?: string;
};

type JsonMembership = {
  id: string;
  memberId: string;
  planName: string;
  billingPeriod: string;
  price: number;
  status?: string;
  startsOn: string;
  endsOn?: string;
  notes?: string;
  paymentId?: string;
  createdAt?: string;
  lastModified?: string;
};

type JsonLessonPackage = {
  id: string;
  memberId: string;
  coachId?: string;
  packageName: string;
  sessionCountTotal: number;
  sessionCountUsed?: number;
  price: number;
  expiresOn?: string;
  status?: string;
  notes?: string;
  paymentId?: string;
  createdAt?: string;
  lastModified?: string;
};

type JsonPrivateLesson = {
  id: string;
  courtId: string;
  courtName?: string;
  coachId: string;
  playerId: string;
  date: string;
  timeSlot: {
    start: string;
    end: string;
  };
  status?: string;
  lessonType?: string;
  price?: number;
  notes?: string;
  createdAt?: string;
  lastModified?: string;
};

type JsonRecurringProgram = {
  id: string;
  name: string;
  coachId: string;
  courtId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  capacity: number;
  startsOn: string;
  endsOn?: string;
  status?: string;
  price?: number;
  description?: string;
  createdAt?: string;
  lastModified?: string;
};

type JsonProgramSession = {
  id: string;
  programId: string;
  programName?: string;
  coachId?: string;
  courtId?: string;
  date: string;
  startTime: string;
  endTime: string;
  status?: string;
  notes?: string;
  createdAt?: string;
  lastModified?: string;
};

type ImportSummary = {
  courts: number;
  users: number;
  reservations: number;
  privateLessons: number;
  recurringPrograms: number;
  programSessions: number;
  payments: number;
  memberships: number;
  lessonPackages: number;
  journalEntries: number;
  trainingPlans: number;
  warnings: string[];
};

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

function resolveDataDir(): string {
  const configured = process.env.DATA_DIR;

  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured);
  }

  return path.join(process.cwd(), "data");
}

async function readJsonArray<T>(filename: string): Promise<T[]> {
  const filePath = path.join(resolveDataDir(), filename);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function toDateTime(value?: string): Date {
  return value ? new Date(value) : new Date();
}

function mapUserRole(role?: string): UserRole {
  switch ((role || "player").toLowerCase()) {
    case "owner":
      return UserRole.OWNER;
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

function mapCourtSurface(type?: string): CourtSurface {
  switch ((type || "hard").toLowerCase()) {
    case "clay":
      return CourtSurface.CLAY;
    case "indoor":
      return CourtSurface.INDOOR;
    default:
      return CourtSurface.HARD;
  }
}

function mapReservationStatus(status?: string): ReservationStatus {
  switch ((status || "confirmed").toLowerCase()) {
    case "pending_payment":
      return ReservationStatus.PENDING_PAYMENT;
    case "cancelled":
      return ReservationStatus.CANCELLED;
    default:
      return ReservationStatus.CONFIRMED;
  }
}

function mapPaymentStatus(status?: string): PaymentStatus {
  switch ((status || "pending").toLowerCase()) {
    case "paid":
      return PaymentStatus.PAID;
    case "refunded":
      return PaymentStatus.REFUNDED;
    case "failed":
      return PaymentStatus.FAILED;
    case "cancelled":
      return PaymentStatus.CANCELLED;
    default:
      return PaymentStatus.PENDING;
  }
}

function mapPaymentType(type?: string): PaymentType {
  switch ((type || "other").toLowerCase()) {
    case "court_booking":
      return PaymentType.COURT_BOOKING;
    case "membership":
      return PaymentType.MEMBERSHIP;
    case "lesson_package":
      return PaymentType.LESSON_PACKAGE;
    case "private_lesson":
      return PaymentType.PRIVATE_LESSON;
    case "program_fee":
      return PaymentType.PROGRAM_FEE;
    case "refund":
      return PaymentType.REFUND;
    case "manual_charge":
      return PaymentType.MANUAL_CHARGE;
    default:
      return PaymentType.OTHER;
  }
}

function mapLessonStatus(status?: string): LessonStatus {
  switch ((status || "scheduled").toLowerCase()) {
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

function mapProgramStatus(status?: string): ProgramStatus {
  switch ((status || "active").toLowerCase()) {
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

function mapBillingPeriod(period?: string): BillingPeriod {
  switch ((period || "monthly").toLowerCase()) {
    case "quarterly":
      return BillingPeriod.QUARTERLY;
    case "yearly":
      return BillingPeriod.YEARLY;
    case "custom":
      return BillingPeriod.CUSTOM;
    default:
      return BillingPeriod.MONTHLY;
  }
}

function mapMembershipStatus(status?: string): MembershipStatus {
  switch ((status || "active").toLowerCase()) {
    case "paused":
      return MembershipStatus.PAUSED;
    case "cancelled":
      return MembershipStatus.CANCELLED;
    case "expired":
      return MembershipStatus.EXPIRED;
    default:
      return MembershipStatus.ACTIVE;
  }
}

function mapLessonPackageStatus(status?: string): LessonPackageStatus {
  switch ((status || "active").toLowerCase()) {
    case "exhausted":
      return LessonPackageStatus.EXHAUSTED;
    case "expired":
      return LessonPackageStatus.EXPIRED;
    case "cancelled":
      return LessonPackageStatus.CANCELLED;
    default:
      return LessonPackageStatus.ACTIVE;
  }
}

async function importCourts(courts: JsonCourt[]): Promise<number> {
  for (const court of courts) {
    await prisma.court.upsert({
      where: { id: court.id },
      update: {
        name: court.name,
        type: mapCourtSurface(court.type),
        available: court.available ?? true,
        updatedAt: new Date(),
      },
      create: {
        id: court.id,
        name: court.name,
        type: mapCourtSurface(court.type),
        available: court.available ?? true,
      },
    });
  }

  return courts.length;
}

async function importUsers(members: JsonMember[]): Promise<number> {
  for (const member of members) {
    await prisma.user.upsert({
      where: { id: member.id },
      update: {
        memberNumber: member.memberNumber,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email.toLowerCase(),
        phone: member.phone,
        isActive: member.isActive ?? true,
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
        createdAt: toDateTime(member.createdAt),
        updatedAt: toDateTime(member.lastModified),
      },
      create: {
        id: member.id,
        memberNumber: member.memberNumber,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email.toLowerCase(),
        phone: member.phone,
        isActive: member.isActive ?? true,
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
        createdAt: toDateTime(member.createdAt),
        updatedAt: toDateTime(member.lastModified),
      },
    });
  }

  return members.length;
}

async function importReservations(
  reservations: JsonReservation[],
  existingUserIds: Set<string>,
  warnings: string[]
): Promise<number> {
  for (const reservation of reservations) {
    const memberExists = reservation.memberId
      ? existingUserIds.has(reservation.memberId)
      : false;

    if (reservation.memberId && !memberExists) {
      warnings.push(
        `Reservation ${reservation.id} references missing member ${reservation.memberId}; preserved in legacyMemberId.`
      );
    }

    await prisma.courtReservation.upsert({
      where: { id: reservation.id },
      update: {
        courtId: reservation.courtId,
        courtName: reservation.courtName,
        reservationDate: reservation.date,
        startTime: reservation.timeSlot.start,
        endTime: reservation.timeSlot.end,
        bookedByUserId: memberExists ? reservation.memberId : null,
        playerUserId: memberExists ? reservation.memberId : null,
        legacyMemberId: memberExists ? null : reservation.memberId,
        guestName: reservation.guestName ?? reservation.customerName,
        guestEmail: reservation.guestEmail ?? reservation.customerEmail,
        guestPhone: reservation.guestPhone ?? reservation.customerPhone,
        customerName: reservation.customerName,
        customerEmail: reservation.customerEmail,
        customerPhone: reservation.customerPhone,
        notes: reservation.notes,
        status: mapReservationStatus(reservation.status),
        paymentStatus: reservation.paymentStatus
          ? mapPaymentStatus(reservation.paymentStatus)
          : null,
        paymentAmount: reservation.paymentAmount,
        paymentId: reservation.paymentId,
        createdAt: toDateTime(reservation.createdAt),
        updatedAt: toDateTime(reservation.createdAt),
      },
      create: {
        id: reservation.id,
        courtId: reservation.courtId,
        courtName: reservation.courtName,
        reservationDate: reservation.date,
        startTime: reservation.timeSlot.start,
        endTime: reservation.timeSlot.end,
        bookedByUserId: memberExists ? reservation.memberId : null,
        playerUserId: memberExists ? reservation.memberId : null,
        legacyMemberId: memberExists ? null : reservation.memberId,
        guestName: reservation.guestName ?? reservation.customerName,
        guestEmail: reservation.guestEmail ?? reservation.customerEmail,
        guestPhone: reservation.guestPhone ?? reservation.customerPhone,
        customerName: reservation.customerName,
        customerEmail: reservation.customerEmail,
        customerPhone: reservation.customerPhone,
        notes: reservation.notes,
        status: mapReservationStatus(reservation.status),
        paymentStatus: reservation.paymentStatus
          ? mapPaymentStatus(reservation.paymentStatus)
          : null,
        paymentAmount: reservation.paymentAmount,
        paymentId: reservation.paymentId,
        createdAt: toDateTime(reservation.createdAt),
        updatedAt: toDateTime(reservation.createdAt),
      },
    });
  }

  return reservations.length;
}

async function importPrivateLessons(
  lessons: JsonPrivateLesson[],
  existingUserIds: Set<string>,
  existingCourtIds: Set<string>,
  warnings: string[]
): Promise<number> {
  let imported = 0;

  for (const lesson of lessons) {
    if (!existingUserIds.has(lesson.coachId) || !existingUserIds.has(lesson.playerId)) {
      warnings.push(`Private lesson ${lesson.id} skipped because coach or player no longer exists.`);
      continue;
    }

    if (!existingCourtIds.has(lesson.courtId)) {
      warnings.push(`Private lesson ${lesson.id} skipped because court ${lesson.courtId} does not exist.`);
      continue;
    }

    await prisma.privateLesson.upsert({
      where: { id: lesson.id },
      update: {
        courtId: lesson.courtId,
        coachUserId: lesson.coachId,
        playerUserId: lesson.playerId,
        scheduledDate: lesson.date,
        startTime: lesson.timeSlot.start,
        endTime: lesson.timeSlot.end,
        status: mapLessonStatus(lesson.status),
        lessonType: lesson.lessonType,
        priceCents: lesson.price,
        notes: lesson.notes,
        createdAt: toDateTime(lesson.createdAt),
        updatedAt: toDateTime(lesson.lastModified),
      },
      create: {
        id: lesson.id,
        courtId: lesson.courtId,
        coachUserId: lesson.coachId,
        playerUserId: lesson.playerId,
        scheduledDate: lesson.date,
        startTime: lesson.timeSlot.start,
        endTime: lesson.timeSlot.end,
        status: mapLessonStatus(lesson.status),
        lessonType: lesson.lessonType,
        priceCents: lesson.price,
        notes: lesson.notes,
        createdAt: toDateTime(lesson.createdAt),
        updatedAt: toDateTime(lesson.lastModified),
      },
    });

    imported += 1;
  }

  return imported;
}

async function importRecurringPrograms(
  programs: JsonRecurringProgram[],
  existingUserIds: Set<string>,
  existingCourtIds: Set<string>,
  warnings: string[]
): Promise<number> {
  let imported = 0;

  for (const program of programs) {
    if (!existingUserIds.has(program.coachId)) {
      warnings.push(`Recurring program ${program.id} skipped because coach ${program.coachId} does not exist.`);
      continue;
    }

    if (!existingCourtIds.has(program.courtId)) {
      warnings.push(`Recurring program ${program.id} skipped because court ${program.courtId} does not exist.`);
      continue;
    }

    await prisma.recurringProgram.upsert({
      where: { id: program.id },
      update: {
        name: program.name,
        coachUserId: program.coachId,
        courtId: program.courtId,
        weekday: program.weekday,
        startTime: program.startTime,
        endTime: program.endTime,
        capacity: program.capacity,
        priceCents: program.price,
        startsOn: program.startsOn,
        endsOn: program.endsOn,
        status: mapProgramStatus(program.status),
        description: program.description,
        createdAt: toDateTime(program.createdAt),
        updatedAt: toDateTime(program.lastModified),
      },
      create: {
        id: program.id,
        name: program.name,
        coachUserId: program.coachId,
        courtId: program.courtId,
        weekday: program.weekday,
        startTime: program.startTime,
        endTime: program.endTime,
        capacity: program.capacity,
        priceCents: program.price,
        startsOn: program.startsOn,
        endsOn: program.endsOn,
        status: mapProgramStatus(program.status),
        description: program.description,
        createdAt: toDateTime(program.createdAt),
        updatedAt: toDateTime(program.lastModified),
      },
    });

    imported += 1;
  }

  return imported;
}

async function importProgramSessions(
  sessions: JsonProgramSession[],
  existingProgramIds: Set<string>,
  existingUserIds: Set<string>,
  existingCourtIds: Set<string>,
  warnings: string[]
): Promise<number> {
  let imported = 0;

  for (const session of sessions) {
    if (!existingProgramIds.has(session.programId)) {
      warnings.push(`Program session ${session.id} skipped because program ${session.programId} does not exist.`);
      continue;
    }

    const coachExists = session.coachId ? existingUserIds.has(session.coachId) : false;
    const courtExists = session.courtId ? existingCourtIds.has(session.courtId) : false;

    if (session.coachId && !coachExists) {
      warnings.push(`Program session ${session.id} references missing coach ${session.coachId}; coachUserId skipped.`);
    }

    if (session.courtId && !courtExists) {
      warnings.push(`Program session ${session.id} references missing court ${session.courtId}; courtId skipped.`);
    }

    await prisma.programSession.upsert({
      where: { id: session.id },
      update: {
        programId: session.programId,
        coachUserId: coachExists ? session.coachId : null,
        courtId: courtExists ? session.courtId : null,
        sessionDate: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        status: mapLessonStatus(session.status),
        notes: session.notes,
        createdAt: toDateTime(session.createdAt),
        updatedAt: toDateTime(session.lastModified),
      },
      create: {
        id: session.id,
        programId: session.programId,
        coachUserId: coachExists ? session.coachId : null,
        courtId: courtExists ? session.courtId : null,
        sessionDate: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        status: mapLessonStatus(session.status),
        notes: session.notes,
        createdAt: toDateTime(session.createdAt),
        updatedAt: toDateTime(session.lastModified),
      },
    });

    imported += 1;
  }

  return imported;
}

async function importPayments(
  payments: JsonPayment[],
  existingUserIds: Set<string>,
  existingReservationIds: Set<string>,
  warnings: string[]
): Promise<number> {
  for (const payment of payments) {
    const memberExists = payment.memberId
      ? existingUserIds.has(payment.memberId)
      : false;
    const reservationExists = payment.reservationId
      ? existingReservationIds.has(payment.reservationId)
      : false;

    if (payment.memberId && !memberExists) {
      warnings.push(`Payment ${payment.id} references missing member ${payment.memberId}; memberId skipped.`);
    }

    if (payment.reservationId && !reservationExists) {
      warnings.push(
        `Payment ${payment.id} references missing reservation ${payment.reservationId}; reservationId skipped.`
      );
    }

    await prisma.payment.upsert({
      where: { id: payment.id },
      update: {
        memberId: memberExists ? payment.memberId : null,
        reservationId: reservationExists ? payment.reservationId : null,
        type: mapPaymentType(payment.type),
        amount: payment.amount,
        currency: payment.currency ?? "usd",
        status: mapPaymentStatus(payment.status),
        stripePaymentIntentId: payment.stripePaymentIntentId,
        stripeChargeId: payment.stripeChargeId,
        description: payment.description,
        metadata: payment.metadata,
        createdAt: toDateTime(payment.createdAt),
        updatedAt: toDateTime(payment.lastModified),
        paidAt: payment.paidAt ? toDateTime(payment.paidAt) : null,
        refundedAt: payment.refundedAt ? toDateTime(payment.refundedAt) : null,
        refundAmount: payment.refundAmount,
      },
      create: {
        id: payment.id,
        memberId: memberExists ? payment.memberId : null,
        reservationId: reservationExists ? payment.reservationId : null,
        type: mapPaymentType(payment.type),
        amount: payment.amount,
        currency: payment.currency ?? "usd",
        status: mapPaymentStatus(payment.status),
        stripePaymentIntentId: payment.stripePaymentIntentId,
        stripeChargeId: payment.stripeChargeId,
        description: payment.description,
        metadata: payment.metadata,
        createdAt: toDateTime(payment.createdAt),
        updatedAt: toDateTime(payment.lastModified),
        paidAt: payment.paidAt ? toDateTime(payment.paidAt) : null,
        refundedAt: payment.refundedAt ? toDateTime(payment.refundedAt) : null,
        refundAmount: payment.refundAmount,
      },
    });
  }

  return payments.length;
}

async function importMemberships(
  memberships: JsonMembership[],
  existingUserIds: Set<string>,
  existingPaymentIds: Set<string>,
  warnings: string[]
): Promise<number> {
  let imported = 0;

  for (const membership of memberships) {
    if (!existingUserIds.has(membership.memberId)) {
      warnings.push(`Membership ${membership.id} skipped because member ${membership.memberId} does not exist.`);
      continue;
    }

    const paymentExists = membership.paymentId
      ? existingPaymentIds.has(membership.paymentId)
      : false;

    if (membership.paymentId && !paymentExists) {
      warnings.push(`Membership ${membership.id} references missing payment ${membership.paymentId}; paymentId skipped.`);
    }

    await prisma.membership.upsert({
      where: { id: membership.id },
      update: {
        userId: membership.memberId,
        planName: membership.planName,
        billingPeriod: mapBillingPeriod(membership.billingPeriod),
        priceCents: membership.price,
        status: mapMembershipStatus(membership.status),
        startsOn: membership.startsOn,
        endsOn: membership.endsOn,
        notes: membership.notes,
        paymentId: paymentExists ? membership.paymentId : null,
        createdAt: toDateTime(membership.createdAt),
        updatedAt: toDateTime(membership.lastModified),
      },
      create: {
        id: membership.id,
        userId: membership.memberId,
        planName: membership.planName,
        billingPeriod: mapBillingPeriod(membership.billingPeriod),
        priceCents: membership.price,
        status: mapMembershipStatus(membership.status),
        startsOn: membership.startsOn,
        endsOn: membership.endsOn,
        notes: membership.notes,
        paymentId: paymentExists ? membership.paymentId : null,
        createdAt: toDateTime(membership.createdAt),
        updatedAt: toDateTime(membership.lastModified),
      },
    });

    imported += 1;
  }

  return imported;
}

async function importLessonPackages(
  lessonPackages: JsonLessonPackage[],
  existingUserIds: Set<string>,
  existingPaymentIds: Set<string>,
  warnings: string[]
): Promise<number> {
  let imported = 0;

  for (const lessonPackage of lessonPackages) {
    if (!existingUserIds.has(lessonPackage.memberId)) {
      warnings.push(
        `Lesson package ${lessonPackage.id} skipped because member ${lessonPackage.memberId} does not exist.`
      );
      continue;
    }

    const coachExists = lessonPackage.coachId
      ? existingUserIds.has(lessonPackage.coachId)
      : false;
    const paymentExists = lessonPackage.paymentId
      ? existingPaymentIds.has(lessonPackage.paymentId)
      : false;

    if (lessonPackage.coachId && !coachExists) {
      warnings.push(
        `Lesson package ${lessonPackage.id} references missing coach ${lessonPackage.coachId}; coachUserId skipped.`
      );
    }

    if (lessonPackage.paymentId && !paymentExists) {
      warnings.push(
        `Lesson package ${lessonPackage.id} references missing payment ${lessonPackage.paymentId}; paymentId skipped.`
      );
    }

    await prisma.lessonPackage.upsert({
      where: { id: lessonPackage.id },
      update: {
        playerUserId: lessonPackage.memberId,
        coachUserId: coachExists ? lessonPackage.coachId : null,
        packageName: lessonPackage.packageName,
        sessionCountTotal: lessonPackage.sessionCountTotal,
        sessionCountUsed: lessonPackage.sessionCountUsed ?? 0,
        priceCents: lessonPackage.price,
        expiresOn: lessonPackage.expiresOn,
        status: mapLessonPackageStatus(lessonPackage.status),
        notes: lessonPackage.notes,
        paymentId: paymentExists ? lessonPackage.paymentId : null,
        createdAt: toDateTime(lessonPackage.createdAt),
        updatedAt: toDateTime(lessonPackage.lastModified),
      },
      create: {
        id: lessonPackage.id,
        playerUserId: lessonPackage.memberId,
        coachUserId: coachExists ? lessonPackage.coachId : null,
        packageName: lessonPackage.packageName,
        sessionCountTotal: lessonPackage.sessionCountTotal,
        sessionCountUsed: lessonPackage.sessionCountUsed ?? 0,
        priceCents: lessonPackage.price,
        expiresOn: lessonPackage.expiresOn,
        status: mapLessonPackageStatus(lessonPackage.status),
        notes: lessonPackage.notes,
        paymentId: paymentExists ? lessonPackage.paymentId : null,
        createdAt: toDateTime(lessonPackage.createdAt),
        updatedAt: toDateTime(lessonPackage.lastModified),
      },
    });

    imported += 1;
  }

  return imported;
}

async function importJournalEntries(
  journalEntries: JsonJournalEntry[],
  existingReservationIds: Set<string>,
  existingUserIds: Set<string>,
  warnings: string[]
): Promise<number> {
  for (const entry of journalEntries) {
    if (!existingUserIds.has(entry.playerId) || !existingUserIds.has(entry.coachId)) {
      warnings.push(`Journal entry ${entry.id} skipped because player or coach no longer exists.`);
      continue;
    }

    const reservationExists = entry.reservationId
      ? existingReservationIds.has(entry.reservationId)
      : false;

    if (entry.reservationId && !reservationExists) {
      warnings.push(
        `Journal entry ${entry.id} references missing reservation ${entry.reservationId}; preserved in legacyReservationId.`
      );
    }

    const createdById = entry.createdBy && existingUserIds.has(entry.createdBy)
      ? entry.createdBy
      : null;

    await prisma.journalEntry.upsert({
      where: { id: entry.id },
      update: {
        playerId: entry.playerId,
        coachId: entry.coachId,
        createdById,
        createdByLabel: createdById ? null : entry.createdBy,
        courtReservationId: reservationExists ? entry.reservationId : null,
        legacyReservationId: reservationExists ? null : entry.reservationId,
        sessionDate: entry.sessionDate,
        sessionTime: entry.sessionTime,
        summary: entry.summary,
        areasWorkedOn: entry.areasWorkedOn,
        pointersForNextSession: entry.pointersForNextSession,
        additionalNotes: entry.additionalNotes,
        playerReflection: entry.playerReflection,
        createdAt: toDateTime(entry.createdAt),
        updatedAt: toDateTime(entry.lastModified),
      },
      create: {
        id: entry.id,
        playerId: entry.playerId,
        coachId: entry.coachId,
        createdById,
        createdByLabel: createdById ? null : entry.createdBy,
        courtReservationId: reservationExists ? entry.reservationId : null,
        legacyReservationId: reservationExists ? null : entry.reservationId,
        sessionDate: entry.sessionDate,
        sessionTime: entry.sessionTime,
        summary: entry.summary,
        areasWorkedOn: entry.areasWorkedOn,
        pointersForNextSession: entry.pointersForNextSession,
        additionalNotes: entry.additionalNotes,
        playerReflection: entry.playerReflection,
        createdAt: toDateTime(entry.createdAt),
        updatedAt: toDateTime(entry.lastModified),
      },
    });
  }

  return journalEntries.length;
}

async function importTrainingPlans(
  trainingPlans: JsonTrainingPlan[],
  existingUserIds: Set<string>,
  warnings: string[]
): Promise<number> {
  for (const plan of trainingPlans) {
    if (!existingUserIds.has(plan.playerId)) {
      warnings.push(`Training plan ${plan.id} skipped because player ${plan.playerId} does not exist.`);
      continue;
    }

    const createdByUserId = plan.createdBy && existingUserIds.has(plan.createdBy)
      ? plan.createdBy
      : null;

    await prisma.trainingPlan.upsert({
      where: { id: plan.id },
      update: {
        playerId: plan.playerId,
        createdByUserId,
        createdByLabel: createdByUserId ? null : plan.createdBy,
        focusAreas: plan.focusAreas,
        strengths: plan.strengths,
        areasForImprovement: plan.areasForImprovement,
        recommendations: plan.recommendations,
        suggestedDrills: plan.suggestedDrills,
        weeklyGoals: plan.weeklyGoals,
        progressNotes: plan.progressNotes,
        sessionCount: plan.sessionCount ?? 0,
        lastReviewDate: plan.lastReviewDate ? toDateTime(plan.lastReviewDate) : null,
        version: plan.version ?? 1,
        status: TrainingPlanStatus.ACTIVE,
        createdAt: toDateTime(plan.createdAt),
        updatedAt: toDateTime(plan.lastModified),
      },
      create: {
        id: plan.id,
        playerId: plan.playerId,
        createdByUserId,
        createdByLabel: createdByUserId ? null : plan.createdBy,
        focusAreas: plan.focusAreas,
        strengths: plan.strengths,
        areasForImprovement: plan.areasForImprovement,
        recommendations: plan.recommendations,
        suggestedDrills: plan.suggestedDrills,
        weeklyGoals: plan.weeklyGoals,
        progressNotes: plan.progressNotes,
        sessionCount: plan.sessionCount ?? 0,
        lastReviewDate: plan.lastReviewDate ? toDateTime(plan.lastReviewDate) : null,
        version: plan.version ?? 1,
        status: TrainingPlanStatus.ACTIVE,
        createdAt: toDateTime(plan.createdAt),
        updatedAt: toDateTime(plan.lastModified),
      },
    });
  }

  return trainingPlans.length;
}

async function main(): Promise<void> {
  const [
    courts,
    members,
    reservations,
    privateLessons,
    recurringPrograms,
    programSessions,
    payments,
    memberships,
    lessonPackages,
    journalEntries,
    trainingPlans,
  ] =
    await Promise.all([
      readJsonArray<JsonCourt>("courts.json"),
      readJsonArray<JsonMember>("members.json"),
      readJsonArray<JsonReservation>("reservations.json"),
      readJsonArray<JsonPrivateLesson>("private-lessons.json"),
      readJsonArray<JsonRecurringProgram>("recurring-programs.json"),
      readJsonArray<JsonProgramSession>("program-sessions.json"),
      readJsonArray<JsonPayment>("payments.json"),
      readJsonArray<JsonMembership>("memberships.json"),
      readJsonArray<JsonLessonPackage>("lesson-packages.json"),
      readJsonArray<JsonJournalEntry>("journal-entries.json"),
      readJsonArray<JsonTrainingPlan>("training-plans.json"),
    ]);

  const summary: ImportSummary = {
    courts: courts.length,
    users: members.length,
    reservations: reservations.length,
    privateLessons: privateLessons.length,
    recurringPrograms: recurringPrograms.length,
    programSessions: programSessions.length,
    payments: payments.length,
    memberships: memberships.length,
    lessonPackages: lessonPackages.length,
    journalEntries: journalEntries.length,
    trainingPlans: trainingPlans.length,
    warnings: [],
  };

  if (dryRun) {
    const memberIds = new Set(members.map((member) => member.id));
    const reservationIds = new Set(reservations.map((reservation) => reservation.id));

    reservations.forEach((reservation) => {
      if (reservation.memberId && !memberIds.has(reservation.memberId)) {
        summary.warnings.push(
          `Reservation ${reservation.id} references missing member ${reservation.memberId}.`
        );
      }
    });

    payments.forEach((payment) => {
      if (payment.memberId && !memberIds.has(payment.memberId)) {
        summary.warnings.push(`Payment ${payment.id} references missing member ${payment.memberId}.`);
      }

      if (payment.reservationId && !reservationIds.has(payment.reservationId)) {
        summary.warnings.push(
          `Payment ${payment.id} references missing reservation ${payment.reservationId}.`
        );
      }
    });

    memberships.forEach((membership) => {
      if (!memberIds.has(membership.memberId)) {
        summary.warnings.push(
          `Membership ${membership.id} references missing member ${membership.memberId}.`
        );
      }
    });

    lessonPackages.forEach((lessonPackage) => {
      if (!memberIds.has(lessonPackage.memberId)) {
        summary.warnings.push(
          `Lesson package ${lessonPackage.id} references missing member ${lessonPackage.memberId}.`
        );
      }

      if (lessonPackage.coachId && !memberIds.has(lessonPackage.coachId)) {
        summary.warnings.push(
          `Lesson package ${lessonPackage.id} references missing coach ${lessonPackage.coachId}.`
        );
      }
    });

    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const memberIds = new Set(members.map((member) => member.id));
  const courtIds = new Set(courts.map((court) => court.id));

  await importCourts(courts);
  await importUsers(members);
  await importReservations(reservations, memberIds, summary.warnings);
  await importPrivateLessons(privateLessons, memberIds, courtIds, summary.warnings);
  await importRecurringPrograms(recurringPrograms, memberIds, courtIds, summary.warnings);

  const reservationIds = new Set(reservations.map((reservation) => reservation.id));
  const recurringProgramIds = new Set(recurringPrograms.map((program) => program.id));

  await importProgramSessions(
    programSessions,
    recurringProgramIds,
    memberIds,
    courtIds,
    summary.warnings
  );
  await importPayments(payments, memberIds, reservationIds, summary.warnings);
  const paymentIds = new Set(payments.map((payment) => payment.id));
  await importMemberships(memberships, memberIds, paymentIds, summary.warnings);
  await importLessonPackages(lessonPackages, memberIds, paymentIds, summary.warnings);
  await importJournalEntries(journalEntries, reservationIds, memberIds, summary.warnings);
  await importTrainingPlans(trainingPlans, memberIds, summary.warnings);

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
