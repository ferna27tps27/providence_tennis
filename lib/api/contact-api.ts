const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export interface ContactSubmissionRequest {
  name: string;
  email: string;
  message: string;
}

export interface ContactSubmissionResponse {
  id: string;
  name: string;
  email: string;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  createdAt: string;
  lastModified: string;
  messageText?: string;
}

export interface AdminContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  createdAt: string;
  lastModified: string;
}

export async function submitContactSubmission(
  payload: ContactSubmissionRequest
): Promise<ContactSubmissionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/contact-submissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "Failed to send message");
  }

  return response.json();
}

export async function getAdminContactSubmissions(
  token: string
): Promise<AdminContactSubmission[]> {
  const response = await fetch(`${API_BASE_URL}/api/admin/contact-submissions`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "Failed to fetch contact submissions");
  }

  return response.json();
}
