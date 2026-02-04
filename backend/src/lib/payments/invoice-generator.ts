/**
 * Invoice generation utilities
 */

import { Payment } from "../../types/payment";

export interface Invoice {
  invoiceNumber: string;
  paymentId: string;
  memberId?: string;
  memberName?: string;
  memberEmail?: string;
  amount: number;
  currency: string;
  description?: string;
  date: string;
  status: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * Generate invoice number
 */
function generateInvoiceNumber(paymentId: string): string {
  // Format: INV-{timestamp}-{paymentId}
  const timestamp = Date.now();
  return `INV-${timestamp}-${paymentId.substring(0, 8)}`;
}

/**
 * Generate invoice from payment
 */
export function generateInvoice(
  payment: Payment,
  memberName?: string,
  memberEmail?: string
): Invoice {
  const invoiceNumber = generateInvoiceNumber(payment.id);

  // Convert amount from cents to dollars
  const amountInDollars = payment.amount / 100;

  // Create invoice items
  const items: InvoiceItem[] = [
    {
      description: payment.description || getPaymentTypeDescription(payment.type),
      quantity: 1,
      unitPrice: amountInDollars,
      total: amountInDollars,
    },
  ];

  // Add refund item if refunded or has refund amount
  if (payment.refundAmount) {
    const refundAmount = payment.refundAmount / 100;
    items.push({
      description: "Refund",
      quantity: 1,
      unitPrice: -refundAmount,
      total: -refundAmount,
    });
  }

  return {
    invoiceNumber,
    paymentId: payment.id,
    memberId: payment.memberId,
    memberName,
    memberEmail,
    amount: amountInDollars,
    currency: payment.currency.toUpperCase(),
    description: payment.description,
    date: payment.paidAt || payment.createdAt,
    status: payment.status,
    items,
  };
}

/**
 * Get payment type description
 */
function getPaymentTypeDescription(type: Payment["type"]): string {
  switch (type) {
    case "court_booking":
      return "Court Booking";
    case "membership":
      return "Membership Fee";
    case "other":
      return "Payment";
    default:
      return "Payment";
  }
}

/**
 * Format invoice as text
 */
export function formatInvoiceAsText(invoice: Invoice): string {
  const lines: string[] = [];

  lines.push("=".repeat(50));
  lines.push("INVOICE");
  lines.push("=".repeat(50));
  lines.push("");
  lines.push(`Invoice Number: ${invoice.invoiceNumber}`);
  lines.push(`Date: ${new Date(invoice.date).toLocaleDateString()}`);
  lines.push(`Status: ${invoice.status.toUpperCase()}`);
  lines.push("");

  if (invoice.memberName) {
    lines.push(`Bill To: ${invoice.memberName}`);
    if (invoice.memberEmail) {
      lines.push(`Email: ${invoice.memberEmail}`);
    }
    lines.push("");
  }

  lines.push("Items:");
  lines.push("-".repeat(50));
  invoice.items.forEach((item) => {
    lines.push(
      `${item.description.padEnd(30)} ${item.quantity.toString().padStart(3)} x $${item.unitPrice.toFixed(2).padStart(8)} = $${item.total.toFixed(2).padStart(8)}`
    );
  });
  lines.push("-".repeat(50));
  lines.push(`Total: $${invoice.amount.toFixed(2)} ${invoice.currency}`);
  lines.push("=".repeat(50));

  return lines.join("\n");
}

/**
 * Format invoice as JSON
 */
export function formatInvoiceAsJSON(invoice: Invoice): string {
  return JSON.stringify(invoice, null, 2);
}
