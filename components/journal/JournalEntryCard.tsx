"use client";

import { JournalEntry, addPlayerReflection } from "@/lib/api/journal-api";
import { format } from "date-fns";
import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";

interface JournalEntryCardProps {
  entry: JournalEntry;
  userRole?: "player" | "coach" | "admin";
  onUpdate?: () => void;
}

export default function JournalEntryCard({ entry, userRole, onUpdate }: JournalEntryCardProps) {
  const { token, user } = useAuth();
  const [isEditingReflection, setIsEditingReflection] = useState(false);
  const [reflection, setReflection] = useState(entry.playerReflection || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isPlayer = userRole === "player";
  const canAddReflection = isPlayer && user?.id === entry.playerId;
  const handleSaveReflection = async () => {
    if (!token) return;
    
    setSaving(true);
    setError(null);
    
    try {
      await addPlayerReflection(entry.id, reflection, token);
      setIsEditingReflection(false);
      onUpdate?.();
    } catch (err: any) {
      setError(err.message || "Failed to save reflection");
    } finally {
      setSaving(false);
    }
  };

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
                className="px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-xs font-medium"
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

      {/* Player Reflection Section */}
      {(entry.playerReflection || canAddReflection) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Player Reflection</h4>
            {canAddReflection && !isEditingReflection && (
              <button
                onClick={() => setIsEditingReflection(true)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                {entry.playerReflection ? "Edit" : "Add reflection"}
              </button>
            )}
          </div>
          
          {isEditingReflection ? (
            <div className="space-y-2">
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                rows={3}
                placeholder="Share your thoughts about this session..."
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveReflection}
                  disabled={saving || !reflection.trim()}
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setIsEditingReflection(false);
                    setReflection(entry.playerReflection || "");
                    setError(null);
                  }}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : entry.playerReflection ? (
            <div className="p-3 bg-primary-50 border border-primary-200 rounded">
              <p className="text-sm text-gray-700">{entry.playerReflection}</p>
            </div>
          ) : canAddReflection ? (
            <p className="text-sm text-gray-500 italic">
              No reflection added yet. Click "Add reflection" to share your thoughts.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
