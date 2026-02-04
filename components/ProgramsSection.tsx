"use client";

import { motion } from "framer-motion";

export default function ProgramsSection() {
  const programs = [
    {
      title: "Private Lessons",
      description:
        "One-on-one coaching tailored to your specific needs and goals",
      icon: "👤",
    },
    {
      title: "Group Lessons",
      description:
        "Learn and improve alongside players at your skill level",
      icon: "👥",
    },
    {
      title: "Clinics",
      description:
        "Structured training sessions focused on specific skills and techniques",
      icon: "🎯",
    },
    {
      title: "Tennis Camps",
      description:
        "Intensive training experiences for juniors during summer and breaks",
      icon: "🏕️",
    },
  ];

  return (
    <section id="programs" className="section-container bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Our Programs</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-primary-600 to-primary-400 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We offer a wide range of adult tennis programs and junior tennis
            programs, including private lessons, group lessons, clinics, and
            tennis camps. Our experienced coaches use a personalized approach to
            help each player achieve their goals and reach their full potential
            in Providence tennis.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {programs.map((program, index) => (
            <motion.div
              key={index}
              className="card bg-gradient-to-br from-primary-50 to-white group cursor-pointer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                {program.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {program.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {program.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}