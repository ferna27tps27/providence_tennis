"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth/auth-context";
import { getCoachLoad, CoachLoadRow } from "../../lib/api/report-api";
import { getSchedule, ScheduleItem } from "../../lib/api/schedule-api";

export default function CoachOverview() {
  const { token, user } = useAuth();
  const [coachLoad, setCoachLoad] = useState<CoachLoadRow | null>(null);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !user) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const end = new Date(today);
        end.setDate(end.getDate() + 6);
        const dateFrom = today.toISOString().split("T")[0];
        const dateTo = end.toISOString().split("T")[0];

        const [loadRows, schedule] = await Promise.all([
          getCoachLoad(token, { dateFrom, dateTo }),
          getSchedule(token, { dateFrom, dateTo }),
        ]);

        setCoachLoad(loadRows.find((row) => row.coachId === user.id) || null);
        setScheduleItems(schedule.filter((item) => item.coachId === user.id));
      } catch (err: any) {
        setError(err.message || "Failed to load coach dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, user]);

  const upcomingItems = useMemo(() => scheduleItems.slice(0, 5), [scheduleItems]);

  if (loading) {
    return <div className="card">Loading coach dashboard...</div>;
  }

  if (error) {
    return <div className="card text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Coach Dashboard</span>
        </h1>
        <p className="text-gray-600">Your workload, schedule, and coaching tools.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-gray-500">Scheduled Blocks</div>
          <div className="text-2xl font-bold">{coachLoad?.totalBlocks || 0}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Private Lessons</div>
          <div className="text-2xl font-bold">{coachLoad?.privateLessonCount || 0}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Program Sessions</div>
          <div className="text-2xl font-bold">{coachLoad?.programSessionCount || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Upcoming Schedule</h2>
            <Link href="/dashboard/schedule" className="text-sm text-primary-600 hover:text-primary-700">
              Open Schedule →
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingItems.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming coach schedule items.</p>
            ) : (
              upcomingItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                  <div className="font-semibold">{item.title}</div>
                  <div className="text-gray-600">
                    {item.date} | {item.startTime} - {item.endTime}
                  </div>
                  <div className="text-gray-500">{item.primaryPerson}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/dashboard/coach-ai" className="block w-full btn-primary text-center">
              Open Coach AI
            </Link>
            <Link href="/dashboard/journal" className="block w-full btn-secondary text-center">
              Open Journal
            </Link>
            <Link href="/dashboard/schedule" className="block w-full btn-secondary text-center">
              Open Schedule
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
