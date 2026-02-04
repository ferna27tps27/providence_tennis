"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function FacilitiesSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  const fullText = `Our facilities offer an exceptional experience for all players, featuring 10 outdoor Har-Tru clay courts, seasonal indoor hard courts, and a full pro shop for all your equipment needs and repairs. We maintain our courts to the highest standards, ensuring optimal playing conditions. All outdoor courts come equipped with PLAYSIGHT FREE LIVE STREAMING and WIFI throughout our facilities. Additionally, we provide a variety of adult tennis programs and junior tennis programs, as well as engaging tennis camps and personalized tennis lessons. Excitingly, the Play REPLAY Electric Line Calling System will be joining our facility in March 2026!`;

  const facilities = [
    {
      icon: "🎾",
      title: "10 Outdoor Har-Tru Clay Courts",
      description: "Premium clay surface for the ultimate playing experience",
    },
    {
      icon: "🏠",
      title: "Seasonal Indoor Hard Courts",
      description: "Year-round play regardless of weather conditions",
    },
    {
      icon: "🛒",
      title: "Full Pro Shop",
      description: "Equipment, repairs, and expert advice",
    },
    {
      icon: "📹",
      title: "PlaySight Live Streaming",
      description: "FREE live streaming on all 10 outdoor courts",
    },
    {
      icon: "📶",
      title: "WIFI Throughout",
      description: "Stay connected while you play",
    },
    {
      icon: "⚡",
      title: "Electric Line Calling",
      description: "Coming March 2026 - Smart court technology",
    },
  ];

  return (
    <section id="facilities" className="section-container bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Our Facilities</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-primary-600 to-primary-400 mx-auto mb-8"></div>
          <motion.div
            className="card bg-white max-w-4xl mx-auto mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className="text-gray-700 leading-relaxed text-lg">
              {isExpanded ? fullText : `${fullText.substring(0, 200)}...`}
            </p>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-4 text-primary-600 font-semibold hover:text-primary-700 transition-colors flex items-center"
            >
              {isExpanded ? "Show Less" : "Show More"}
              <svg
                className={`w-5 h-5 ml-1 transform transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((facility, index) => (
            <motion.div
              key={index}
              className="card bg-white text-center group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                {facility.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {facility.title}
              </h3>
              <p className="text-gray-600">{facility.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}