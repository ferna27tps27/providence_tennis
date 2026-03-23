import { redirect } from "next/navigation";

export default function LegacyJournalPage() {
  redirect("/dashboard/journal");
}
