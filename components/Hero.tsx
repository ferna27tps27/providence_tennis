"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image - Wide-angle tennis courts */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/pt-courts-day.jpeg"
          alt="Providence Tennis outdoor courts"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/70 to-white/90"></div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 z-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          {/* Main Heading */}
          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 text-center leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <span className="gradient-text">WE ARE THE</span>
            <br />
            <span className="text-gray-900">PREMIER TRAINING CENTER</span>
            <br />
            <span className="gradient-text">IN RHODE ISLAND!</span>
          </motion.h1>

          {/* Intro Paragraph - moved below heading */}
          <motion.p
            className="text-lg md:text-xl text-gray-700 mb-10 max-w-4xl leading-relaxed font-medium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Our accredited coaching staff is the most experienced in the area,
            boasting a proud history of developing players in Rhode Island since
            2008! With over 50 years of combined expertise, our proven training
            methods help players of all levels reach their full potential.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <Link href="#programs" className="btn-primary text-lg px-8 py-4 w-full sm:w-auto text-center shadow-xl hover:shadow-2xl hover:-translate-y-1">
              Explore Programs
            </Link>
            <Link href="#contact" className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto text-center hover:-translate-y-1">
              Contact Us
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto w-full"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <div className="card bg-white/90 backdrop-blur-md border border-gray-100">
              <div className="text-4xl font-bold gradient-text mb-2">16+</div>
              <div className="text-gray-700 font-medium">Years of Excellence</div>
            </div>
            <div className="card bg-white/90 backdrop-blur-md border border-gray-100">
              <div className="text-4xl font-bold gradient-text mb-2">50+</div>
              <div className="text-gray-700 font-medium">Years Combined Experience</div>
            </div>
            <div className="card bg-white/90 backdrop-blur-md border border-gray-100">
              <div className="text-4xl font-bold gradient-text mb-2">10</div>
              <div className="text-gray-700 font-medium">Har-Tru Clay Courts</div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-6 h-10 border-2 border-primary-600 rounded-full flex justify-center bg-white/50 backdrop-blur-sm"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-1 h-3 bg-primary-600 rounded-full mt-2"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
