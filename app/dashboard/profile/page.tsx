"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import ProfileCard from "../../../components/dashboard/ProfileCard";
import { useAuth } from "../../../lib/auth/auth-context";
import { getCurrentMember, updateMember, Member } from "../../../lib/api/member-api";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const { user, token, refreshUser } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !token) return;

    const loadMember = async () => {
      try {
        setIsLoading(true);
        const memberData = await getCurrentMember(token);
        setMember(memberData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    loadMember();
  }, [user, token]);

  const handleUpdate = async (updates: Partial<Member>) => {
    if (!member || !token) return;

    try {
      setIsUpdating(true);
      setError("");
      const updated = await updateMember(member.id, updates, token);
      setMember(updated);
      await refreshUser();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      setError(msg);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Profile Settings</span>
          </h1>
          <p className="text-gray-600">Manage your personal information and account settings</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading profile...</p>
          </div>
        ) : member ? (
          <ProfileCard member={member} onUpdate={handleUpdate} isUpdating={isUpdating} />
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-600">Failed to load profile</p>
            {error && <p className="text-red-600 mt-2">{error}</p>}
          </div>
        )}

        {member && !member.emailVerified && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-yellow-50 border-yellow-200"
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-800 mb-1">Email Not Verified</h3>
                <p className="text-sm text-yellow-700 mb-3">
                  Please verify your email address to access all features.
                </p>
                <a
                  href="/verify-email"
                  className="text-sm text-yellow-800 hover:text-yellow-900 font-medium underline"
                >
                  Verify Email →
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
