"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import SummerCampRegistrationForm from "@/components/SummerCampRegistrationForm";

const quickFacts = [
  { label: "Dates", value: "June 15 - August 21" },
  { label: "Ages", value: "4-17 overall" },
  { label: "Location", value: "Roger Williams Park" },
  { label: "Registration", value: "On-site signup" },
];

const programCards = [
  {
    title: "Full Day Tennis Camp",
    ageRange: "Ages 5-17",
    schedule: "Monday-Friday, 8:30am-5:00pm",
    badge: "Most Popular",
    accent: "from-primary-600 to-emerald-600",
    summary:
      "Built for players who want the full development day with a balanced mix of training, movement, and point play.",
    rates: [
      "Full week: $300",
      "Full week + one-hour private lesson: $360",
      "Drop-in: $80/day",
      "Unlimited 12-week pass: $2200",
      "Pass + 10-pack private lessons: $2500",
    ],
  },
  {
    title: "Half Day Tennis Camp",
    ageRange: "Ages 5-17",
    schedule: "AM 8:30-11:30am or PM 1:30-5:00pm",
    badge: "Flexible",
    accent: "from-accent-600 to-primary-600",
    summary:
      "A lighter commitment for families who want either a morning or afternoon training block with the same coaching quality.",
    rates: [
      "Full week: $200",
      "Full week + one-hour private lesson: $260",
      "Drop-in: $60/day",
      "Unlimited 12-week pass: $1600",
      "Pass + 10-pack private lessons: $1900",
    ],
  },
  {
    title: "Future Stars Under 12 Sports Camp",
    ageRange: "Ages under 12",
    schedule: "Full day, 8:30am-5:00pm",
    badge: "Multi-sport",
    accent: "from-amber-500 to-primary-600",
    summary:
      "A younger-player option that blends tennis with other athletic activities to keep the day active and varied.",
    rates: [
      "Tennis, pickleball, basketball, and soccer",
      "Golf added in 2026",
      "Registration handled directly on this site",
    ],
  },
];

const overviewPoints = [
  "Players are grouped by level and age so the camp stays competitive without losing the developmental focus.",
  "Professional instruction is led by the Providence Tennis coaching team and supported by top coaches in Rhode Island and the USTA New England Section.",
  "Lunch is not provided, but coaching staff stay on site during the lunch break and can escort players or receive delivered lunch.",
  "Participation is intentionally limited per session, so the registration flow should make the deposit and availability status obvious.",
];

const scheduleBlocks = [
  {
    title: "Morning Tennis Camp",
    subtitle: "8:30am - 11:30am",
    items: [
      "8:00 - 8:30am: Check in",
      "8:30 - 8:40am: Dynamic warm up on court",
      "8:45 - 11:20am: Athletic development, technical drills, theme of the day, and serving points",
      "11:20 - 11:30am: Cool down",
      "11:30am - 1:30pm: Lunch break with coaching staff on site",
    ],
  },
  {
    title: "Afternoon Tennis Camp",
    subtitle: "1:30pm - 5:00pm",
    items: [
      "1:00 - 1:30pm: Check in",
      "1:30 - 1:40pm: Dynamic warm up on court",
      "1:45 - 4:45pm: Technical drilling, footwork, live point play, match play, serving points, and yoga/fitness",
      "4:45 - 5:00pm: Depart or extend day if needed",
    ],
  },
];

const sectionNav = [
  { label: "Overview", href: "#overview" },
  { label: "Programs", href: "#programs" },
  { label: "Pricing", href: "#pricing" },
  { label: "Schedule", href: "#schedule" },
  { label: "Register", href: "#register" },
];

export default function SummerCampPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-accent-50 text-gray-900">
      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-gray-200">
                <Image
                  src="/images/providence-tennis-logo.webp"
                  alt="Providence Tennis Academy"
                  fill
                  className="object-contain p-1"
                  priority
                />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-600">
                  Providence Tennis
                </p>
                <h1 className="text-lg font-bold text-gray-900">
                  Junior Summer Camp 2026
                </h1>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="tel:4019354336"
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-primary-200 hover:text-primary-700"
              >
                401-935-4336
              </a>
              <Link href="#register" className="btn-primary inline-flex items-center">
                Register on Site
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/pt-courts-sunset.jpeg"
            alt="Providence Tennis courts at sunset"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/30" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(13,148,136,0.14),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(163,230,53,0.18),_transparent_34%)]" />
        </div>

        <div className="section-container relative z-10 pt-16 lg:pt-24">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="max-w-3xl"
            >
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-primary-700">
                Junior Tennis
              </p>
              <h2 className="text-4xl font-black tracking-tight leading-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
                Summer camp built for players, parents, and a smoother on-site signup.
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-7 text-gray-700 sm:text-lg md:text-xl md:leading-8">
                This page keeps the business logic from the camp flow: dates,
                age bands, price tiers, daily training blocks, and a direct
                path to register on this website. The layout is cleaner,
                easier to scan, and more useful on mobile.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#register"
                  className="btn-primary inline-flex w-full items-center justify-center sm:w-auto"
                >
                  Start Registration
                </Link>
                <Link
                  href="#programs"
                  className="btn-secondary inline-flex w-full items-center justify-center sm:w-auto"
                >
                  Explore Programs
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                {quickFacts.map((fact) => (
                  <div
                    key={fact.label}
                    className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-lg backdrop-blur"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">
                      {fact.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {fact.value}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="card border border-white/80 bg-white/95 shadow-2xl"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-700">
                    Camp at a Glance
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-gray-900">
                    Fast answers before you register
                  </h3>
                </div>
                <div className="rounded-full bg-accent-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-accent-700">
                  Limited spots
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {overviewPoints.map((point, index) => (
                  <div key={index} className="flex gap-3 rounded-2xl bg-gray-50 p-4">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-gray-700">{point}</p>
                  </div>
                ))}
              </div>
            </motion.aside>
          </div>
        </div>
      </section>

      <div className="z-40 border-y border-gray-200 bg-white/85 backdrop-blur-md lg:sticky lg:top-[88px]">
        <div className="section-container py-4">
          <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
            {sectionNav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-primary-200 hover:text-primary-700"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <section id="overview" className="section-container scroll-mt-32">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="card"
          >
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-700">
              Overview
            </p>
            <h3 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">
              The camp page should answer the decision-making questions first.
            </h3>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              The current production page is strong on content but hard to scan.
              This version keeps the same business rules while organizing the
              experience around what families actually need: who it is for, how
              much it costs, when it runs, and where to register.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-primary-50 p-5">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary-700">
                  Location
                </p>
                <p className="mt-2 text-base font-semibold text-gray-900">
                  Providence Tennis Center at Roger Williams Park
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  1000 Elmwood Avenue, Providence, Rhode Island 02907
                </p>
              </div>
              <div className="rounded-2xl bg-accent-50 p-5">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent-700">
                  Registration
                </p>
                <p className="mt-2 text-base font-semibold text-gray-900">
                  Registration submitted directly through this website
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Limited participation per session, so the signup flow keeps
                  the availability details obvious.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="card bg-gradient-to-br from-white to-primary-50"
          >
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-700">
              Decision Drivers
            </p>
            <div className="mt-5 space-y-4">
              {[
                "Open to players of all skill levels, ages 4-17.",
                "Players are encouraged to also join USTA summer junior tournaments, ladder matches, and junior team tennis summer matches on Wednesday afternoons.",
                "Rain day policy is currently listed as TBA, so this should be easy to update without redesigning the page.",
                "One page should cover tennis camp, future stars, and the schedule without sending families through multiple dead ends.",
              ].map((item, index) => (
                <div key={index} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-primary-600" />
                  <p className="text-sm leading-6 text-gray-700">{item}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section id="programs" className="section-container scroll-mt-32 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-700">
            Programs
          </p>
          <h3 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">
            The core camp offerings, organized for quick comparison.
          </h3>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            The page should surface the age split and daily commitment without
            hiding the cost structure. That is the real decision logic behind
            the camp listing.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {programCards.map((program, index) => (
            <motion.article
              key={program.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: index * 0.08 }}
              whileHover={{ y: -6 }}
              className="overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 shadow-lg"
            >
              <div className={`h-2 bg-gradient-to-r ${program.accent}`} />
              <div className="p-6 lg:p-8">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.26em] text-gray-500">
                      {program.badge}
                    </p>
                    <h4 className="mt-2 text-2xl font-bold text-gray-900">
                      {program.title}
                    </h4>
                  </div>
                  <div className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary-700">
                    {program.ageRange}
                  </div>
                </div>

                <p className="mt-4 text-base leading-7 text-gray-700">
                  {program.summary}
                </p>

                <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-gray-200">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">
                    Schedule
                  </p>
                  <p className="mt-2 text-base font-semibold text-gray-900">
                    {program.schedule}
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {program.rates.map((rate) => (
                    <div
                      key={rate}
                      className="rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700"
                    >
                      {rate}
                    </div>
                  ))}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="pricing" className="section-container scroll-mt-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-700">
            Pricing
          </p>
          <h3 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">
            Present the rates like a comparison, not a wall of text.
          </h3>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="card border border-gray-200"
          >
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-700">
              Full Day
            </p>
            <h4 className="mt-3 text-2xl font-bold text-gray-900">
              Higher training volume, all-day coverage
            </h4>
            <div className="mt-5 space-y-3">
              {programCards[0].rates.map((rate) => (
                <div
                  key={rate}
                  className="rounded-2xl bg-primary-50 px-4 py-3 text-sm leading-6 text-gray-800"
                >
                  {rate}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="card border border-gray-200"
          >
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-700">
              Half Day
            </p>
            <h4 className="mt-3 text-2xl font-bold text-gray-900">
              More flexible for families with shorter days
            </h4>
            <div className="mt-5 space-y-3">
              {programCards[1].rates.map((rate) => (
                <div
                  key={rate}
                  className="rounded-2xl bg-accent-50 px-4 py-3 text-sm leading-6 text-gray-800"
                >
                  {rate}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-gray-500">
                Registration note
              </p>
              <p className="mt-2 text-base leading-7 text-gray-700">
                Future Stars Under 12 Sports Camp is a full-day program. If the
                exact package you need changes later, the page should still keep
                the on-site signup path obvious.
              </p>
            </div>
            <Link
              href="#register"
              className="btn-secondary inline-flex items-center justify-center"
            >
              Start Registration
            </Link>
          </div>
        </motion.div>
      </section>

      <section id="schedule" className="section-container scroll-mt-32 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-700">
            Daily Schedule
          </p>
          <h3 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">
            Put the training day on the page instead of burying it in the listing.
          </h3>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="grid gap-6">
            {scheduleBlocks.map((block, index) => (
              <motion.div
                key={block.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
                className="card"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-700">
                      {block.subtitle}
                    </p>
                    <h4 className="mt-2 text-2xl font-bold text-gray-900">
                      {block.title}
                    </h4>
                  </div>
                  <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-gray-600">
                    On site coaching
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {block.items.map((item) => (
                    <div key={item} className="flex gap-4">
                      <div className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-primary-600" />
                      <p className="text-sm leading-7 text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.aside
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="card border border-gray-200 bg-gradient-to-br from-primary-50 to-white"
          >
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-700">
              Future Stars
            </p>
            <h4 className="mt-3 text-2xl font-bold text-gray-900">
              A multi-sport option for younger athletes
            </h4>
            <p className="mt-4 text-base leading-7 text-gray-700">
              The current listing describes tennis, pickleball, basketball, and
              soccer, with golf being added in 2026. This page should keep that
              flexibility visible while still making the core camp choice easy
              to understand.
            </p>

            <div className="mt-6 space-y-3">
              {[
                "Full-day schedule: 8:30am-5:00pm",
                "Rotating activities keep younger players moving",
                "A good fit for families looking for variety rather than tennis-only training",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl bg-white p-4 text-sm leading-6 text-gray-700 shadow-sm ring-1 ring-gray-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </motion.aside>
        </div>
      </section>

      <section id="register" className="section-container scroll-mt-32">
        <SummerCampRegistrationForm />
      </section>

      <footer className="bg-gray-900 text-gray-300">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-400">
                Providence Tennis
              </p>
              <h4 className="mt-3 text-2xl font-bold text-white">
                Junior Summer Camp 2026
              </h4>
              <p className="mt-4 max-w-xl text-sm leading-7 text-gray-400">
                A clearer, more visually appealing landing page that keeps the
                same camp logic while giving families a better registration
                experience.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Quick Links</p>
              <div className="mt-4 flex flex-col gap-3 text-sm">
                <Link href="/" className="transition-colors hover:text-primary-400">
                  Home
                </Link>
                <Link
                  href="/summer-camp"
                  className="transition-colors hover:text-primary-400"
                >
                  Summer Camp
                </Link>
                <Link
                  href="#register"
                  className="transition-colors hover:text-primary-400"
                >
                  Register
                </Link>
                <Link
                  href="/signin"
                  className="transition-colors hover:text-primary-400"
                >
                  Sign In
                </Link>
                <Link
                  href="/dashboard/book"
                  className="transition-colors hover:text-primary-400"
                >
                  Book a Court
                </Link>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Contact</p>
              <div className="mt-4 space-y-3 text-sm">
                <a
                  href="tel:4019354336"
                  className="block transition-colors hover:text-primary-400"
                >
                  401-935-4336
                </a>
                <a href="#register" className="block transition-colors hover:text-primary-400">
                  Summer camp registration
                </a>
                <p className="text-gray-500">1000 Elmwood Avenue, Providence, RI</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
