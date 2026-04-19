import { getPayments } from "./payments/payments";
import { listMemberships } from "./memberships";
import { listLessonPackages } from "./lesson-packages";
import { getAllCourts, getAllReservations } from "./reservations";
import { listPrivateLessons } from "./private-lessons";
import { listProgramSessions } from "./recurring-programs";
import { getMember } from "./members";

function inDateWindow(date: string, dateFrom?: string, dateTo?: string): boolean {
  if (dateFrom && date < dateFrom) return false;
  if (dateTo && date > dateTo) return false;
  return true;
}

export async function getFinanceOverview(dateFrom?: string, dateTo?: string) {
  const [payments, memberships, lessonPackages] = await Promise.all([
    getPayments({ startDate: dateFrom, endDate: dateTo }),
    listMemberships(),
    listLessonPackages(),
  ]);

  const grossRevenue = payments
    .filter((payment) => payment.status === "paid" || payment.status === "refunded")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const refundedAmount = payments.reduce((sum, payment) => sum + (payment.refundAmount || 0), 0);
  const pendingRevenue = payments
    .filter((payment) => payment.status === "pending")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const netRevenue = grossRevenue - refundedAmount;

  const revenueByType = Object.entries(
    payments.reduce<Record<string, number>>((accumulator, payment) => {
      if (payment.status === "paid" || payment.status === "refunded") {
        accumulator[payment.type] = (accumulator[payment.type] || 0) + payment.amount;
      }
      return accumulator;
    }, {})
  ).map(([type, amount]) => ({ type, amount }));

  return {
    grossRevenue,
    refundedAmount,
    netRevenue,
    pendingRevenue,
    paymentCount: payments.length,
    activeMemberships: memberships.filter((membership) => membership.status === "active").length,
    activeLessonPackages: lessonPackages.filter((lessonPackage) => lessonPackage.status === "active").length,
    revenueByType,
  };
}

export async function getRefundReport(dateFrom?: string, dateTo?: string) {
  const payments = await getPayments({ startDate: dateFrom, endDate: dateTo });
  const refunds = payments
    .filter((payment) => payment.refundAmount && payment.refundAmount > 0)
    .map((payment) => ({
      paymentId: payment.id,
      type: payment.type,
      description: payment.description || payment.type,
      amount: payment.refundAmount || 0,
      refundedAt: payment.refundedAt || payment.lastModified,
      memberId: payment.memberId,
    }))
    .sort((a, b) => new Date(b.refundedAt).getTime() - new Date(a.refundedAt).getTime());

  return {
    totalRefunded: refunds.reduce((sum, refund) => sum + refund.amount, 0),
    refunds,
  };
}

export async function getCourtUtilizationReport(dateFrom?: string, dateTo?: string) {
  const [courts, reservations, lessons, sessions] = await Promise.all([
    getAllCourts(),
    getAllReservations(),
    listPrivateLessons({ dateFrom, dateTo }),
    listProgramSessions({ dateFrom, dateTo }),
  ]);

  return courts.map((court) => {
    const reservationCount = reservations.filter(
      (reservation) =>
        reservation.courtId === court.id &&
        reservation.status !== "cancelled" &&
        inDateWindow(reservation.date, dateFrom, dateTo)
    ).length;

    const privateLessonCount = lessons.filter(
      (lesson) => lesson.courtId === court.id && lesson.status !== "cancelled"
    ).length;

    const programSessionCount = sessions.filter(
      (session) => session.courtId === court.id && session.status !== "cancelled"
    ).length;

    return {
      courtId: court.id,
      courtName: court.name,
      reservationCount,
      privateLessonCount,
      programSessionCount,
      totalScheduledBlocks: reservationCount + privateLessonCount + programSessionCount,
    };
  });
}

export async function getCoachLoadReport(dateFrom?: string, dateTo?: string) {
  const [lessons, sessions] = await Promise.all([
    listPrivateLessons({ dateFrom, dateTo }),
    listProgramSessions({ dateFrom, dateTo }),
  ]);

  const coachMap = new Map<
    string,
    {
      coachId: string;
      coachName: string;
      privateLessonCount: number;
      programSessionCount: number;
      totalBlocks: number;
    }
  >();

  for (const lesson of lessons) {
    if (lesson.status === "cancelled") continue;
    const coach = await getMember(lesson.coachId);
    const existing = coachMap.get(lesson.coachId) || {
      coachId: lesson.coachId,
      coachName: `${coach.firstName} ${coach.lastName}`.trim(),
      privateLessonCount: 0,
      programSessionCount: 0,
      totalBlocks: 0,
    };

    existing.privateLessonCount += 1;
    existing.totalBlocks += 1;
    coachMap.set(lesson.coachId, existing);
  }

  for (const session of sessions) {
    if (session.status === "cancelled") continue;
    const coach = await getMember(session.coachId);
    const existing = coachMap.get(session.coachId) || {
      coachId: session.coachId,
      coachName: `${coach.firstName} ${coach.lastName}`.trim(),
      privateLessonCount: 0,
      programSessionCount: 0,
      totalBlocks: 0,
    };

    existing.programSessionCount += 1;
    existing.totalBlocks += 1;
    coachMap.set(session.coachId, existing);
  }

  return Array.from(coachMap.values()).sort((a, b) => b.totalBlocks - a.totalBlocks);
}
