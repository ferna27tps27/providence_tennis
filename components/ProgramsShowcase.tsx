"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export default function ProgramsShowcase() {
  const programs = [
    {
      id: "juniors",
      title: "JUNIORS TENNIS",
      description: "Comprehensive junior tennis programs for all skill levels",
      gradient: "from-green-500 to-emerald-600",
      href: "#juniors",
      image: "/images/pt-courts-day.jpeg",
      alt: "Young boy playing tennis, focused on hitting the ball",
    },
    {
      id: "adults",
      title: "ADULT TENNIS",
      description: "Adult programs designed for competitive and recreational players",
      gradient: "from-blue-500 to-indigo-600",
      href: "#adults",
      image: "/images/pt-courts-day.jpeg",
      alt: "Two women enjoying a game of tennis outdoors",
    },
    {
      id: "competition",
      title: "COMPETITION",
      description: "Tournaments and competitive play opportunities",
      gradient: "from-purple-500 to-pink-600",
      href: "#tournaments",
      image: "/images/pt-courts-day.jpeg",
      alt: "Competitive tennis match",
    },
  ];

  return (
    <section className="section-container bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">
              CHECK OUT OUR PROGRAMS and EVENTS
            </span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-primary-600 to-primary-400 mx-auto"></div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {programs.map((program, index) => (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
            >
              <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${program.gradient} text-white min-h-[400px] group`}>
                <Link
                  href={program.href}
                  className="absolute inset-0 z-20"
                  aria-label={program.title}
                >
                  <span className="sr-only">{program.title}</span>
                </Link>
                
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                  <Image
                    src={program.image}
                    alt={program.alt}
                    fill
                    className="object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-300"
                  />
                </div>
                
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${program.gradient} opacity-80 group-hover:opacity-90 transition-opacity duration-300`}></div>

                {/* Content */}
                <div className="relative z-10 p-8 md:p-12 h-full flex flex-col justify-between min-h-[400px]">
                  <div>
                    <h3 className="text-3xl md:text-4xl font-bold mb-4">
                      {program.title}
                    </h3>
                    <p className="text-lg opacity-90 leading-relaxed">
                      {program.description}
                    </p>
                  </div>
                  <div className="mt-8 flex items-center text-lg font-semibold group-hover:translate-x-2 transition-transform">
                    Learn More
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
                  </div>
                </div>
                
                {/* Decorative Pattern */}
                <div className="absolute inset-0 opacity-10 z-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}></div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
