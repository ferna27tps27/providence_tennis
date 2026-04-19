"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth/auth-context";
import {
  getCoachLoad,
  getFinanceOverview,
  getRefundReport,
  FinanceOverview,
  RefundReport,
  CoachLoadRow,
} from "../../lib/api/report-api";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
}

export default function AdminOverview() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [refunds, setRefunds] = useState<RefundReport | null>(null);
  const [coachLoad, setCoachLoad] = useState<CoachLoadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [nextOverview, nextRefunds, nextCoachLoad] = await Promise.all([
          getFinanceOverview(token),
          getRefundReport(token),
          getCoachLoad(token),
        ]);
        setOverview(nextOverview);
        setRefunds(nextRefunds);
        setCoachLoad(nextCoachLoad.slice(0, 4));
      } catch (err: any) {
        setError(err.message || "Failed to load admin dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  if (loading) {
    return <div className="card">Loading owner dashboard...</div>;
  }

  if (error || !overview || !refunds) {
    return <div className="card text-red-600">{error || "Failed to load owner dashboard."}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Owner Dashboard</span>
        </h1>
        <p className="text-gray-600">Revenue, refunds, memberships, packages, and coach workload.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-gray-500">Net Revenue</div>
          <div className="text-2xl font-bold">{formatMoney(overview.netRevenue)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Pending Revenue</div>
          <div className="text-2xl font-bold">{formatMoney(overview.pendingRevenue)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Active Memberships</div>
          <div className="text-2xl font-bold">{overview.activeMemberships}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Active Packages</div>
          <div className="text-2xl font-bold">{overview.activeLessonPackages}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Revenue Mix</h2>
            <Link href="/dashboard/admin/reports" className="text-sm text-primary-600 hover:text-primary-700">
              Open Reports →
            </Link>
          </div>
          <div className="space-y-3">
            {overview.revenueByType.length === 0 ? (
              <p className="text-sm text-gray-500">No paid revenue yet.</p>
            ) : (
              overview.revenueByType.map((row) => (
                <div key={row.type} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-gray-600">{row.type.replaceAll("_", " ")}</span>
                  <span className="font-semibold">{formatMoney(row.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Coach Load</h2>
          <div className="space-y-3">
            {coachLoad.length === 0 ? (
              <p className="text-sm text-gray-500">No coach activity yet.</p>
            ) : (
              coachLoad.map((row) => (
                <div key={row.coachId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{row.coachName}</span>
                  <span className="font-semibold">{row.totalBlocks} blocks</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-2">Refund Activity</h2>
          <p className="text-sm text-gray-500 mb-4">Total refunded: {formatMoney(refunds.totalRefunded)}</p>
          <div className="space-y-3">
            {refunds.refunds.slice(0, 5).map((refund) => (
              <div key={refund.paymentId} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{refund.description}</span>
                <span className="font-semibold">{formatMoney(refund.amount)}</span>
              </div>
            ))}
            {refunds.refunds.length === 0 && <p className="text-sm text-gray-500">No refunds recorded.</p>}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/dashboard/admin/reports" className="block w-full btn-primary text-center">
              Open Reports
            </Link>
            <Link href="/dashboard/admin/contact-submissions" className="block w-full btn-secondary text-center">
              View Contact Inbox
            </Link>
            <Link href="/dashboard/schedule" className="block w-full btn-secondary text-center">
              Manage Schedule
            </Link>
            <Link href="/dashboard/coach-ai" className="block w-full btn-secondary text-center">
              Coach AI Workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
