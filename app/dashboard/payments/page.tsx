"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import PaymentCard from "../../../components/dashboard/PaymentCard";
import { useAuth } from "../../../lib/auth/auth-context";
import { downloadInvoice, getPayments, Payment } from "../../../lib/api/payment-api";

type PaymentFilter = "all" | "paid" | "pending" | "refunded" | "failed";

function formatMoney(amount: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function PaymentsPage() {
  const { user, token } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) return;

    const loadPayments = async () => {
      try {
        setLoading(true);
        setError("");
        const paymentData = await getPayments(token);
        setPayments(paymentData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load payments");
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, [user, token]);

  const filteredPayments = useMemo(() => {
    const activePayments = filter === "all" ? payments : payments.filter((payment) => payment.status === filter);
    return [...activePayments].sort(
      (a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime()
    );
  }, [filter, payments]);

  const totals = useMemo(() => {
    return payments.reduce(
      (acc, payment) => {
        if (payment.status === "paid") acc.totalPaid += payment.amount;
        if (payment.status === "pending") acc.pending += payment.amount;
        if (payment.refundAmount) acc.refunded += payment.refundAmount;
        return acc;
      },
      { totalPaid: 0, pending: 0, refunded: 0 }
    );
  }, [payments]);

  const handleViewInvoice = async (id: string) => {
    if (!token) return;

    try {
      setDownloadingId(id);
      await downloadInvoice(id, token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to download invoice");
    } finally {
      setDownloadingId(null);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              <span className="gradient-text">Payment History</span>
            </h1>
            <p className="text-gray-600">
              Review completed charges, pending payments, refunds, and download invoices when available.
            </p>
          </div>
          <Link href="/dashboard/book" className="btn-primary text-center">
            Book Another Court
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="card">
            <div className="text-sm text-gray-500">Paid Total</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(totals.totalPaid)}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">Pending</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(totals.pending)}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">Refunded</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(totals.refunded)}</div>
          </div>
        </div>

        <div className="card">
          <div className="flex flex-wrap gap-2">
            {(["all", "paid", "pending", "refunded", "failed"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  filter === value
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-700"
                }`}
              >
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="card text-center py-12">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
            <p className="text-gray-600">Loading payments...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 mb-4">No {filter === "all" ? "" : `${filter} `}payments found yet.</p>
            <Link href="/dashboard/book" className="btn-primary inline-block">
              Book a Court
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <div key={payment.id} className={downloadingId === payment.id ? "opacity-70" : ""}>
                <PaymentCard payment={payment} onViewInvoice={handleViewInvoice} />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
