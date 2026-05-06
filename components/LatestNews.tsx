"use client";

import { motion } from "framer-motion";

export default function LatestNews() {
  const updates = [
    {
      heading: "Spring 2026 programming",
      badge: "Coming soon",
      details: [
        "CourtReserve is the best place to see current groups, court sheets, events, and schedule changes.",
        "Junior, adult, camp, tournament, and membership information is now available for the 2026 season.",
      ],
    },
    {
      heading: "Junior Summer Camp 2026",
      badge: "June 15 - August 21",
      details: [
        "Open to players of all skill levels, ages 4-17.",
        "Full day, half day, drop-in, and unlimited pass options are available.",
      ],
    },
    {
      heading: "2026 unlimited play memberships",
      badge: "April 1 - October 31",
      details: [
        "Season court memberships include unlimited court time, free ball machine use, program discounts, event discounts, and pro shop discounts.",
        "A membership is not required to play. Day passes are available for $10 per player.",
      ],
    },
  ];

  return (
    <section className="section-container bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
            <span className="gradient-text">LATEST NEWS</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-primary-600 to-primary-400 mx-auto mb-12"></div>
        </motion.div>

        <motion.div
          className="card bg-white"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="mb-6">
            <div className="inline-block bg-primary-100 text-primary-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              2026 SEASON UPDATE
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 leading-tight">
              Memberships, summer camps, and group information are now available.
            </h3>
          </div>

          <div className="space-y-8">
            {updates.map((item, index) => (
              <motion.div
                key={index}
                className="border-l-4 border-primary-600 pl-6"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-xl font-bold text-gray-900">
                    {item.heading}
                  </h4>
                  <span className="w-fit rounded-full bg-accent-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-800">
                    {item.badge}
                  </span>
                </div>
                <ul className="space-y-2">
                  {item.details.map((detail, idx) => (
                    <li
                      key={idx}
                      className="text-gray-700 leading-relaxed flex items-start"
                    >
                      <span className="text-primary-600 mr-2 mt-1">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-8 pt-8 border-t border-gray-200 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <p className="text-lg text-gray-600 italic">
              Register, reserve courts, and check the latest events through CourtReserve.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
