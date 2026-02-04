import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Providence Tennis Academy | Premier Tennis Training in Rhode Island",
  description: "Providence Tennis Academy - Premier training center in Rhode Island. Offering adult tennis programs, junior tennis programs, tennis camps, and tennis lessons since 2008.",
  keywords: "tennis, providence, rhode island, tennis academy, tennis lessons, tennis camps",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}