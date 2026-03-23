import { redirect } from "next/navigation";

export default function LegacyBookingsPage() {
  redirect("/dashboard/bookings");
}
