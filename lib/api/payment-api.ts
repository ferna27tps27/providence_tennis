/**
 * Payment API client functions
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export interface Payment {
  id: string;
  memberId?: string;
  reservationId?: string;
  type: "court_booking" | "membership" | "other";
  amount: number;
  currency: string;
  status: "pending" | "paid" | "refunded" | "failed" | "cancelled";
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  description?: string;
  metadata?: Record<string, string>;
  createdAt: string;
  lastModified: string;
  paidAt?: string;
  refundedAt?: string;
  refundAmount?: number;
}

export interface PaymentFilter {
  memberId?: string;
  status?: "pending" | "paid" | "refunded" | "failed" | "cancelled";
  type?: "court_booking" | "membership" | "other";
  startDate?: string;
  endDate?: string;
}

export interface ApiError {
  error: string;
  code?: string;
}

/**
 * Get payments (with optional filters)
 */
export async function getPayments(
  token: string,
  filter?: PaymentFilter
): Promise<Payment[]> {
  const params = new URLSearchParams();
  if (filter?.status) params.append("status", filter.status);
  if (filter?.type) params.append("type", filter.type);
  if (filter?.startDate) params.append("startDate", filter.startDate);
  if (filter?.endDate) params.append("endDate", filter.endDate);

  const url = `${API_BASE_URL}/api/payments${params.toString() ? `?${params.toString()}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to get payments");
  }

  return response.json();
}

/**
 * Get payment by ID
 */
export async function getPayment(id: string, token: string): Promise<Payment> {
  const response = await fetch(`${API_BASE_URL}/api/payments/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to get payment");
  }

  return response.json();
}

/**
 * Get payment invoice
 */
export async function getPaymentInvoice(
  id: string,
  token: string
): Promise<{ invoice: string; format: "text" | "json" }> {
  const response = await fetch(`${API_BASE_URL}/api/payments/${id}/invoice`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to get invoice");
  }

  return response.json();
}

/**
 * Download invoice as text
 */
export async function downloadInvoice(id: string, token: string): Promise<void> {
  const invoice = await getPaymentInvoice(id, token);
  const blob = new Blob([invoice.invoice], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${id}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Create a payment intent for a court booking
 */
export async function createPaymentIntent(
  token: string,
  options: {
    amount: number; // Amount in dollars (e.g. 40 for $40)
    reservationId?: string;
    description?: string;
  }
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const response = await fetch(`${API_BASE_URL}/api/payments/create-intent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: options.amount,
      currency: "usd",
      reservationId: options.reservationId,
      description: options.description || "Court Booking - 1 Hour",
    }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to create payment intent");
  }

  return response.json();
}

/**
 * Confirm a payment after Stripe client-side confirmation
 */
export async function confirmPaymentOnServer(
  token: string,
  options: {
    paymentIntentId: string;
    reservationId?: string;
  }
): Promise<Payment> {
  const response = await fetch(`${API_BASE_URL}/api/payments/confirm`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentIntentId: options.paymentIntentId,
      reservationId: options.reservationId,
    }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to confirm payment");
  }

  return response.json();
}
