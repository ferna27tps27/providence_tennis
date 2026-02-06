"use client";

import { JournalEntry } from "@/lib/api/journal-api";
import { useMemo } from "react";
import { format, subDays, isAfter } from "date-fns";

interface JournalAnalyticsProps {
  entries: JournalEntry[];
  userRole?: "player" | "coach" | "admin";
}

interface AreaStats {
  area: string;
  count: number;
  percentage: number;
}

export default function JournalAnalytics({ entries, userRole }: JournalAnalyticsProps) {
  const stats = useMemo(() => {
    if (entries.length === 0) {
      return {
        totalEntries: 0,
        uniquePlayers: 0,
        uniqueCoaches: 0,
        areasWorkedOn: [] as AreaStats[],
        recentEntries: 0,
        entriesThisMonth: 0,
      };
    }

    // Count areas worked on
    const areaCount: Record<string, number> = {};
    let totalAreas = 0;
    entries.forEach((entry) => {
      entry.areasWorkedOn.forEach((area) => {
        areaCount[area] = (areaCount[area] || 0) + 1;
        totalAreas++;
      });
    });

    const areasWorkedOn: AreaStats[] = Object.entries(areaCount)
      .map(([area, count]) => ({
        area,
        count,
        percentage: (count / totalAreas) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Count unique players and coaches
    const uniquePlayers = new Set(entries.map((e) => e.playerId)).size;
    const uniqueCoaches = new Set(entries.map((e) => e.coachId)).size;

    // Count recent entries (last 7 days)
    const sevenDaysAgo = subDays(new Date(), 7);
    const recentEntries = entries.filter((entry) =>
      isAfter(new Date(entry.sessionDate), sevenDaysAgo)
    ).length;

    // Count entries this month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const entriesThisMonth = entries.filter((entry) => {
      const entryDate = new Date(entry.sessionDate);
      return (
        entryDate.getMonth() === currentMonth &&
        entryDate.getFullYear() === currentYear
      );
    }).length;

    return {
      totalEntries: entries.length,
      uniquePlayers,
      uniqueCoaches,
      areasWorkedOn,
      recentEntries,
      entriesThisMonth,
    };
  }, [entries]);

  // Get most recent entry
  const mostRecentEntry = useMemo(() => {
    if (entries.length === 0) return null;
    return entries.reduce((latest, entry) => {
      return new Date(entry.sessionDate) > new Date(latest.sessionDate)
        ? entry
        : latest;
    });
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-500">No journal entries yet. Create your first entry to see analytics!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEntries}</p>
            </div>
            <div className="text-3xl">📔</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.entriesThisMonth}</p>
            </div>
            <div className="text-3xl">📅</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Last 7 Days</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recentEntries}</p>
            </div>
            <div className="text-3xl">🔥</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {userRole === "coach" ? "Players" : "Coaches"}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {userRole === "coach" ? stats.uniquePlayers : stats.uniqueCoaches}
              </p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>
      </div>

      {/* Areas Worked On */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Areas Worked On</h3>
        <div className="space-y-3">
          {stats.areasWorkedOn.slice(0, 8).map((stat) => (
            <div key={stat.area}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {stat.area}
                </span>
                <span className="text-sm text-gray-600">
                  {stat.count} {stat.count === 1 ? "session" : "sessions"} ({stat.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stat.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Most Recent Entry */}
      {mostRecentEntry && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Most Recent Entry</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Date:</span>
              <span className="text-sm font-medium text-gray-900">
                {format(new Date(mostRecentEntry.sessionDate), "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {userRole === "coach" ? "Player:" : "Coach:"}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {userRole === "coach"
                  ? mostRecentEntry.playerName || "Unknown Player"
                  : mostRecentEntry.coachName || "Unknown Coach"}
              </span>
            </div>
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{mostRecentEntry.summary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
