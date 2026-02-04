/**
 * Booking (Reservation) API client functions
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export interface Reservation {
  id: string;
  courtId: string;
  courtName: string;
  date: string;
  timeSlot: {
    start: string;
    end: string;
  };
  memberId?: string;
  member?: any;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  notes?: string;
  createdAt: string;
  status: "confirmed" | "cancelled";
  paymentId?: string;
  paymentStatus?: "pending" | "paid" | "refunded" | "failed";
  paymentAmount?: number;
}

export interface ApiError {
  error: string;
  code?: string;
}

/**
 * Get all reservations (optionally filtered by date)
 */
export async function getReservations(
  date?: string,
  token?: string
): Promise<Reservation[]> {
  const url = date
    ? `${API_BASE_URL}/api/reservations?date=${date}`
    : `${API_BASE_URL}/api/reservations`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to get reservations");
  }

  return response.json();
}

/**
 * Get reservation by ID
 */
export async function getReservation(
  id: string,
  token?: string
): Promise<Reservation> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/reservations/${id}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to get reservation");
  }

  return response.json();
}

/**
 * Cancel reservation
 */
export async function cancelReservation(
  id: string,
  token: string
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/reservations/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to cancel reservation");
  }

  return { success: true };
}
