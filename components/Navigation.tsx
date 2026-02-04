"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../lib/auth/auth-context";

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "HOME", href: "#home" },
    { 
      name: "JUNIOR TENNIS", 
      href: "#juniors",
      submenu: [
        { name: "Junior Tennis", href: "#juniors" },
        { name: "Summer Camp", href: "#camp" },
        { name: "Tournaments", href: "#tournaments" },
        { name: "2026 Memberships", href: "#memberships" },
      ]
    },
    { 
      name: "ADULT TENNIS", 
      href: "#adults",
      submenu: [
        { name: "Adult Tennis", href: "#adults" },
        { name: "2026 Memberships", href: "#memberships" },
      ]
    },
    { name: "PICKLEBALL", href: "#pickleball" },
    { name: "RESERVATIONS", href: "#reservations", isButton: true },
    { name: "PLAYING OPTIONS", href: "#programs" },
    { name: "LOCATIONS", href: "#locations" },
    { name: "STAFF", href: "#staff" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 shadow-lg backdrop-blur-md py-2"
          : "bg-white/90 backdrop-blur-sm py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Phone */}
          <div className="flex items-center space-x-4 group">
            <Link href="#home" className="flex items-center space-x-4">
              <div className="relative w-16 h-16 flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/images/providence-tennis-logo.webp"
                  alt="Providence Tennis Academy Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl md:text-2xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                Providence Tennis
              </span>
            </Link>
            <a
              href="tel:4019354336"
              className="text-base font-bold text-gray-600 hover:text-accent-600 transition-colors flex items-center gap-1"
            >
              <span>📞</span> 401-935-4336
            </a>
          </div>

          {/* Social Media Links */}
          <div className="hidden xl:flex items-center space-x-2 mr-4 border-r border-gray-200 pr-4">
            <a
              href="https://www.facebook.com/473426899381264"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-[#1877F2] transition-colors p-2 rounded-full hover:bg-blue-50"
              aria-label="Facebook"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/providencetennis"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-[#E4405F] transition-colors p-2 rounded-full hover:bg-pink-50"
              aria-label="Instagram"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <div key={link.name} className="relative group">
                <Link
                  href={link.name === "RESERVATIONS" && isAuthenticated ? "/dashboard/book" : link.href}
                  className={`
                    px-3 py-2 text-sm font-bold transition-all duration-200 relative uppercase tracking-wide flex items-center
                    ${link.isButton 
                      ? "bg-primary-600 text-white rounded-md hover:bg-primary-700 hover:shadow-md transform hover:-translate-y-0.5 ml-2" 
                      : "text-gray-700 hover:text-primary-600"
                    }
                  `}
                >
                  {link.name}
                  {link.submenu && (
                    <span className="ml-1 text-xs">▼</span>
                  )}
                </Link>
                {link.submenu && (
                  <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 border-t-4 border-primary-600">
                    <div className="py-2">
                      {link.submenu.map((sub) => (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          className="block px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors font-medium border-b border-gray-50 last:border-0"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Auth Buttons */}
            {isAuthenticated ? (
              <div className="relative group ml-2">
                <button className="px-3 py-2 text-sm font-bold text-gray-700 hover:text-primary-600 transition-colors uppercase tracking-wide flex items-center">
                  {user?.firstName || "Account"} ▼
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 border-t-4 border-primary-600">
                  <div className="py-2">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors font-medium border-b border-gray-50"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors font-medium"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href="/signin"
                className="px-3 py-2 text-sm font-bold text-gray-700 hover:text-primary-600 transition-colors uppercase tracking-wide ml-2"
              >
                SIGN IN
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200 animate-slide-up h-[calc(100vh-80px)] overflow-y-auto">
            {/* Social Links in Mobile */}
            <div className="flex items-center justify-center space-x-6 pb-6 mb-6 border-b border-gray-100">
              <a
                href="https://www.facebook.com/473426899381264"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#1877F2] transition-colors p-3 rounded-full bg-gray-50"
                aria-label="Facebook"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/providencetennis"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#E4405F] transition-colors p-3 rounded-full bg-gray-50"
                aria-label="Instagram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
            {navLinks.map((link) => (
              <div key={link.name} className="border-b border-gray-100 last:border-0">
                <Link
                  href={link.name === "RESERVATIONS" && isAuthenticated ? "/dashboard/book" : link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-6 py-4 text-base font-bold transition-colors ${
                    link.isButton ? "text-primary-600 bg-primary-50" : "text-gray-800 hover:text-primary-600"
                  }`}
                >
                  {link.name}
                </Link>
                {link.submenu && (
                  <div className="bg-gray-50 py-2">
                    {link.submenu.map((sub) => (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-8 py-3 text-sm text-gray-600 hover:text-primary-600 transition-colors font-medium flex items-center"
                      >
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3"></span>
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {/* Mobile Auth Buttons */}
            {isAuthenticated ? (
              <>
                <div className="border-b border-gray-100">
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-6 py-4 text-base font-bold text-gray-800 hover:text-primary-600 transition-colors"
                  >
                    Dashboard
                  </Link>
                </div>
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-6 py-4 text-base font-bold text-gray-800 hover:text-primary-600 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="border-b border-gray-100">
                <Link
                  href="/signin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-6 py-4 text-base font-bold text-gray-800 hover:text-primary-600 transition-colors"
                >
                  SIGN IN
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
