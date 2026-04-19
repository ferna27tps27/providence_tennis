const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

interface ApiError {
  error: string;
  code?: string;
}

function query(params?: { dateFrom?: string; dateTo?: string }) {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  const result = search.toString();
  return result ? `?${result}` : "";
}

async function authorizedGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to fetch report");
  }

  return response.json();
}

async function authorizedPost<T>(path: string, token: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to submit data");
  }

  return response.json();
}

export interface FinanceOverview {
  grossRevenue: number;
  refundedAmount: number;
  netRevenue: number;
  pendingRevenue: number;
  paymentCount: number;
  activeMemberships: number;
  activeLessonPackages: number;
  revenueByType: Array<{ type: string; amount: number }>;
}

export interface RefundReport {
  totalRefunded: number;
  refunds: Array<{
    paymentId: string;
    type: string;
    description: string;
    amount: number;
    refundedAt: string;
    memberId?: string;
  }>;
}

export interface CourtUtilizationRow {
  courtId: string;
  courtName: string;
  reservationCount: number;
  privateLessonCount: number;
  programSessionCount: number;
  totalScheduledBlocks: number;
}

export interface CoachLoadRow {
  coachId: string;
  coachName: string;
  privateLessonCount: number;
  programSessionCount: number;
  totalBlocks: number;
}

export interface MembershipRecord {
  id: string;
  memberId: string;
  planName: string;
  billingPeriod: "monthly" | "quarterly" | "yearly" | "custom";
  price: number;
  status: "active" | "paused" | "cancelled" | "expired";
  startsOn: string;
  endsOn?: string;
  notes?: string;
  paymentId?: string;
}

export interface LessonPackageRecord {
  id: string;
  memberId: string;
  coachId?: string;
  packageName: string;
  sessionCountTotal: number;
  sessionCountUsed: number;
  price: number;
  expiresOn?: string;
  status: "active" | "exhausted" | "expired" | "cancelled";
  notes?: string;
  paymentId?: string;
}

export function getFinanceOverview(token: string, params?: { dateFrom?: string; dateTo?: string }) {
  return authorizedGet<FinanceOverview>(`/api/reports/overview${query(params)}`, token);
}

export function getRefundReport(token: string, params?: { dateFrom?: string; dateTo?: string }) {
  return authorizedGet<RefundReport>(`/api/reports/refunds${query(params)}`, token);
}

export function getCourtUtilization(token: string, params?: { dateFrom?: string; dateTo?: string }) {
  return authorizedGet<CourtUtilizationRow[]>(`/api/reports/court-utilization${query(params)}`, token);
}

export function getCoachLoad(token: string, params?: { dateFrom?: string; dateTo?: string }) {
  return authorizedGet<CoachLoadRow[]>(`/api/reports/coach-load${query(params)}`, token);
}

export function getMembershipRecords(token: string) {
  return authorizedGet<MembershipRecord[]>("/api/admin/memberships", token);
}

export function createMembershipRecord(
  token: string,
  body: {
    memberId: string;
    planName: string;
    billingPeriod: "monthly" | "quarterly" | "yearly" | "custom";
    price: number;
    startsOn: string;
    endsOn?: string;
    notes?: string;
  }
) {
  return authorizedPost<MembershipRecord>("/api/admin/memberships", token, body);
}

export function getLessonPackageRecords(token: string) {
  return authorizedGet<LessonPackageRecord[]>("/api/admin/lesson-packages", token);
}

export function createLessonPackageRecord(
  token: string,
  body: {
    memberId: string;
    coachId?: string;
    packageName: string;
    sessionCountTotal: number;
    price: number;
    expiresOn?: string;
    notes?: string;
  }
) {
  return authorizedPost<LessonPackageRecord>("/api/admin/lesson-packages", token, body);
}
