"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";

interface PaymentCardProps {
  payment: {
    id: string;
    type: "court_booking" | "membership" | "other";
    amount: number;
    currency: string;
    status: "pending" | "paid" | "refunded" | "failed" | "cancelled";
    description?: string;
    createdAt: string;
    paidAt?: string;
    refundAmount?: number;
    reservationId?: string;
  };
  onViewInvoice?: (id: string) => void;
}

export default function PaymentCard({ payment, onViewInvoice }: PaymentCardProps) {
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "refunded":
        return "bg-blue-100 text-blue-700";
      case "failed":
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "court_booking":
        return "Court Booking";
      case "membership":
        return "Membership";
      default:
        return "Other";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {payment.description || getTypeLabel(payment.type)}
            </h3>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
            </span>
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <span>💰</span>
              <span className="font-semibold text-gray-900">{formatAmount(payment.amount, payment.currency)}</span>
              {payment.refundAmount && (
                <span className="text-red-600">
                  (Refunded: {formatAmount(payment.refundAmount, payment.currency)})
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span>📅</span>
              <span>{formatDate(payment.paidAt || payment.createdAt)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🏷️</span>
              <span className="capitalize">{getTypeLabel(payment.type)}</span>
            </div>
          </div>
        </div>

        {payment.status === "paid" && onViewInvoice && (
          <button
            onClick={() => onViewInvoice(payment.id)}
            className="ml-4 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
          >
            View Invoice
          </button>
        )}
      </div>
    </motion.div>
  );
}
