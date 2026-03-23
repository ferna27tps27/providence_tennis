"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/auth-context";
import { getScheduleMembers, ScheduleMember } from "../../lib/api/schedule-api";
import {
  createLessonPackageRecord,
  createMembershipRecord,
  getCoachLoad,
  getCourtUtilization,
  getFinanceOverview,
  getLessonPackageRecords,
  getMembershipRecords,
  getRefundReport,
  CoachLoadRow,
  CourtUtilizationRow,
  FinanceOverview,
  LessonPackageRecord,
  MembershipRecord,
  RefundReport,
} from "../../lib/api/report-api";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100);
}

export default function ReportsWorkspace() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [refunds, setRefunds] = useState<RefundReport | null>(null);
  const [courtUtilization, setCourtUtilization] = useState<CourtUtilizationRow[]>([]);
  const [coachLoad, setCoachLoad] = useState<CoachLoadRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipRecord[]>([]);
  const [lessonPackages, setLessonPackages] = useState<LessonPackageRecord[]>([]);
  const [players, setPlayers] = useState<ScheduleMember[]>([]);
  const [coaches, setCoaches] = useState<ScheduleMember[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [membershipForm, setMembershipForm] = useState({
    memberId: "",
    planName: "",
    billingPeriod: "monthly" as "monthly" | "quarterly" | "yearly" | "custom",
    price: "",
    startsOn: new Date().toISOString().split("T")[0],
    endsOn: "",
    notes: "",
  });
  const [packageForm, setPackageForm] = useState({
    memberId: "",
    coachId: "",
    packageName: "",
    sessionCountTotal: "10",
    price: "",
    expiresOn: "",
    notes: "",
  });

  const loadData = async (activeToken: string) => {
    setLoading(true);
    setError("");

    try {
      const [nextOverview, nextRefunds, nextCourtUtilization, nextCoachLoad, nextMemberships, nextLessonPackages, nextPlayers, nextCoaches] =
        await Promise.all([
          getFinanceOverview(activeToken),
          getRefundReport(activeToken),
          getCourtUtilization(activeToken),
          getCoachLoad(activeToken),
          getMembershipRecords(activeToken),
          getLessonPackageRecords(activeToken),
          getScheduleMembers(activeToken, "player"),
          getScheduleMembers(activeToken, "coach"),
        ]);

      setOverview(nextOverview);
      setRefunds(nextRefunds);
      setCourtUtilization(nextCourtUtilization);
      setCoachLoad(nextCoachLoad);
      setMemberships(nextMemberships);
      setLessonPackages(nextLessonPackages);
      setPlayers(nextPlayers);
      setCoaches(nextCoaches);
      setMembershipForm((current) => ({ ...current, memberId: current.memberId || nextPlayers[0]?.id || "" }));
      setPackageForm((current) => ({
        ...current,
        memberId: current.memberId || nextPlayers[0]?.id || "",
        coachId: current.coachId || nextCoaches[0]?.id || "",
      }));
    } catch (err: any) {
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadData(token);
  }, [token]);

  const handleCreateMembership = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      await createMembershipRecord(token, {
        memberId: membershipForm.memberId,
        planName: membershipForm.planName,
        billingPeriod: membershipForm.billingPeriod,
        price: Math.round(Number(membershipForm.price) * 100),
        startsOn: membershipForm.startsOn,
        endsOn: membershipForm.endsOn || undefined,
        notes: membershipForm.notes || undefined,
      });
      setSuccess("Membership created and recorded as paid.");
      await loadData(token);
    } catch (err: any) {
      setError(err.message || "Failed to create membership");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePackage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      await createLessonPackageRecord(token, {
        memberId: packageForm.memberId,
        coachId: packageForm.coachId || undefined,
        packageName: packageForm.packageName,
        sessionCountTotal: Number(packageForm.sessionCountTotal),
        price: Math.round(Number(packageForm.price) * 100),
        expiresOn: packageForm.expiresOn || undefined,
        notes: packageForm.notes || undefined,
      });
      setSuccess("Lesson package created and recorded as paid.");
      await loadData(token);
    } catch (err: any) {
      setError(err.message || "Failed to create lesson package");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="card">Loading reports...</div>;
  }

  if (!overview || !refunds) {
    return <div className="card text-red-600">{error || "Failed to load reports."}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Reports & Finance</span>
        </h1>
        <p className="text-gray-600">Owner-level finance tracking, packages, memberships, and operational reports.</p>
      </div>

      {(error || success) && (
        <div className={`card ${error ? "text-red-600" : "text-green-600"}`}>{error || success}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card"><div className="text-sm text-gray-500">Gross Revenue</div><div className="text-2xl font-bold">{formatMoney(overview.grossRevenue)}</div></div>
        <div className="card"><div className="text-sm text-gray-500">Refunded</div><div className="text-2xl font-bold">{formatMoney(overview.refundedAmount)}</div></div>
        <div className="card"><div className="text-sm text-gray-500">Net Revenue</div><div className="text-2xl font-bold">{formatMoney(overview.netRevenue)}</div></div>
        <div className="card"><div className="text-sm text-gray-500">Payments</div><div className="text-2xl font-bold">{overview.paymentCount}</div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <form onSubmit={handleCreateMembership} className="card space-y-4">
          <h2 className="text-xl font-bold">Add Membership</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={membershipForm.memberId} onChange={(e) => setMembershipForm((p) => ({ ...p, memberId: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
              {players.map((player) => <option key={player.id} value={player.id}>{player.firstName} {player.lastName}</option>)}
            </select>
            <input value={membershipForm.planName} onChange={(e) => setMembershipForm((p) => ({ ...p, planName: e.target.value }))} placeholder="Annual Membership" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <select value={membershipForm.billingPeriod} onChange={(e) => setMembershipForm((p) => ({ ...p, billingPeriod: e.target.value as any }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
            <input type="number" min="0" value={membershipForm.price} onChange={(e) => setMembershipForm((p) => ({ ...p, price: e.target.value }))} placeholder="Price (USD)" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <input type="date" value={membershipForm.startsOn} onChange={(e) => setMembershipForm((p) => ({ ...p, startsOn: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <input type="date" value={membershipForm.endsOn} onChange={(e) => setMembershipForm((p) => ({ ...p, endsOn: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          </div>
          <textarea value={membershipForm.notes} onChange={(e) => setMembershipForm((p) => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Notes" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Saving..." : "Create Membership"}</button>
        </form>

        <form onSubmit={handleCreatePackage} className="card space-y-4">
          <h2 className="text-xl font-bold">Add Lesson Package</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={packageForm.memberId} onChange={(e) => setPackageForm((p) => ({ ...p, memberId: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
              {players.map((player) => <option key={player.id} value={player.id}>{player.firstName} {player.lastName}</option>)}
            </select>
            <select value={packageForm.coachId} onChange={(e) => setPackageForm((p) => ({ ...p, coachId: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
              {coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.firstName} {coach.lastName}</option>)}
            </select>
            <input value={packageForm.packageName} onChange={(e) => setPackageForm((p) => ({ ...p, packageName: e.target.value }))} placeholder="10-Lesson Package" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <input type="number" min="1" value={packageForm.sessionCountTotal} onChange={(e) => setPackageForm((p) => ({ ...p, sessionCountTotal: e.target.value }))} placeholder="Sessions" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <input type="number" min="0" value={packageForm.price} onChange={(e) => setPackageForm((p) => ({ ...p, price: e.target.value }))} placeholder="Price (USD)" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <input type="date" value={packageForm.expiresOn} onChange={(e) => setPackageForm((p) => ({ ...p, expiresOn: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          </div>
          <textarea value={packageForm.notes} onChange={(e) => setPackageForm((p) => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Notes" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Saving..." : "Create Lesson Package"}</button>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Court Utilization</h2>
          <div className="space-y-3">
            {courtUtilization.map((row) => (
              <div key={row.courtId} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{row.courtName}</span>
                <span className="font-semibold">{row.totalScheduledBlocks} blocks</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Coach Load</h2>
          <div className="space-y-3">
            {coachLoad.map((row) => (
              <div key={row.coachId} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{row.coachName}</span>
                <span className="font-semibold">{row.totalBlocks} blocks</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Memberships</h2>
          <div className="space-y-3">
            {memberships.map((membership) => (
              <div key={membership.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                <div className="font-semibold">{membership.planName}</div>
                <div className="text-gray-600 capitalize">{membership.billingPeriod} | {membership.status}</div>
                <div className="text-gray-500">{formatMoney(membership.price)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Lesson Packages</h2>
          <div className="space-y-3">
            {lessonPackages.map((lessonPackage) => (
              <div key={lessonPackage.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                <div className="font-semibold">{lessonPackage.packageName}</div>
                <div className="text-gray-600">{lessonPackage.sessionCountUsed}/{lessonPackage.sessionCountTotal} sessions used</div>
                <div className="text-gray-500">{formatMoney(lessonPackage.price)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
