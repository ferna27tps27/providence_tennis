import { describe, it, expect } from "vitest";
import { timeRangesOverlap } from "../../lib/utils/time-ranges";

describe("timeRangesOverlap", () => {
  describe("overlapping ranges", () => {
    it("should detect partial overlap", () => {
      expect(timeRangesOverlap("10:00", "11:00", "10:30", "11:30")).toBe(true);
    });

    it("should detect reverse partial overlap", () => {
      expect(timeRangesOverlap("10:30", "11:30", "10:00", "11:00")).toBe(true);
    });

    it("should detect contained range", () => {
      expect(timeRangesOverlap("10:00", "12:00", "10:30", "11:30")).toBe(true);
    });

    it("should detect containing range", () => {
      expect(timeRangesOverlap("10:30", "11:30", "10:00", "12:00")).toBe(true);
    });

    it("should detect exact match", () => {
      expect(timeRangesOverlap("10:00", "11:00", "10:00", "11:00")).toBe(true);
    });

    it("should detect overlap when one starts at the end of another", () => {
      // 10:00-11:00 and 10:59-11:59 should overlap
      expect(timeRangesOverlap("10:00", "11:00", "10:59", "11:59")).toBe(true);
    });
  });

  describe("non-overlapping ranges", () => {
    it("should not detect overlap for adjacent ranges", () => {
      expect(timeRangesOverlap("10:00", "11:00", "11:00", "12:00")).toBe(false);
    });

    it("should not detect overlap for separate ranges", () => {
      expect(timeRangesOverlap("10:00", "11:00", "12:00", "13:00")).toBe(false);
    });

    it("should not detect overlap when one is before the other", () => {
      expect(timeRangesOverlap("08:00", "09:00", "10:00", "11:00")).toBe(false);
    });

    it("should not detect overlap when one is after the other", () => {
      expect(timeRangesOverlap("10:00", "11:00", "08:00", "09:00")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle single minute overlap", () => {
      expect(timeRangesOverlap("10:00", "10:01", "10:00", "10:01")).toBe(true);
    });

    it("should handle early morning times", () => {
      expect(timeRangesOverlap("08:00", "09:00", "08:30", "09:30")).toBe(true);
    });

    it("should handle late evening times", () => {
      expect(timeRangesOverlap("20:00", "21:00", "20:30", "21:00")).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should throw error for invalid time format", () => {
      expect(() => timeRangesOverlap("invalid", "11:00", "10:00", "11:00")).toThrow();
    });

    it("should throw error when end time is before start time", () => {
      expect(() => timeRangesOverlap("11:00", "10:00", "10:00", "11:00")).toThrow();
    });

    it("should throw error when end time equals start time", () => {
      expect(() => timeRangesOverlap("10:00", "10:00", "10:00", "11:00")).toThrow();
    });
  });
});
