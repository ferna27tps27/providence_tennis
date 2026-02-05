/**
 * Journal API client functions
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export interface JournalEntry {
  id: string;
  playerId: string;
  coachId: string;
  reservationId?: string;
  sessionDate: string;
  sessionTime?: string;
  summary: string;
  areasWorkedOn: string[];
  pointersForNextSession: string;
  additionalNotes?: string;
  playerReflection?: string;
  createdAt: string;
  lastModified: string;
  createdBy: string;
  coachName?: string;
  playerName?: string;
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

export interface JournalEntriesResponse {
  entries: JournalEntry[];
  total: number;
}

export interface ApiError {
  error: string;
  code?: string;
}

/**
 * Create journal entry
 */
export async function createJournalEntry(
  data: JournalEntryRequest,
  token: string
): Promise<JournalEntry> {
  const response = await fetch(`${API_BASE_URL}/api/journal/entries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to create journal entry");
  }

  return response.json();
}

/**
 * Get journal entries
 */
export async function getJournalEntries(
  token: string,
  filters?: {
    playerId?: string;
    playerName?: string;
    coachId?: string;
    coachName?: string;
    startDate?: string;
    endDate?: string;
    areaWorkedOn?: string;
  }
): Promise<JournalEntriesResponse> {
  const params = new URLSearchParams();
  if (filters?.playerId) params.append("playerId", filters.playerId);
  if (filters?.playerName) params.append("playerName", filters.playerName);
  if (filters?.coachId) params.append("coachId", filters.coachId);
  if (filters?.coachName) params.append("coachName", filters.coachName);
  if (filters?.startDate) params.append("startDate", filters.startDate);
  if (filters?.endDate) params.append("endDate", filters.endDate);
  if (filters?.areaWorkedOn) params.append("areaWorkedOn", filters.areaWorkedOn);

  const url = `${API_BASE_URL}/api/journal/entries${params.toString() ? `?${params.toString()}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to get journal entries");
  }

  return response.json();
}

/**
 * Get journal entry by ID
 */
export async function getJournalEntry(
  id: string,
  token: string
): Promise<JournalEntry> {
  const response = await fetch(`${API_BASE_URL}/api/journal/entries/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to get journal entry");
  }

  return response.json();
}

/**
 * Update journal entry
 */
export async function updateJournalEntry(
  id: string,
  updates: Partial<JournalEntryRequest>,
  token: string
): Promise<JournalEntry> {
  const response = await fetch(`${API_BASE_URL}/api/journal/entries/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to update journal entry");
  }

  return response.json();
}

/**
 * Delete journal entry
 */
export async function deleteJournalEntry(
  id: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/journal/entries/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to delete journal entry");
  }
}

/**
 * Get the most recent journal entry for a player
 */
export async function getLatestJournalEntryForPlayer(
  playerId: string,
  token: string
): Promise<JournalEntry | null> {
  try {
    const response = await getJournalEntries(token, { playerId });
    if (response.entries.length === 0) return null;
    
    // Sort by session date descending to get most recent
    const sorted = response.entries.sort((a, b) => {
      const dateA = new Date(a.sessionDate);
      const dateB = new Date(b.sessionDate);
      return dateB.getTime() - dateA.getTime();
    });
    
    return sorted[0];
  } catch (error) {
    console.error("Error fetching latest journal entry:", error);
    return null;
  }
}

/**
 * Add or update player reflection on a journal entry
 */
export async function addPlayerReflection(
  entryId: string,
  reflection: string,
  token: string
): Promise<JournalEntry> {
  const response = await fetch(`${API_BASE_URL}/api/journal/entries/${entryId}/reflection`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reflection }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to add player reflection");
  }

  return response.json();
}
