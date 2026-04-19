import { PrivateLessonStatus } from "./private-lesson";

export type RecurringProgramStatus = "active" | "paused" | "completed" | "cancelled";

export interface RecurringProgram {
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
  status: RecurringProgramStatus;
  price?: number;
  description?: string;
  createdAt: string;
  lastModified: string;
}

export interface ProgramSession {
  id: string;
  programId: string;
  programName: string;
  coachId: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: PrivateLessonStatus;
  notes?: string;
  createdAt: string;
  lastModified: string;
}

export interface RecurringProgramRequest {
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

export interface RecurringProgramFilter {
  coachId?: string;
  courtId?: string;
  status?: RecurringProgramStatus;
}

export interface ProgramSessionFilter {
  coachId?: string;
  courtId?: string;
  programId?: string;
  status?: PrivateLessonStatus;
  dateFrom?: string;
  dateTo?: string;
}
