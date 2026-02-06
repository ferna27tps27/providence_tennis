"use client";

import { useDraggable } from "@dnd-kit/core";
import { AdminReservation } from "../../lib/api/admin-booking-api";

interface DraggableBookingBlockProps {
  reservation: AdminReservation;
  courtColor: string;
}

export default function DraggableBookingBlock({
  reservation,
  courtColor,
}: DraggableBookingBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: reservation.id,
    data: {
      reservation,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-2 rounded border-2 mb-1 text-xs cursor-move transition-all ${courtColor} ${
        isDragging ? "opacity-50 shadow-lg scale-105" : "hover:shadow-md"
      }`}
    >
      {/* Court Name */}
      <div className="font-semibold flex items-center gap-1">
        <span className="text-[10px]">🏟️</span>
        {reservation.courtName}
      </div>

      {/* Contact Name */}
      <div className="truncate font-medium">
        {reservation.contactName || reservation.guestName || "Guest"}
      </div>

      {/* Time Range */}
      <div className="text-[10px] mt-1 opacity-75">
        {reservation.timeSlot.start} - {reservation.timeSlot.end}
      </div>

      {/* Payment Status (if exists) */}
      {reservation.paymentStatus && (
        <div className="text-[10px] mt-1">
          {reservation.paymentStatus === "paid" && (
            <span className="text-green-700">✓ Paid</span>
          )}
          {reservation.paymentStatus === "pending" && (
            <span className="text-yellow-700">⏱ Pending</span>
          )}
          {reservation.paymentStatus === "refunded" && (
            <span className="text-primary-700">↩ Refunded</span>
          )}
        </div>
      )}

      {/* Drag Hint */}
      {!isDragging && (
        <div className="text-[9px] mt-1 opacity-50 italic">
          Drag to move
        </div>
      )}
    </div>
  );
}
