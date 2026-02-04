/**
 * Admin booking (reservation) API client functions
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export interface AdminReservation {
  id: string;
  courtId: string;
  courtName: string;
  date: string;
  timeSlot: {
    start: string;
    end: string;
  };
  memberId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  notes?: string;
  createdAt: string;
  status: "confirmed" | "cancelled";
  paymentId?: string;
  paymentStatus?: "pending" | "paid" | "refunded" | "failed";
  paymentAmount?: number;
  contactName?: string;
  contactEmail?: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
  } | null;
}

export interface Court {
  id: string;
  name: string;
  type: string;
  available: boolean;
}

export interface AdminReservationFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: "confirmed" | "cancelled";
  courtId?: string;
  search?: string;
}

interface ApiError {
  error: string;
  code?: string;
}

function buildQuery(filters?: AdminReservationFilters) {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.status) params.set("status", filters.status);
  if (filters.courtId) params.set("courtId", filters.courtId);
  if (filters.search) params.set("search", filters.search);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getAdminReservations(
  token: string,
  filters?: AdminReservationFilters
): Promise<AdminReservation[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/reservations${buildQuery(filters)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to fetch reservations");
  }

  return response.json();
}

export async function updateAdminReservation(
  id: string,
  updates: Partial<{
    date: string;
    courtId: string;
    timeSlot: { start: string; end: string };
    notes: string;
    status: "confirmed" | "cancelled";
  }>,
  token: string
): Promise<AdminReservation> {
  const response = await fetch(`${API_BASE_URL}/api/admin/reservations/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to update reservation");
  }

  return response.json();
}

export async function cancelAdminReservation(
  id: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/admin/reservations/${id}`, {
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
}

export async function getCourts(token: string): Promise<Court[]> {
  const response = await fetch(`${API_BASE_URL}/api/courts`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to fetch courts");
  }

  return response.json();
}
