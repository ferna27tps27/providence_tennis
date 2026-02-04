"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function LoginSection() {
  return (
    <section id="login" className="section-container bg-gradient-to-br from-gray-50 to-primary-50">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="card bg-white text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">LOG IN for more information!</span>
            </h2>
          </motion.div>

          <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            Log into your COURT RESERVE account to make reservations for adult
            tennis programs, junior tennis programs, and tennis camps, and to
            discover the latest events in Providence tennis, including tennis
            lessons!
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link
              href="https://courteserve.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-lg inline-flex items-center"
            >
              LOG IN
              <svg
                className="w-5 h-5 ml-2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}