"use client";

import { useState, useEffect, useRef } from "react";
import { createJournalEntry, JournalEntryRequest } from "@/lib/api/journal-api";
import { useAuth } from "@/lib/auth/auth-context";
import { getPlayers, Member } from "@/lib/api/member-api";

const AREAS = [
  "backhand",
  "forehand",
  "serve",
  "volley",
  "footwork",
  "strategy",
  "mental",
  "fitness",
];

const STORAGE_KEY = "journal_entry_draft";

interface CoachJournalFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialPlayerId?: string;
  initialReservationId?: string;
  initialDate?: string;
  initialTime?: string;
}

interface StoredFormData {
  playerId: string;
  playerSearch: string;
  reservationId: string;
  sessionDate: string;
  sessionTime: string;
  summary: string;
  areasWorkedOn: string[];
  pointersForNextSession: string;
  additionalNotes: string;
}

// Load form data from localStorage
const loadFromStorage = (): Partial<StoredFormData> | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading form data from localStorage:", error);
  }
  return null;
};

// Save form data to localStorage
const saveToStorage = (data: StoredFormData) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving form data to localStorage:", error);
  }
};

// Clear form data from localStorage
const clearStorage = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing form data from localStorage:", error);
  }
};

export default function CoachJournalForm({
  onSuccess,
  onCancel,
  initialPlayerId,
  initialReservationId,
  initialDate,
  initialTime,
}: CoachJournalFormProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<Member[]>([]);
  
  // Load initial state from localStorage or props
  const storedData = loadFromStorage();
  const hasInitialProps = !!(initialPlayerId || initialReservationId || initialDate || initialTime);
  
  const [playerSearch, setPlayerSearch] = useState(() => {
    if (hasInitialProps) return "";
    return storedData?.playerSearch || "";
  });
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Member | null>(null);
  const playerDropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<JournalEntryRequest>(() => {
    // Priority: initial props > stored data > defaults
    if (hasInitialProps) {
      return {
        playerId: initialPlayerId || "",
        reservationId: initialReservationId || "",
        sessionDate: initialDate || new Date().toISOString().split("T")[0],
        sessionTime: initialTime || "",
        summary: "",
        areasWorkedOn: [],
        pointersForNextSession: "",
        additionalNotes: "",
      };
    }
    
    if (storedData) {
      return {
        playerId: storedData.playerId || "",
        reservationId: storedData.reservationId || "",
        sessionDate: storedData.sessionDate || new Date().toISOString().split("T")[0],
        sessionTime: storedData.sessionTime || "",
        summary: storedData.summary || "",
        areasWorkedOn: storedData.areasWorkedOn || [],
        pointersForNextSession: storedData.pointersForNextSession || "",
        additionalNotes: storedData.additionalNotes || "",
      };
    }
    
    return {
      playerId: "",
      reservationId: "",
      sessionDate: new Date().toISOString().split("T")[0],
      sessionTime: "",
      summary: "",
      areasWorkedOn: [],
      pointersForNextSession: "",
      additionalNotes: "",
    };
  });

  // Clear stored data if we have initial props (they take priority)
  useEffect(() => {
    if (hasInitialProps) {
      clearStorage();
    }
  }, [hasInitialProps]);

  // Load players on mount and restore selected player from stored data
  useEffect(() => {
    if (!token) return;

    const loadPlayers = async () => {
      try {
        const playersList = await getPlayers(token);
        setPlayers(playersList);
        
        // Priority: initialPlayerId > stored playerId
        const playerIdToUse = initialPlayerId || formData.playerId;
        
        if (playerIdToUse) {
          const player = playersList.find(p => p.id === playerIdToUse);
          if (player) {
            setSelectedPlayer(player);
            if (initialPlayerId) {
              setPlayerSearch(`${player.firstName} ${player.lastName}`);
            } else if (storedData?.playerSearch) {
              setPlayerSearch(storedData.playerSearch);
            } else {
              setPlayerSearch(`${player.firstName} ${player.lastName}`);
            }
          }
        } else if (storedData?.playerSearch && !hasInitialProps && storedData.playerSearch) {
          // Restore player search if we have stored data but no selected player
          setPlayerSearch(storedData.playerSearch);
        }
      } catch (err) {
        console.error("Error loading players:", err);
      }
    };

    loadPlayers();
  }, [token, initialPlayerId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (playerDropdownRef.current && !playerDropdownRef.current.contains(event.target as Node)) {
        setShowPlayerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter players based on search
  const filteredPlayers = players.filter((player) => {
    const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
    const searchLower = playerSearch.toLowerCase();
    return fullName.includes(searchLower) || 
           player.email.toLowerCase().includes(searchLower) ||
           player.memberNumber.toLowerCase().includes(searchLower);
  });

  // Save to localStorage whenever formData or playerSearch changes (but not on initial mount)
  useEffect(() => {
    // Don't save if we have initial props (those take priority)
    if (hasInitialProps) return;
    
    // Don't save empty forms
    if (!formData.playerId && !formData.summary && !formData.pointersForNextSession) return;
    
    saveToStorage({
      playerId: formData.playerId,
      playerSearch: playerSearch,
      reservationId: formData.reservationId || "",
      sessionDate: formData.sessionDate,
      sessionTime: formData.sessionTime || "",
      summary: formData.summary,
      areasWorkedOn: formData.areasWorkedOn,
      pointersForNextSession: formData.pointersForNextSession,
      additionalNotes: formData.additionalNotes || "",
    });
  }, [formData, playerSearch, hasInitialProps]);

  const handlePlayerSelect = (player: Member) => {
    setSelectedPlayer(player);
    setPlayerSearch(`${player.firstName} ${player.lastName}`);
    setFormData({ ...formData, playerId: player.id });
    setShowPlayerDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!token) {
        throw new Error("Not authenticated");
      }

      if (!formData.playerId || typeof formData.playerId !== "string") {
        throw new Error("Please select a player");
      }

      if (formData.areasWorkedOn.length === 0) {
        throw new Error("Please select at least one area worked on");
      }

      // Ensure playerId is a string (defensive check)
      const entryData: JournalEntryRequest = {
        ...formData,
        playerId: String(formData.playerId),
      };

      await createJournalEntry(entryData, token);
      
      // Clear localStorage on successful submission
      clearStorage();
      
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Failed to create journal entry");
    } finally {
      setLoading(false);
    }
  };

  const toggleArea = (area: string) => {
    setFormData((prev) => ({
      ...prev,
      areasWorkedOn: prev.areasWorkedOn.includes(area)
        ? prev.areasWorkedOn.filter((a) => a !== area)
        : [...prev.areasWorkedOn, area],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="relative" ref={playerDropdownRef}>
        <label htmlFor="playerSearch" className="block text-sm font-medium text-gray-700 mb-1">
          Player *
        </label>
        <input
          type="text"
          id="playerSearch"
          value={playerSearch}
          onChange={(e) => {
            setPlayerSearch(e.target.value);
            setShowPlayerDropdown(true);
            if (!e.target.value) {
              setSelectedPlayer(null);
              setFormData({ ...formData, playerId: "" });
            }
          }}
          onFocus={() => setShowPlayerDropdown(true)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search for a player by name, email, or member number..."
          required
        />
        {showPlayerDropdown && filteredPlayers.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredPlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => handlePlayerSelect(player)}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
              >
                <div className="font-medium text-gray-900">
                  {player.firstName} {player.lastName}
                </div>
                <div className="text-sm text-gray-500">
                  {player.email} • {player.memberNumber}
                </div>
              </button>
            ))}
          </div>
        )}
        {showPlayerDropdown && playerSearch && filteredPlayers.length === 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-sm text-gray-500">
            No players found matching "{playerSearch}"
          </div>
        )}
        {selectedPlayer && (
          <p className="mt-1 text-sm text-gray-500">
            Selected: {selectedPlayer.firstName} {selectedPlayer.lastName} ({selectedPlayer.memberNumber})
          </p>
        )}
      </div>

      <div>
        <label htmlFor="reservationId" className="block text-sm font-medium text-gray-700 mb-1">
          Reservation ID (Optional)
        </label>
        <input
          type="text"
          id="reservationId"
          value={formData.reservationId}
          onChange={(e) => setFormData({ ...formData, reservationId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Link to reservation (optional)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="sessionDate" className="block text-sm font-medium text-gray-700 mb-1">
            Session Date *
          </label>
          <input
            type="date"
            id="sessionDate"
            value={formData.sessionDate}
            onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="sessionTime" className="block text-sm font-medium text-gray-700 mb-1">
            Session Time (Optional)
          </label>
          <input
            type="time"
            id="sessionTime"
            value={formData.sessionTime}
            onChange={(e) => setFormData({ ...formData, sessionTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-1">
          Session Summary *
        </label>
        <textarea
          id="summary"
          value={formData.summary}
          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          required
          placeholder="e.g., Worked on backhand and serve today"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Areas Worked On *
        </label>
        <div className="flex flex-wrap gap-2">
          {AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => toggleArea(area)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                formData.areasWorkedOn.includes(area)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {area}
            </button>
          ))}
        </div>
        {formData.areasWorkedOn.length > 0 && (
          <p className="mt-2 text-sm text-gray-500">
            Selected: {formData.areasWorkedOn.join(", ")}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="pointersForNextSession" className="block text-sm font-medium text-gray-700 mb-1">
          Pointers for Next Session *
        </label>
        <textarea
          id="pointersForNextSession"
          value={formData.pointersForNextSession}
          onChange={(e) => setFormData({ ...formData, pointersForNextSession: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          required
          placeholder="e.g., Focus on follow-through on backhand. Practice serve placement."
        />
      </div>

      <div>
        <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700 mb-1">
          Additional Notes (Optional)
        </label>
        <textarea
          id="additionalNotes"
          value={formData.additionalNotes}
          onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="Any additional notes about the session"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Entry"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
