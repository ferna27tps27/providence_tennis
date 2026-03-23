export type MembershipStatus = "active" | "paused" | "cancelled" | "expired";
export type BillingPeriod = "monthly" | "quarterly" | "yearly" | "custom";

export interface Membership {
  id: string;
  memberId: string;
  planName: string;
  billingPeriod: BillingPeriod;
  price: number;
  status: MembershipStatus;
  startsOn: string;
  endsOn?: string;
  notes?: string;
  paymentId?: string;
  createdAt: string;
  lastModified: string;
}

export interface MembershipRequest {
  memberId: string;
  planName: string;
  billingPeriod: BillingPeriod;
  price: number;
  startsOn: string;
  endsOn?: string;
  notes?: string;
}
