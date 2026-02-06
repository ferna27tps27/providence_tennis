"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import PaymentCard from "../../../components/dashboard/PaymentCard";
import { useAuth } from "../../../lib/auth/auth-context";
import { getPayments, downloadInvoice, Payment } from "../../../lib/api/payment-api";
import { motion } from "framer-motion";

export default function PaymentsPage() {
  const { user, token } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "refunded">("all");

  useEffect(() => {
    if (!user || !token) return;

    const loadPayments = async () => {
      try {
        setIsLoading(true);
        setError("");
        const paymentData = await getPayments(token, { memberId: user.id });
        setPayments(paymentData);
      } catch (err: any) {
        setError(err.message || "Failed to load payments");
      } finally {
        setIsLoading(false);
      }
    };

    loadPayments();
  }, [user, token]);

  const handleViewInvoice = async (id: string) => {
    if (!token) return;

    try {
      await downloadInvoice(id, token);
    } catch (err: any) {
      alert(err.message || "Failed to download invoice");
    }
  };

  const filteredPayments = payments.filter((payment) => {
    if (filter === "all") return true;
    return payment.status === filter;
  });

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Calculate totals
  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = payments
    .filter((p) => p.refundAmount)
    .reduce((sum, p) => sum + (p.refundAmount || 0), 0);

  if (!user) return null;

  return (
    <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              <span className="gradient-text">Payment History</span>
            </h1>
            <p className="text-gray-600">View your payment history and download invoices</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="text-sm text-gray-600 mb-1">Total Paid</div>
              <div className="text-2xl font-bold text-green-600">
                ${(totalPaid / 100).toFixed(2)}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <div className="text-sm text-gray-600 mb-1">Total Refunded</div>
              <div className="text-2xl font-bold text-primary-600">
                ${(totalRefunded / 100).toFixed(2)}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <div className="text-sm text-gray-600 mb-1">Total Payments</div>
              <div className="text-2xl font-bold text-gray-900">{payments.length}</div>
            </motion.div>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-2 border-b border-gray-200">
            {(["all", "paid", "pending", "refunded"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                  filter === f
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading payments...</p>
            </div>
          ) : sortedPayments.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-600">
                {filter === "all" ? "No payments found" : `No ${filter} payments found`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedPayments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  onViewInvoice={handleViewInvoice}
                />
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
  );
}
