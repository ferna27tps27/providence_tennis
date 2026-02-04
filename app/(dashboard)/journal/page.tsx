"use client";

import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import { useAuth } from "../../../lib/auth/auth-context";
import PlayerJournalView from "../../../components/journal/PlayerJournalView";
import CoachJournalView from "../../../components/journal/CoachJournalView";

export default function JournalPage() {
  const { user } = useAuth();

  if (!user) return null;

  // Show different views based on role
  const isCoach = user.role === "coach" || user.role === "admin";
  const isPlayer = user.role === "player";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Journal</h1>
          <p className="text-gray-600">
            {isCoach
              ? "Manage coaching sessions and journal entries"
              : "View your coaching journal entries"}
          </p>
        </div>

        {isCoach ? <CoachJournalView /> : isPlayer ? <PlayerJournalView /> : null}
      </div>
    </DashboardLayout>
  );
}
