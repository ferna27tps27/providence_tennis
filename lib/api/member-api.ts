/**
 * Member API client functions
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export interface Member {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  lastModified: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  penaltyCancellations?: number;
  notes?: string;
  unsubscribeEmail?: boolean;
  emailVerified?: boolean;
  role?: "player" | "coach" | "parent" | "admin";
  ntrpRating?: string;
  ustaNumber?: string;
}

export interface MemberUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  ntrpRating?: string;
  ustaNumber?: string;
  notes?: string;
}

export interface ApiError {
  error: string;
  code?: string;
}

/**
 * Get current member (from auth token)
 */
export async function getCurrentMember(token: string): Promise<Member> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to get member");
  }

  const data = await response.json();
  return (data.member ?? data) as Member;
}

/**
 * Get member by ID
 */
export async function getMember(id: string, token: string): Promise<Member> {
  const response = await fetch(`${API_BASE_URL}/api/members/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to get member");
  }

  return response.json();
}

/**
 * Update member
 */
export async function updateMember(
  id: string,
  updates: MemberUpdate,
  token: string
): Promise<Member> {
  const response = await fetch(`${API_BASE_URL}/api/members/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to update member");
  }

  return response.json();
}

/**
 * Get current user's reservations (authenticated).
 * Uses /api/members/me/reservations so the server determines member from session.
 */
export async function getMyReservations(token: string): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/members/me/reservations`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to get reservations");
  }

  return response.json();
}

/**
 * Get member reservations by member id (e.g. for admin).
 */
export async function getMemberReservations(
  memberId: string,
  token: string
): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/members/${memberId}/reservations`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to get reservations");
  }

  return response.json();
}
