export type LessonPackageStatus = "active" | "exhausted" | "expired" | "cancelled";

export interface LessonPackage {
  id: string;
  memberId: string;
  coachId?: string;
  packageName: string;
  sessionCountTotal: number;
  sessionCountUsed: number;
  price: number;
  expiresOn?: string;
  status: LessonPackageStatus;
  notes?: string;
  paymentId?: string;
  createdAt: string;
  lastModified: string;
}

export interface LessonPackageRequest {
  memberId: string;
  coachId?: string;
  packageName: string;
  sessionCountTotal: number;
  price: number;
  expiresOn?: string;
  notes?: string;
}
