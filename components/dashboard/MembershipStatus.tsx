"use client";

import { motion } from "framer-motion";

interface MembershipStatusProps {
  memberId: string;
  isActive?: boolean;
  role?: string;
}

export default function MembershipStatus({
  memberId,
  isActive = true,
  role,
}: MembershipStatusProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card"
    >
      <h3 className="text-xl font-bold mb-4">Membership Status</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Status</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              isActive
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Role</span>
          <span className="font-semibold text-primary-600 capitalize">{role || "Player"}</span>
        </div>
      </div>
    </motion.div>
  );
}
