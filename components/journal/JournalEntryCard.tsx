"use client";

import { JournalEntry } from "@/lib/api/journal-api";
import { format } from "date-fns";

interface JournalEntryCardProps {
  entry: JournalEntry;
  userRole?: "player" | "coach" | "admin";
}

export default function JournalEntryCard({ entry, userRole }: JournalEntryCardProps) {
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  // Determine what name to show in the header
  const getHeaderName = () => {
    // Normalize role to lowercase for comparison
    const normalizedRole = userRole?.toLowerCase();
    
    if (normalizedRole === "coach") {
      // Coaches see the player's name
      return entry.playerName || `Player ${entry.playerId}`;
    } else {
      // Players (and admins) see the coach's name
      return entry.coachName || `Coach ${entry.coachId}`;
    }
  };

  const headerName = getHeaderName();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Session with {headerName}
          </h3>
          <p className="text-sm text-gray-500">
            {formatDate(entry.sessionDate)}
            {entry.sessionTime && ` at ${entry.sessionTime}`}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-1">Summary</h4>
        <p className="text-gray-900">{entry.summary}</p>
      </div>

      {entry.areasWorkedOn.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Areas Worked On</h4>
          <div className="flex flex-wrap gap-2">
            {entry.areasWorkedOn.map((area) => (
              <span
                key={area}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="text-sm font-medium text-yellow-900 mb-1">
          Pointers for Next Session
        </h4>
        <p className="text-yellow-800 text-sm">{entry.pointersForNextSession}</p>
      </div>

      {entry.additionalNotes && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Additional Notes</h4>
          <p className="text-gray-600 text-sm">{entry.additionalNotes}</p>
        </div>
      )}

      {entry.reservationId && (
        <div className="text-xs text-gray-500 mt-4">
          Linked to reservation: {entry.reservationId}
        </div>
      )}
    </div>
  );
}
