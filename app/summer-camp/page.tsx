import type { Metadata } from "next";
import SummerCampPage from "@/components/SummerCampPage";

export const metadata: Metadata = {
  title: "Junior Summer Camp 2026 | Providence Tennis",
  description:
    "A polished summer camp landing page for Providence Tennis with pricing, age groups, daily schedule, and on-site registration.",
  keywords:
    "Providence Tennis, summer camp, junior tennis camp, Rhode Island tennis, local registration",
};

export default function Page() {
  return <SummerCampPage />;
}
