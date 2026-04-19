const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export type SummerCampTrack = "full_day" | "half_day" | "future_stars";
export type SummerCampSessionPreference = "morning" | "afternoon" | "full_day" | "flexible";
export type SummerCampSkillLevel = "beginner" | "intermediate" | "advanced" | "tournament";
export type SummerCampContactPreference = "email" | "phone";

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
}

export interface SummerCampRegistrationResponse {
  id: string;
  confirmationCode: string;
  status: "pending_review" | "confirmed" | "waitlisted" | "cancelled";
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
  paymentStatus?: "pending" | "paid" | "refunded" | "failed" | "cancelled";
  paymentId?: string;
  paymentIntentId?: string;
  paymentAmount?: number;
  paidAt?: string;
  createdAt: string;
  lastModified: string;
  message?: string;
}

export async function createSummerCampRegistration(
  payload: SummerCampRegistrationRequest
): Promise<SummerCampRegistrationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/summer-camp/registrations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "Failed to submit summer camp registration");
  }

  return response.json();
}
