"use client";

import { motion } from "framer-motion";

export default function CountdownTimer() {
  const seasonHighlights = [
    {
      label: "Season court memberships",
      value: "April 1 - October 31",
      detail: "28-week unlimited play options for individuals, students, and families.",
    },
    {
      label: "Day pass",
      value: "$10",
      detail: "Non-season court pass players can still enjoy unlimited court use for the day.",
    },
    {
      label: "Summer camp",
      value: "June 15 - August 21",
      detail: "Full day, half day, drop-in, and unlimited pass options for ages 4-17.",
    },
    {
      label: "Location",
      value: "Roger Williams Park",
      detail: "Providence Tennis Center, 1000 Elmwood Avenue, Providence, RI.",
    },
  ];

  return (
    <section className="section-container bg-gradient-to-br from-primary-600 to-primary-800 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Season 6 at Roger Williams Park is underway.
          </h2>
          <p className="text-xl md:text-2xl mb-12 opacity-90">
            Join us for 2026 unlimited play memberships, day passes, junior
            summer camp, adult groups, tournaments, and pickleball.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            {seasonHighlights.map((item, index) => (
              <motion.div
                key={index}
                className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 text-left"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-sm font-bold uppercase tracking-wider opacity-80">
                  {item.label}
                </div>
                <div className="mt-3 text-2xl font-bold">{item.value}</div>
                <p className="mt-3 text-sm leading-6 opacity-90">{item.detail}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
