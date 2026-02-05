"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { getJournalEntries, JournalEntry } from "@/lib/api/journal-api";
import { useAuth } from "@/lib/auth/auth-context";
import CoachJournalForm from "./CoachJournalForm";
import JournalEntryCard from "./JournalEntryCard";
import JournalAnalytics from "./JournalAnalytics";
import JournalExport from "./JournalExport";

export default function CoachJournalView() {
  const { token, user: member } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if there's saved form data in localStorage and open form if so
  const [showForm, setShowForm] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem("journal_entry_draft");
      if (stored) {
        const data = JSON.parse(stored);
        // Check if there's meaningful data (not just empty strings)
        if (
          data.playerId ||
          data.summary ||
          data.pointersForNextSession ||
          data.areasWorkedOn?.length > 0
        ) {
          return true;
        }
      }
    } catch (error) {
      // Ignore errors, just default to false
    }
    return false;
  });
  const [showFilters, setShowFilters] = useState(() => {
    // Show filters if any filter params exist in URL
    return !!(
      searchParams.get("playerName") ||
      searchParams.get("startDate") ||
      searchParams.get("endDate") ||
      searchParams.get("areaWorkedOn")
    );
  });
  
  // Initialize filters from URL params
  const [filters, setFilters] = useState({
    playerName: searchParams.get("playerName") || "",
    startDate: searchParams.get("startDate") || "",
    endDate: searchParams.get("endDate") || "",
    areaWorkedOn: searchParams.get("areaWorkedOn") || "",
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);
  
  // Track which view to show
  const [activeView, setActiveView] = useState<"entries" | "analytics">("entries");

  // Update URL params when filters change (debounced for text inputs)
  useEffect(() => {
    if (urlUpdateTimeoutRef.current) {
      clearTimeout(urlUpdateTimeoutRef.current);
    }

    urlUpdateTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (filters.playerName) params.set("playerName", filters.playerName);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.areaWorkedOn) params.set("areaWorkedOn", filters.areaWorkedOn);

      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    }, 300); // 300ms debounce for URL updates

    return () => {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
    };
  }, [filters, pathname, router]);

  // Debounce text input filters (playerName, areaWorkedOn)
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedFilters({
        ...filters,
        // Keep date filters immediate (no debounce)
        playerName: filters.playerName,
        areaWorkedOn: filters.areaWorkedOn,
      });
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [filters.playerName, filters.areaWorkedOn]);

  // Update debounced filters immediately for date changes
  useEffect(() => {
    setDebouncedFilters((prev) => ({
      ...prev,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }));
  }, [filters.startDate, filters.endDate]);

  useEffect(() => {
    if (!token) return;

    const loadEntries = async () => {
      if (isInitialLoad.current) {
        setLoading(true);
        isInitialLoad.current = false;
      }
      setError(null);

      try {
        const response = await getJournalEntries(token, {
          ...(debouncedFilters.playerName && { playerName: debouncedFilters.playerName }),
          ...(debouncedFilters.startDate && { startDate: debouncedFilters.startDate }),
          ...(debouncedFilters.endDate && { endDate: debouncedFilters.endDate }),
          ...(debouncedFilters.areaWorkedOn && { areaWorkedOn: debouncedFilters.areaWorkedOn }),
        });
        setEntries(response.entries);
      } catch (err: any) {
        setError(err.message || "Failed to load journal entries");
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, [token, debouncedFilters]);

  const handleFormSuccess = () => {
    setShowForm(false);
    // Reload entries
    if (token) {
      getJournalEntries(token, {
        ...(filters.playerName && { playerName: filters.playerName }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.areaWorkedOn && { areaWorkedOn: filters.areaWorkedOn }),
      }).then((response) => {
        setEntries(response.entries);
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading journal entries...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View Toggle and Create Button */}
      <div className="flex justify-between items-center">
        <div className="inline-flex rounded-lg border border-gray-300 bg-white">
          <button
            onClick={() => setActiveView("entries")}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg transition-colors ${
              activeView === "entries"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            📔 Entries
          </button>
          <button
            onClick={() => setActiveView("analytics")}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg transition-colors ${
              activeView === "analytics"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            📊 Analytics
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          {activeView === "entries" && entries.length > 0 && (
            <JournalExport entries={entries} userRole={member?.role as "player" | "coach" | "admin"} />
          )}
          
          {activeView === "entries" && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              {showForm ? "Cancel" : "+ Create Entry"}
            </button>
          )}
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold mb-4">Create Journal Entry</h3>
          <CoachJournalForm onSuccess={handleFormSuccess} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Analytics View */}
      {activeView === "analytics" && (
        <JournalAnalytics entries={entries} userRole={member?.role as "player" | "coach" | "admin"} />
      )}

      {/* Entries View */}
      {activeView === "entries" && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-medium text-gray-700">Filters</h3>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showFilters ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showFilters && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Player Name
            </label>
            <input
              type="text"
              value={filters.playerName}
              onChange={(e) => setFilters({ ...filters, playerName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Filter by player name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area Worked On
            </label>
            <input
              type="text"
              value={filters.areaWorkedOn}
              onChange={(e) => setFilters({ ...filters, areaWorkedOn: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="e.g., backhand"
            />
          </div>
            </div>
          </div>
        )}
      </div>

          {/* Entries */}
          {entries.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-4">No journal entries found.</p>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Create Your First Entry
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <JournalEntryCard 
                  key={entry.id} 
                  entry={entry} 
                  userRole={member?.role as "player" | "coach" | "admin"}
                  onUpdate={() => {
                    // Reload entries after reflection is added
                    if (token) {
                      getJournalEntries(token, {
                        ...(debouncedFilters.playerName && { playerName: debouncedFilters.playerName }),
                        ...(debouncedFilters.startDate && { startDate: debouncedFilters.startDate }),
                        ...(debouncedFilters.endDate && { endDate: debouncedFilters.endDate }),
                        ...(debouncedFilters.areaWorkedOn && { areaWorkedOn: debouncedFilters.areaWorkedOn }),
                      }).then((response) => {
                        setEntries(response.entries);
                      });
                    }
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
