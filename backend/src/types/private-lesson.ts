export type PrivateLessonStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface PrivateLesson {
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
  status: PrivateLessonStatus;
  lessonType?: string;
  price?: number;
  notes?: string;
  createdAt: string;
  lastModified: string;
}

export interface PrivateLessonRequest {
  courtId: string;
  coachId: string;
  playerId: string;
  date: string;
  timeSlot: {
    start: string;
    end: string;
  };
  lessonType?: string;
  price?: number;
  notes?: string;
}

export interface PrivateLessonFilter {
  coachId?: string;
  playerId?: string;
  courtId?: string;
  status?: PrivateLessonStatus;
  dateFrom?: string;
  dateTo?: string;
}
