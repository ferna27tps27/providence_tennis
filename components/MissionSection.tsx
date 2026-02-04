"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function MissionSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const fullText = `At Providence Tennis, our mission is to create a fun and exciting atmosphere where players of all ages and skill levels can enhance their abilities and enjoy the sport of tennis. We offer a range of programs, including adult tennis programs and junior tennis programs, to cater to everyone. Our tennis camps and tennis lessons are designed to provide the highest quality facilities and coaching to our members.`;

  return (
    <section className="section-container bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Our Mission</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-primary-600 to-primary-400 mx-auto"></div>
        </motion.div>

        <motion.div
          className="card bg-gradient-to-br from-primary-50 to-white"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed text-lg">
              {isExpanded ? fullText : `${fullText.substring(0, 150)}...`}
            </p>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-4 text-primary-600 font-semibold hover:text-primary-700 transition-colors flex items-center"
            >
              {isExpanded ? (
                <>
                  Show Less
                  <svg
                    className="w-5 h-5 ml-1"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 15l7-7 7 7" />
                  </svg>
                </>
              ) : (
                <>
                  Show More
                  <svg
                    className="w-5 h-5 ml-1"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}