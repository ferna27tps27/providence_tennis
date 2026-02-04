/**
 * Utility functions for time range operations
 */

/**
 * Checks if two time ranges overlap
 * 
 * Two time ranges overlap if: start1 < end2 AND start2 < end1
 * 
 * @param start1 Start time of first range (HH:mm format)
 * @param end1 End time of first range (HH:mm format)
 * @param start2 Start time of second range (HH:mm format)
 * @param end2 End time of second range (HH:mm format)
 * @returns true if ranges overlap, false otherwise
 * 
 * @example
 * // Overlapping ranges
 * timeRangesOverlap("10:00", "11:00", "10:30", "11:30") // true
 * 
 * // Non-overlapping ranges
 * timeRangesOverlap("10:00", "11:00", "11:00", "12:00") // false
 * 
 * // Contained range
 * timeRangesOverlap("10:00", "12:00", "10:30", "11:30") // true
 */
export function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // Convert HH:mm to minutes since midnight
  const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      throw new Error(`Invalid time format: ${time}. Expected HH:mm`);
    }
    return hours * 60 + minutes;
  };

  try {
    const start1Min = toMinutes(start1);
    const end1Min = toMinutes(end1);
    const start2Min = toMinutes(start2);
    const end2Min = toMinutes(end2);

    // Validate that end times are after start times
    if (end1Min <= start1Min) {
      throw new Error(`Invalid time range: end (${end1}) must be after start (${start1})`);
    }
    if (end2Min <= start2Min) {
      throw new Error(`Invalid time range: end (${end2}) must be after start (${start2})`);
    }

    // Two ranges overlap if: start1 < end2 AND start2 < end1
    // This handles all cases:
    // - Partial overlap: 10:00-11:00 and 10:30-11:30
    // - Contained: 10:00-12:00 contains 10:30-11:30
    // - Exact match: 10:00-11:00 and 10:00-11:00
    // - Adjacent (non-overlapping): 10:00-11:00 and 11:00-12:00 returns false
    return start1Min < end2Min && start2Min < end1Min;
  } catch (error) {
    // Re-throw with context
    throw new Error(`Error checking time range overlap: ${error instanceof Error ? error.message : String(error)}`);
  }
}
