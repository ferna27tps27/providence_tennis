"use client";

import { useEffect, useMemo, useState } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import DashboardLayout from "../../../../components/dashboard/DashboardLayout";
import ProtectedRoute from "../../../../lib/auth/protected-route";
import { useAuth } from "../../../../lib/auth/auth-context";
import {
  AdminReservation,
  AdminReservationFilters,
  cancelAdminReservation,
  getAdminReservations,
  getCourts,
  updateAdminReservation,
  Court,
} from "../../../../lib/api/admin-booking-api";
import BookingCalendarGrid from "../../../../components/admin/BookingCalendarGrid";
import AdminAIAssistant from "../../../../components/admin/AdminAIAssistant";

 const formatDate = (dateStr: string) => {
   try {
     return format(new Date(dateStr), "MMM d, yyyy");
   } catch {
     return dateStr;
   }
 };

 const formatTime = (time: string) => {
   try {
     const [hours, minutes] = time.split(":");
     const hour = parseInt(hours);
     const ampm = hour >= 12 ? "PM" : "AM";
     const displayHour = hour % 12 || 12;
     return `${displayHour}:${minutes} ${ampm}`;
   } catch {
     return time;
   }
 };

 export default function AdminBookingsPage() {
   const { token, user } = useAuth();
   const [reservations, setReservations] = useState<AdminReservation[]>([]);
   const [courts, setCourts] = useState<Court[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState("");
   const [filters, setFilters] = useState<AdminReservationFilters>({
     dateFrom: format(new Date(), "yyyy-MM-dd"),
   });
   const [editingReservation, setEditingReservation] =
     useState<AdminReservation | null>(null);
   const [editForm, setEditForm] = useState({
     date: "",
     courtId: "",
     timeStart: "",
     timeEnd: "",
     notes: "",
   });
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
 
  const loadReservations = async (activeToken: string) => {
     setIsLoading(true);
     setError("");
     try {
       const data = await getAdminReservations(activeToken, filters);
       setReservations(data);
     } catch (err: any) {
       setError(err.message || "Failed to load reservations");
     } finally {
       setIsLoading(false);
     }
   };
 
   useEffect(() => {
     if (!token) return;
     loadReservations(token);
   }, [token, filters]);
 
   useEffect(() => {
     if (!token) return;
     getCourts(token)
       .then((data) => setCourts(data))
       .catch(() => setCourts([]));
   }, [token]);
 
   useEffect(() => {
     if (!editingReservation) return;
     setEditForm({
       date: editingReservation.date,
       courtId: editingReservation.courtId,
       timeStart: editingReservation.timeSlot?.start ?? "",
       timeEnd: editingReservation.timeSlot?.end ?? "",
       notes: editingReservation.notes ?? "",
     });
   }, [editingReservation]);
 
   const summary = useMemo(() => {
     const total = reservations.length;
     const confirmed = reservations.filter((r) => r.status === "confirmed").length;
     const cancelled = reservations.filter((r) => r.status === "cancelled").length;
     return { total, confirmed, cancelled };
   }, [reservations]);
 
   const handleCancel = async (id: string) => {
     if (!token) return;
     try {
       setActionLoading(true);
       await cancelAdminReservation(id, token);
       await loadReservations(token);
     } catch (err: any) {
       setError(err.message || "Failed to cancel reservation");
     } finally {
       setActionLoading(false);
     }
   };
 
  const handleSaveEdit = async () => {
    if (!token || !editingReservation) return;
    try {
      setActionLoading(true);
      const updates: any = {};
      if (editForm.date && editForm.date !== editingReservation.date) {
        updates.date = editForm.date;
      }
      if (
        editForm.timeStart &&
        editForm.timeEnd &&
        (editForm.timeStart !== editingReservation.timeSlot?.start ||
          editForm.timeEnd !== editingReservation.timeSlot?.end)
      ) {
        updates.timeSlot = {
          start: editForm.timeStart,
          end: editForm.timeEnd,
        };
      }
      if (editForm.courtId && editForm.courtId !== editingReservation.courtId) {
        updates.courtId = editForm.courtId;
      }
      if ((editForm.notes ?? "") !== (editingReservation.notes ?? "")) {
        updates.notes = editForm.notes;
      }

      if (Object.keys(updates).length === 0) {
        setEditingReservation(null);
        return;
      }

      await updateAdminReservation(editingReservation.id, updates, token);
      setEditingReservation(null);
      await loadReservations(token);
    } catch (err: any) {
      setError(err.message || "Failed to update reservation");
    } finally {
      setActionLoading(false);
    }
  };

  // Handler for calendar drag-and-drop updates
  const handleCalendarUpdate = async (
    id: string,
    updates: {
      date: string;
      courtId: string;
      timeSlot: { start: string; end: string };
    }
  ) => {
    if (!token) throw new Error("Not authenticated");
    await updateAdminReservation(id, updates, token);
    await loadReservations(token);
  };
 
   return (
     <ProtectedRoute allowedRoles={["admin"]}>
       <DashboardLayout>
         <div className="space-y-6">
           <div>
             <h1 className="text-3xl font-bold mb-2">
               <span className="gradient-text">Admin Bookings</span>
             </h1>
             <p className="text-gray-600">
               Review, edit, and manage all court reservations.
             </p>
           </div>
 
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="card">
               <div className="text-sm text-gray-500">Total bookings</div>
               <div className="text-2xl font-bold">{summary.total}</div>
             </div>
             <div className="card">
               <div className="text-sm text-gray-500">Confirmed</div>
               <div className="text-2xl font-bold">{summary.confirmed}</div>
             </div>
             <div className="card">
               <div className="text-sm text-gray-500">Cancelled</div>
               <div className="text-2xl font-bold">{summary.cancelled}</div>
             </div>
           </div>
 
           <div className="card space-y-4">
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
               <div>
                 <label className="text-sm text-gray-600">From</label>
                 <input
                   type="date"
                   value={filters.dateFrom || ""}
                   onChange={(event) =>
                     setFilters((prev) => ({ ...prev, dateFrom: event.target.value || undefined }))
                   }
                   className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                 />
               </div>
               <div>
                 <label className="text-sm text-gray-600">To</label>
                 <input
                   type="date"
                   value={filters.dateTo || ""}
                   onChange={(event) =>
                     setFilters((prev) => ({ ...prev, dateTo: event.target.value || undefined }))
                   }
                   className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                 />
               </div>
               <div>
                 <label className="text-sm text-gray-600">Status</label>
                 <select
                   value={filters.status || ""}
                   onChange={(event) =>
                     setFilters((prev) => ({
                       ...prev,
                       status: (event.target.value as "confirmed" | "cancelled") || undefined,
                     }))
                   }
                   className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                 >
                   <option value="">All</option>
                   <option value="confirmed">Confirmed</option>
                   <option value="cancelled">Cancelled</option>
                 </select>
               </div>
               <div>
                 <label className="text-sm text-gray-600">Court</label>
                 <select
                   value={filters.courtId || ""}
                   onChange={(event) =>
                     setFilters((prev) => ({ ...prev, courtId: event.target.value || undefined }))
                   }
                   className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                 >
                   <option value="">All courts</option>
                   {courts.map((court) => (
                     <option key={court.id} value={court.id}>
                       {court.name}
                     </option>
                   ))}
                 </select>
               </div>
               <div>
                 <label className="text-sm text-gray-600">Search</label>
                 <input
                   type="text"
                   value={filters.search || ""}
                   onChange={(event) =>
                     setFilters((prev) => ({ ...prev, search: event.target.value || undefined }))
                   }
                   placeholder="Member, email, court..."
                   className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                 />
               </div>
             </div>
           </div>
 
          {/* View Toggle */}
          <div className="flex justify-end">
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "table"
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                📋 Table View
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "calendar"
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                📅 Calendar View
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading bookings...</p>
            </div>
          ) : reservations.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-600">No bookings found for these filters.</p>
            </div>
          ) : viewMode === "calendar" ? (
            <BookingCalendarGrid
              reservations={reservations}
              courts={courts}
              onReservationUpdate={handleCalendarUpdate}
              isLoading={isLoading}
            />
          ) : (
            <div className="card overflow-x-auto">
               <table className="min-w-full text-sm">
                 <thead>
                   <tr className="text-left text-gray-500 border-b">
                     <th className="py-3 pr-4">Date</th>
                     <th className="py-3 pr-4">Time</th>
                     <th className="py-3 pr-4">Court</th>
                     <th className="py-3 pr-4">Member / Guest</th>
                     <th className="py-3 pr-4">Status</th>
                     <th className="py-3 pr-4">Payment</th>
                     <th className="py-3">Actions</th>
                   </tr>
                 </thead>
                 <tbody>
                   {reservations.map((reservation) => (
                     <tr key={reservation.id} className="border-b last:border-b-0">
                       <td className="py-3 pr-4">{formatDate(reservation.date)}</td>
                       <td className="py-3 pr-4">
                         {formatTime(reservation.timeSlot?.start)} -{" "}
                         {formatTime(reservation.timeSlot?.end)}
                       </td>
                       <td className="py-3 pr-4">{reservation.courtName}</td>
                       <td className="py-3 pr-4">
                         <div className="font-medium text-gray-900">
                           {reservation.contactName || "Guest"}
                         </div>
                         <div className="text-xs text-gray-500">
                           {reservation.contactEmail || reservation.member?.email || ""}
                         </div>
                       </td>
                       <td className="py-3 pr-4 capitalize">{reservation.status}</td>
                       <td className="py-3 pr-4">
                         {reservation.paymentAmount ? (
                           <div>
                             ${(reservation.paymentAmount / 100).toFixed(2)}
                             {reservation.paymentStatus && (
                               <span className="ml-1 text-xs text-gray-500">
                                 ({reservation.paymentStatus})
                               </span>
                             )}
                           </div>
                         ) : (
                           <span className="text-gray-400">—</span>
                         )}
                       </td>
                       <td className="py-3 space-x-2">
                         <button
                           className="text-primary-600 hover:text-primary-700 font-medium"
                           onClick={() => setEditingReservation(reservation)}
                           disabled={actionLoading}
                         >
                           Edit
                         </button>
                         <button
                           className="text-red-600 hover:text-red-700 font-medium"
                           onClick={() => handleCancel(reservation.id)}
                           disabled={actionLoading || reservation.status === "cancelled"}
                         >
                           Cancel
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
 
           {editingReservation && (
             <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
                 <div className="flex items-center justify-between">
                   <h2 className="text-xl font-bold">Edit Reservation</h2>
                   <button
                     className="text-gray-400 hover:text-gray-600"
                     onClick={() => setEditingReservation(null)}
                   >
                     ✕
                   </button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="text-sm text-gray-600">Date</label>
                     <input
                       type="date"
                       value={editForm.date}
                       onChange={(event) =>
                         setEditForm((prev) => ({ ...prev, date: event.target.value }))
                       }
                       className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                     />
                   </div>
                   <div>
                     <label className="text-sm text-gray-600">Court</label>
                     <select
                       value={editForm.courtId}
                       onChange={(event) =>
                         setEditForm((prev) => ({ ...prev, courtId: event.target.value }))
                       }
                       className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                     >
                       {courts.map((court) => (
                         <option key={court.id} value={court.id}>
                           {court.name}
                         </option>
                       ))}
                     </select>
                   </div>
                   <div>
                     <label className="text-sm text-gray-600">Start</label>
                     <input
                       type="time"
                       value={editForm.timeStart}
                       onChange={(event) =>
                         setEditForm((prev) => ({ ...prev, timeStart: event.target.value }))
                       }
                       className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                     />
                   </div>
                   <div>
                     <label className="text-sm text-gray-600">End</label>
                     <input
                       type="time"
                       value={editForm.timeEnd}
                       onChange={(event) =>
                         setEditForm((prev) => ({ ...prev, timeEnd: event.target.value }))
                       }
                       className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                     />
                   </div>
                 </div>
                 <div>
                   <label className="text-sm text-gray-600">Notes</label>
                   <textarea
                     value={editForm.notes}
                     onChange={(event) =>
                       setEditForm((prev) => ({ ...prev, notes: event.target.value }))
                     }
                     rows={3}
                     className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                   />
                 </div>
                 <div className="flex justify-end gap-3">
                   <button
                     className="btn-secondary"
                     onClick={() => setEditingReservation(null)}
                     disabled={actionLoading}
                   >
                     Close
                   </button>
                   <button
                     className="btn-primary"
                     onClick={handleSaveEdit}
                     disabled={actionLoading}
                   >
                     {actionLoading ? "Saving..." : "Save Changes"}
                   </button>
                 </div>
               </div>
             </div>
          )}
        </div>
      </DashboardLayout>

      {/* AI Assistant - Floating Chat (Admin or Training mode) */}
      {token && <AdminAIAssistant token={token} userRole={user?.role} />}
    </ProtectedRoute>
  );
}
