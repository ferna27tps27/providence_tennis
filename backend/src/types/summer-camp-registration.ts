export type SummerCampTrack = "full_day" | "half_day" | "future_stars";

export type SummerCampSessionPreference = "morning" | "afternoon" | "full_day" | "flexible";

export type SummerCampSkillLevel = "beginner" | "intermediate" | "advanced" | "tournament";

export type SummerCampContactPreference = "email" | "phone";

export type SummerCampRegistrationStatus =
  | "pending_review"
  | "confirmed"
  | "waitlisted"
  | "cancelled";

export type SummerCampPaymentStatus =
  | "pending"
  | "paid"
  | "refunded"
  | "failed"
  | "cancelled";

export interface SummerCampRegistration {
  id: string;
  confirmationCode: string;
  createdAt: string;
  lastModified: string;
  status: SummerCampRegistrationStatus;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  playerName: string;
  playerAge: number;
  skillLevel: SummerCampSkillLevel;
  track: SummerCampTrack;
  sessionPreference: SummerCampSessionPreference;
  preferredWeeks: string[];
  notes?: string;
  contactPreference: SummerCampContactPreference;
  depositAcknowledged: boolean;
  paymentStatus?: SummerCampPaymentStatus;
  paymentId?: string;
  paymentIntentId?: string;
  paymentAmount?: number;
  paidAt?: string;
}

export interface SummerCampRegistrationRequest {
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  playerName: string;
  playerAge: number;
  skillLevel: SummerCampSkillLevel;
  track: SummerCampTrack;
  sessionPreference: SummerCampSessionPreference;
  preferredWeeks: string[];
  notes?: string;
  contactPreference: SummerCampContactPreference;
  depositAcknowledged: boolean;
  paymentStatus?: SummerCampPaymentStatus;
  paymentId?: string;
  paymentIntentId?: string;
  paymentAmount?: number;
  paidAt?: string;
}
