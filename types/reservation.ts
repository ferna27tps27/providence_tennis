export interface Court {
  id: string;
  name: string;
  type: "clay" | "hard" | "indoor";
  available: boolean;
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string; // HH:mm format
  available: boolean;
}

export interface Reservation {
  id: string;
  courtId: string;
  courtName: string;
  date: string; // YYYY-MM-DD format
  timeSlot: {
    start: string;
    end: string;
  };
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
  createdAt: string;
  status: "confirmed" | "cancelled";
}

export interface ReservationRequest {
  courtId: string;
  date: string;
  timeSlot: {
    start: string;
    end: string;
  };
  memberId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
}

export interface AvailableSlot {
  courtId: string;
  courtName: string;
  timeSlot: {
    start: string;
    end: string;
  };
}
