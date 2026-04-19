import { getMember } from "./members";
import { LessonPackage, LessonPackageRequest } from "../types/lesson-package";
import { lessonPackageRepository } from "./repositories/file-lesson-package-repository";
import { paymentRepository } from "./repositories/file-payment-repository";
import { ValidationError } from "./errors/reservation-errors";
import { Payment } from "../types/payment";

export async function listLessonPackages(): Promise<LessonPackage[]> {
  return lessonPackageRepository.findAll();
}

export async function createLessonPackage(data: LessonPackageRequest): Promise<LessonPackage> {
  if (!data.memberId || !data.packageName || !data.sessionCountTotal || data.price <= 0) {
    throw new ValidationError("Missing required lesson package fields");
  }

  await getMember(data.memberId);
  if (data.coachId) {
    await getMember(data.coachId);
  }

  const payment = await paymentRepository.create({
    memberId: data.memberId,
    type: "lesson_package",
    amount: data.price,
    currency: "usd",
    status: "paid",
    description: `Lesson Package: ${data.packageName}`,
    metadata: {
      packageName: data.packageName,
      sessionCountTotal: String(data.sessionCountTotal),
      coachId: data.coachId || "",
    },
    paidAt: new Date().toISOString(),
  } as Omit<Payment, "id" | "createdAt" | "lastModified">);

  return lessonPackageRepository.create({
    memberId: data.memberId,
    coachId: data.coachId,
    packageName: data.packageName,
    sessionCountTotal: data.sessionCountTotal,
    sessionCountUsed: 0,
    price: data.price,
    expiresOn: data.expiresOn,
    status: "active",
    notes: data.notes,
    paymentId: payment.id,
  });
}
