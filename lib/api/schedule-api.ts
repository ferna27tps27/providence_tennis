const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

interface ApiError {
  error: string;
  code?: string;
}

export interface ScheduleItem {
  id: string;
  sourceId: string;
  sourceType: "court_reservation" | "private_lesson" | "program_session";
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  courtId: string;
  courtName: string;
  status: string;
  primaryPerson: string;
  secondaryPerson: string;
  coachId?: string;
  playerId?: string;
  notes: string;
}

export interface ScheduleMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: "player" | "coach" | "parent" | "admin" | "owner";
  isActive?: boolean;
}

export interface ScheduleCourt {
  id: string;
  name: string;
  type: string;
  available: boolean;
}

export interface PrivateLessonRecord {
  id: string;
  courtId: string;
  courtName: string;
  coachId: string;
  playerId: string;
  date: string;
  timeSlot: {
    start: string;
    end: string;
  };
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  lessonType?: string;
  price?: number;
  notes?: string;
  coach?: {
    id: string;
    fullName: string;
  };
  player?: {
    id: string;
    fullName: string;
  };
}

export interface RecurringProgramRecord {
  id: string;
  name: string;
  coachId: string;
  courtId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  capacity: number;
  startsOn: string;
  endsOn?: string;
  status: "active" | "paused" | "completed" | "cancelled";
  price?: number;
  description?: string;
}

function authorizedHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function handleResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || fallback);
  }

  return response.json();
}

export async function getSchedule(
  token: string,
  params: { dateFrom?: string; dateTo?: string; date?: string }
): Promise<ScheduleItem[]> {
  const search = new URLSearchParams();
  if (params.date) search.set("date", params.date);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  const query = search.toString();

  const response = await fetch(`${API_BASE_URL}/api/schedule${query ? `?${query}` : ""}`, {
    headers: authorizedHeaders(token),
  });

  return handleResponse<ScheduleItem[]>(response, "Failed to fetch schedule");
}

export async function getPrivateLessons(
  token: string,
  params?: { dateFrom?: string; dateTo?: string }
): Promise<PrivateLessonRecord[]> {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  const query = search.toString();

  const response = await fetch(`${API_BASE_URL}/api/private-lessons${query ? `?${query}` : ""}`, {
    headers: authorizedHeaders(token),
  });

  return handleResponse<PrivateLessonRecord[]>(response, "Failed to fetch private lessons");
}

export async function createPrivateLessonRecord(
  token: string,
  payload: {
    courtId: string;
    coachId: string;
    playerId: string;
    date: string;
    timeSlot: { start: string; end: string };
    lessonType?: string;
    price?: number;
    notes?: string;
  }
): Promise<PrivateLessonRecord> {
  const response = await fetch(`${API_BASE_URL}/api/private-lessons`, {
    method: "POST",
    headers: authorizedHeaders(token),
    body: JSON.stringify(payload),
  });

  return handleResponse<PrivateLessonRecord>(response, "Failed to create private lesson");
}

export async function getRecurringPrograms(token: string): Promise<RecurringProgramRecord[]> {
  const response = await fetch(`${API_BASE_URL}/api/programs`, {
    headers: authorizedHeaders(token),
  });

  return handleResponse<RecurringProgramRecord[]>(response, "Failed to fetch recurring programs");
}

export async function createRecurringProgramRecord(
  token: string,
  payload: {
    name: string;
    coachId: string;
    courtId: string;
    weekday: number;
    startTime: string;
    endTime: string;
    capacity: number;
    startsOn: string;
    endsOn?: string;
    price?: number;
    description?: string;
  }
): Promise<RecurringProgramRecord> {
  const response = await fetch(`${API_BASE_URL}/api/programs`, {
    method: "POST",
    headers: authorizedHeaders(token),
    body: JSON.stringify(payload),
  });

  return handleResponse<RecurringProgramRecord>(response, "Failed to create recurring program");
}

export async function getScheduleMembers(
  token: string,
  role: "coach" | "player"
): Promise<ScheduleMember[]> {
  const response = await fetch(`${API_BASE_URL}/api/members?role=${role}`, {
    headers: authorizedHeaders(token),
  });
  return handleResponse<ScheduleMember[]>(response, "Failed to fetch members");
}

export async function getScheduleCourts(): Promise<ScheduleCourt[]> {
  const response = await fetch(`${API_BASE_URL}/api/courts`);
  return handleResponse<ScheduleCourt[]>(response, "Failed to fetch courts");
}
