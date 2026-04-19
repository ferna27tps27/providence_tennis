export type ContactSubmissionStatus = "new" | "read" | "replied" | "archived";

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  status: ContactSubmissionStatus;
  createdAt: string;
  lastModified: string;
}

export interface ContactSubmissionRequest {
  name: string;
  email: string;
  message: string;
}
