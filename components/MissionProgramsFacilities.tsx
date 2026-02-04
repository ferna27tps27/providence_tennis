"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Image from "next/image";

export default function MissionProgramsFacilities() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const missionFullText = `At Providence Tennis, our mission is to create a fun and exciting atmosphere where players of all ages and skill levels can enhance their abilities and enjoy the sport of tennis. We offer a range of programs, including adult tennis programs and junior tennis programs, to cater to everyone. Our tennis camps and tennis lessons are designed to provide the highest quality facilities and coaching to our members.`;

  const facilitiesFullText = `Our facilities offer an exceptional experience for all players, featuring 10 outdoor Har-Tru clay courts, seasonal indoor hard courts, and a full pro shop for all your equipment needs and repairs. We maintain our courts to the highest standards, ensuring optimal playing conditions. All outdoor courts come equipped with PLAYSIGHT FREE LIVE STREAMING and WIFI throughout our facilities. Additionally, we provide a variety of adult tennis programs and junior tennis programs, as well as engaging tennis camps and personalized tennis lessons. Excitingly, the Play REPLAY Electric Line Calling System will be joining our facility in March 2026!`;

  const programsText = `We offer a wide range of adult tennis programs and junior tennis programs, including private lessons, group lessons, clinics, and tennis camps. Our experienced coaches use a personalized approach to help each player achieve their goals and reach their full potential in Providence tennis.`;

  const sections = [
    {
      id: "mission",
      title: "Our Mission",
      shortText: missionFullText.substring(0, 150) + "...",
      fullText: missionFullText,
      icon: "🎯",
      image: "/images/pt-tennis-and-ball.jpeg",
      alt: "Tennis ball and racket on court",
    },
    {
      id: "programs",
      title: "Our Programs",
      shortText: programsText,
      fullText: programsText,
      icon: "🎾",
      image: "/images/pt-courts-sunset.jpeg",
      alt: "Tennis courts at sunset",
    },
    {
      id: "facilities",
      title: "Our Facilities",
      shortText: facilitiesFullText.substring(0, 200) + "...",
      fullText: facilitiesFullText,
      icon: "🏟️",
      image: "/images/pt-courts-day.jpeg",
      alt: "Tennis courts during the day",
    },
  ];

  return (
    <section className="section-container bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              className="card bg-gradient-to-br from-primary-50 to-white group overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              {/* Image */}
              <div className="relative w-full h-48 rounded-xl mb-6 overflow-hidden">
                <Image
                  src={section.image}
                  alt={section.alt}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-900/20 to-transparent"></div>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="mr-2 text-3xl">{section.icon}</span>
                {section.title}
              </h3>

              <p className="text-gray-700 leading-relaxed mb-4">
                {expandedSection === section.id
                  ? section.fullText
                  : section.shortText}
              </p>

              {(section.id === "mission" || section.id === "facilities") && (
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === section.id ? null : section.id
                    )
                  }
                  className="text-primary-600 font-semibold hover:text-primary-700 transition-colors flex items-center mt-2"
                >
                  {expandedSection === section.id ? "Show Less" : "Show More"}
                  <svg
                    className={`w-5 h-5 ml-1 transform transition-transform ${
                      expandedSection === section.id ? "rotate-180" : ""
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
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
