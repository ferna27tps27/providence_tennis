/**
 * Journal entry type definitions
 */

export interface JournalEntry {
  id: string;                    // Unique identifier
  playerId: string;              // Member ID of the player
  coachId: string;              // Member ID of the coach
  reservationId?: string;       // Optional: Link to reservation/session
  sessionDate: string;          // Date of session (YYYY-MM-DD)
  sessionTime?: string;         // Optional: Time of session (HH:mm)
  
  // Session Content
  summary: string;               // Main summary (e.g., "worked on backhand and serve")
  areasWorkedOn: string[];      // Array of focus areas (e.g., ["backhand", "serve"])
  pointersForNextSession: string; // Coach's notes for next session
  additionalNotes?: string;      // Optional additional notes
  
  // Metadata
  createdAt: string;             // ISO 8601 timestamp
  lastModified: string;          // ISO 8601 timestamp
  createdBy: string;             // Member ID who created (should be coachId)
}

export interface JournalEntryRequest {
  playerId: string;
  reservationId?: string;
  sessionDate: string;
  sessionTime?: string;
  summary: string;
  areasWorkedOn: string[];
  pointersForNextSession: string;
  additionalNotes?: string;
}

export interface JournalFilter {
  playerId?: string;            // Filter by player
  coachId?: string;             // Filter by coach
  startDate?: string;           // Filter entries from date
  endDate?: string;             // Filter entries to date
  areaWorkedOn?: string;        // Filter by focus area
}
