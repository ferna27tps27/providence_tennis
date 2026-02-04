"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/auth/auth-context";
import { motion } from "framer-motion";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const baseNavItems = [
    { name: "Overview", href: "/dashboard", icon: "📊" },
    { name: "Book a Court", href: "/dashboard/book", icon: "🎾" },
    { name: "Profile", href: "/dashboard/profile", icon: "👤" },
    { name: "Bookings", href: "/dashboard/bookings", icon: "📅" },
    { name: "Payments", href: "/dashboard/payments", icon: "💳" },
    { name: "Journal", href: "/dashboard/journal", icon: "📝" },
  ];
  const navItems =
    user?.role === "admin"
      ? [
          ...baseNavItems,
          { name: "Admin Bookings", href: "/dashboard/admin/bookings", icon: "🛠️" },
        ]
      : baseNavItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-xl font-bold text-primary-600">
                Providence Tennis
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {user?.firstName} {user?.lastName}
              </div>
              <button
                onClick={logout}
                className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm p-4">
              <ul className="space-y-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`
                          flex items-center space-x-3 px-4 py-3 rounded-lg transition-all
                          ${
                            isActive
                              ? "bg-primary-600 text-white font-semibold"
                              : "text-gray-700 hover:bg-primary-50 hover:text-primary-600"
                          }
                        `}
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Quick Stats Card */}
            <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Account Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Email Verified</span>
                  <span
                    className={`font-semibold ${
                      user?.emailVerified ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {user?.emailVerified ? "✓" : "✗"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Role</span>
                  <span className="font-semibold text-primary-600 capitalize">
                    {user?.role || "player"}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}
