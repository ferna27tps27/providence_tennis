"use client";

import Link from "next/link";

export default function Footer() {
  const footerLinks = {
    "Junior Tennis": [
      { name: "Junior Tennis", href: "#juniors" },
      { name: "Summer Camp", href: "#camp" },
      { name: "Tournaments", href: "#tournaments" },
      { name: "2026 Memberships", href: "#memberships" },
    ],
    "Adult Tennis": [
      { name: "Adult Tennis", href: "#adults" },
      { name: "2026 Memberships", href: "#memberships" },
    ],
    "Resources": [
      { name: "Playing Options", href: "#programs" },
      { name: "Locations", href: "#locations" },
      { name: "Staff", href: "#staff" },
      { name: "Sign In", href: "#login" },
    ],
  };

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <h3 className="text-2xl font-bold text-white mb-4">
              Providence Tennis Academy
            </h3>
            <p className="text-sm leading-relaxed mb-4">
              Premier training center in Rhode Island since 2008. Developing
              athletes through discipline, passion, and expert coaching.
            </p>
            <div className="text-primary-400 font-semibold">
              <a href="tel:401-935-4336" className="hover:text-primary-300 transition-colors">
                401-935-4336
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-primary-400 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>


        {/* Quick Links */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="flex flex-wrap gap-6 justify-center md:justify-start">
            <Link
              href="#programs"
              className="text-sm hover:text-primary-400 transition-colors"
            >
              PLAYING OPTIONS
            </Link>
            <Link
              href="#locations"
              className="text-sm hover:text-primary-400 transition-colors"
            >
              LOCATIONS
            </Link>
            <Link
              href="#staff"
              className="text-sm hover:text-primary-400 transition-colors"
            >
              STAFF
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-400 mb-4 md:mb-0">
            Copyright © {new Date().getFullYear()} Providence Tennis - All
            Rights Reserved.
          </p>
          <p className="text-sm text-gray-500">
            Powered by{" "}
            <span className="text-primary-400 font-semibold">Next.js</span>
          </p>
        </div>
      </div>
    </footer>
  );
}