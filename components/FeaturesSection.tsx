"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function FeaturesSection() {
  const features = [
    {
      title: "SMART COURTS with ELECTRIC LINE CALLING COMING SOON!",
      subtitle: "Coming March 2026",
      description:
        "PlayReplay is the market-leading all-in-one smart court system, offering unmatched real-time tracking of every ball and player, with performance data, an integrated court and mobile app, and tournament tools.",
      cta: "Find out more about PLAY REPLAY",
      href: "#",
      gradient: "from-purple-600 to-indigo-600",
      icon: "⚡",
    },
    {
      title: "LIVE STREAMING on ALL 10 COURTS!",
      subtitle: "We are a PLAY SIGHT Organization!",
      description:
        "Watch your matches live or review them later. All outdoor courts are equipped with PlaySight technology for free live streaming.",
      cta: "PLAY SIGHT LOG IN",
      href: "#",
      gradient: "from-green-600 to-teal-600",
      icon: "📹",
    },
  ];

  return (
    <section className="section-container bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${feature.gradient} text-white p-8 md:p-12`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ scale: 1.02 }}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
              </div>

              <div className="relative z-10">
                {feature.subtitle && (
                  <div className="inline-block bg-white/20 backdrop-blur-sm text-sm font-semibold px-4 py-1 rounded-full mb-4">
                    {feature.subtitle}
                  </div>
                )}
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  {feature.title}
                </h3>
                <p className="text-lg opacity-90 mb-6 leading-relaxed">
                  {feature.description}
                </p>
                <Link
                  href={feature.href}
                  className="inline-flex items-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  {feature.cta}
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
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}