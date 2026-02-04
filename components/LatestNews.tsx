"use client";

import { motion } from "framer-motion";

export default function LatestNews() {
  const news = {
    title: "Winter 2025 ENDS December 23. WINTER BREAK December 24 - January 3. WINTER 2026 STARTS JANUARY 4!",
    content: [
      {
        heading: "Last day of Winter 2025 is Tuesday, December 23",
        details: [
          "4:30 – 6:30 PM: ALL Juniors",
          "6:30 – 8:00 PM: Adults Advanced (NTRP 4.0+)",
        ],
      },
      {
        heading: "December 24 - January 3",
        details: ["Holiday Break – NO Groups or Lessons"],
      },
      {
        heading: "Please note",
        details: [
          "New ownership takes over Tennis RI East Bay on December 29. I'll provide an update regarding Winter 2026 programming once I return home and meet with the new team.",
        ],
      },
      {
        heading: "WINTER SESSION 2 STARTS: Sunday, January 4",
        details: [
          "10:30 AM – 12:00 PM: Future Stars (Under 10)",
          "12:00 – 3:00 PM: Challengers, High School & Champions Academy",
        ],
      },
    ],
  };

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
              IMPORTANT UPDATE
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 leading-tight">
              {news.title}
            </h3>
          </div>

          <div className="space-y-8">
            {news.content.map((item, index) => (
              <motion.div
                key={index}
                className="border-l-4 border-primary-600 pl-6"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <h4 className="text-xl font-bold text-gray-900 mb-3">
                  {item.heading}
                </h4>
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
              We wish everyone a happy and restful Winter Break!
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}