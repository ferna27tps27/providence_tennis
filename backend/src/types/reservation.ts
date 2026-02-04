export interface Court {
  id: string;
  name: string;
  type: "clay" | "hard" | "indoor";
  available: boolean;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

import { Member } from "./member";

export interface Reservation {
  id: string;
  courtId: string;
  courtName: string;
  date: string;
  timeSlot: {
    start: string;
    end: string;
  };
  
  // Member reservation (if member)
  memberId?: string;
  member?: Member; // Populated if memberId exists
  
  // Guest reservation (if not member) - kept for backward compatibility
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  
  // Alternative guest fields (preferred naming)
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  
  notes?: string;
  createdAt: string;
  status: "confirmed" | "cancelled";
  
  // Payment fields (Phase 4)
  paymentId?: string;
  paymentStatus?: "pending" | "paid" | "refunded" | "failed";
  paymentAmount?: number;
}

export interface ReservationRequest {
  courtId: string;
  date: string;
  timeSlot: {
    start: string;
    end: string;
  };
  
  // Member reservation
  memberId?: string;
  
  // Guest reservation (if no memberId) - support both naming conventions
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  
  notes?: string;
  
  // Payment fields (Phase 4)
  paymentId?: string; // Payment ID (must be paid status for reservation creation)
}
