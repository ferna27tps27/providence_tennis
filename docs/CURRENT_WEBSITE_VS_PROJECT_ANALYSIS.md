# Providence Tennis: Current Website vs. Project — Technical Analysis

This document compares the **live Providence Tennis Academy website** (https://providencetennis.com/) with the **providence_tennis project** you have built. It is page-by-page for the current site, then a summary of project capabilities, and finally a detailed technical differentiators section.

---

## Part 1: Current Website (providencetennis.com) — Page-by-Page Analysis

### 1.1 Technology & Platform

- **Platform:** The live site is built with **Wix** (or a Wix-style builder). Evidence includes typical Wix patterns: image CDN (e.g. img1.wsimg.com), fixed header with hamburger nav, overlay mobile menu, and “Powered by” footer.
- **Architecture:** Classic CMS/builder: server-rendered or client-hydrated pages, multi-page site with distinct URLs per section. No custom backend; third-party integrations for forms, maps, and reservations.
- **Hosting:** Presumed Wix hosting (same origin for all pages, no custom server).

### 1.2 Homepage (`/`)

**Layout & structure**

- **Top announcement bar:** Full-width dark grey bar, white text: “2026 memberships, summer camps, and group information are now available” (clickable, likely to a membership/announcement page).
- **Header:** White background; centered circular “Providence Tennis” logo (blue/teal ring, green “P”/shield); left: hamburger icon; right: phone “401-935-4336” (tel: link).
- **Hero:** Large full-width image of outdoor tennis courts (blue sky, green/light courts, nets, fencing, trees, light poles). No in-page headline overlay in the snapshot; tagline “We are THE premier training center in Rhode Island!” appears in content below.
- **Content flow (single long page):**
  - **LATEST NEWS:** “UPDATE REGARDING Winter 2026 programming” — “COMING SOON.”
  - **Mission / Programs / Facilities:** Three blocks (Our Mission, Our Programs, Our Facilities) with “Show More” / “Show Less” to expand/collapse text.
  - **Countdown:** “Season 6 at ROGER WILLIAMS PARK IS almost here!” with countdown (Days, Hrs, Mins, Secs).
  - **Programs/events:** “CHECK OUT OUR PROGRAMS and EVENTS” with links: JUNIORS TENNIS, ADULT TENNIS, COMPETITION.
  - **LOG IN:** “LOG IN for more information!” — copy explains Court Reserve for reservations and events; CTA “LOG IN” (external link, likely to Court Reserve).
  - **PlayReplay:** “COMING March 2026” — “SMART COURTS with ELECTRIC LINE CALLING COMING SOON!” (PlayReplay); “Find out more about PLAY REPLAY” link.
  - **PlaySight:** “We are a PLAY SIGHT Organization!” — “LIVE STREAMING on ALL 10 COURTS!”; “PLAY SIGHT LOG IN” link.
  - **Subscribe:** Email input + “Sign up.”
  - **Contact:** “Contact Us” — “Drop us a line!” (Name, Email*, Message, Send); reCAPTCHA note; “Better yet, see us in person!”; address “1000 Elmwood Avenue, Providence, RI, USA”; phone 401-935-4336; “Hours” with “Open today” and “08:00 am – 06:00 pm” (or 09:00 pm in another snapshot — possible Wix hours widget).
- **Footer:** “Copyright © 2026 Providence Tennis - All Rights Reserved.”; “Powered by” (builder branding); single link “JUNIOR TENNIS.”
- **Cookie banner:** “This website uses cookies” with “Accept.”
- **TrustedSite:** “TrustedSite Certified” badge (bottom).

**Technical notes**

- Navigation is anchor-like or multi-page; hamburger opens an overlay with: Home, JUNIOR TENNIS (expandable: JUNIOR TENNIS, SUMMER CAMP, Tournaments, 2026 MEMBERSHIPS), ADULT TENNIS (expandable: ADULT TENNIS, 2026 MEMBERSHIPS), Pickleball, PLAYING OPTIONS (expandable: PLAYING OPTIONS, 2026 MEMBERSHIPS), LOCATIONS, STAFF, SIGN IN.
- “SIGN IN” in nav goes to **Court Reserve** (external), not an on-site account. No custom auth on the marketing site.
- Countdown is client-side (likely JavaScript). Expandable sections use simple show/hide (JS or builder components).
- Contact form submits through Wix (or similar); no custom API. reCAPTCHA for spam.

### 1.3 Junior Tennis (`/junior-tennis`)

- **URL:** `https://providencetennis.com/junior-tennis`
- **Title:** “JUNIOR TENNIS”
- **Header:** Same as homepage (announcement bar, logo, hamburger, phone).
- **Content:**
  - “Welcome to the JUNIOR CHAMPIONS ACADEMY”
  - H1: “We are Rhode Island's #1 DEVELOPMENTAL and HIGH PERFORMANCE” + intro copy (17th year, State/National Championships, ITF, etc.).
  - “Programs, Camps and Tournaments”
  - **CURRENT PROGRAMS:** “WINTER 2025” — “Ends on December 22, 2025”; “INDOOR LOCATION” — Tennis Rhode Island, 70 Boyd Avenue, East Providence.
  - **TENNIS and SPORTS CAMP:** “JUNE 15 - AUGUST 21, 2026”; “Open to youth of all skills and levels ages 4-17”; “SUMMER CAMP LINK.”
  - **EVENTS and TOURNAMENTS:** USTA Tournament Schedule; UTR EVENTS Schedule.
  - “Why we are different?” — Personalized Schedules, Development Plan, Goals Assessment.
  - “ONE LOVE PROVIDENCE FREE TENNIS FOR ALL KIDS AGES 5-17!” — spring at Roger Williams Park, Wed/Sun; “WATCH US ON TV!” link (turnto10.com).
- **Footer:** Same as homepage; cookie banner.
- **Technical:** Same Wix header/footer; content is static copy and links. “LOG IN TO SEE OUR PROGRAMS” points to Court Reserve. No on-site booking or member area.

### 1.4 Locations (`/locations`)

- **URL:** `https://providencetennis.com/locations`
- **Title:** “LOCATIONS”
- **Content:**
  - H1: “Providence Tennis is at:”
  - “Roger Williams Park, 1000 Elmwood Ave Providence, RI” (and “1000 Elmwood Avenue, Providence, RI, USA”).
  - Contact: 401-935-4336, ProvidenceTennis@gmail.com.
  - “Hours” — “Open today” “07:30 am – 06:00 pm.”
  - **Embedded map:** Google Maps (or similar) with “Get directions” button; shows Roger Williams Park, zoo, botanical center, roads (Elmwood, Broad St, I-95, etc.).
- **Technical:** Map is third-party embed (iframe or script). No custom geocoding or directions API on the site.

### 1.5 Staff (`/staff`)

- **URL:** `https://providencetennis.com/staff`
- **Title:** “STAFF”
- **Content:**
  - “PROVIDENCE TENNIS PROFESSIONAL STAFF”
  - “ALL OF OUR STAFF MEMBERS ARE SAFE PLAY APPROVED by USTA.”
  - **Nestor Bernabe** — Owner/Director of Tennis; email NestorTennis@gmail.com; Certifications (USPTA ELITE, USTA High Performance, PTR, iTPA, etc.); Accomplishments (ATP, NCAA All-American, USTA boards, ITF captain, RSPA); Awards (USPTA National/New England “STAR,” Pro of the Year, Hall of Fame); Coaching history and “BEFORE Providence Tennis” / “PRE-COACHING.”
  - **Marcus Mitchell** — Staff Professional.
  - **Natalia Vergara** — 10U Professional; “LINK TO UT Southern BIO.”
  - **Erica Botelho** — Staff Professional; “LINK TO RIC BIO.”
  - **Ethan Clegg** — Staff Professional; “LINK TO RIC BIO.”
- **Technical:** Static staff bios and external bio links. No staff management, scheduling, or roles in-app.

### 1.6 Court Reservation & Sign-In (Current Site)

- **Reservations:** Not on the website. Copy directs users to “Court Reserve” (e.g. “Log into your COURT RESERVE account to make reservations…”). “LOG IN” / “SIGN IN” links go to Court Reserve (external). No in-site court picker, availability, or booking flow.
- **Membership/account:** No on-site user accounts. Identity and bookings live entirely in Court Reserve.

### 1.7 Other Pages (from nav)

- **Adult Tennis, Pickleball, Playing Options, 2026 Memberships:** Separate pages (not fully inspected here); same header/footer and Wix-style layout; content is marketing and links to Court Reserve or external info.
- **reCAPTCHA:** Used on contact form; “Google Privacy Policy and Terms of Service” noted.

---

## Part 2: Project (providence_tennis) — Capabilities Implemented

### 2.1 Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, `@dnd-kit/core`, `react-markdown`, Stripe React/JS.
- **Backend:** Express.js (port 8080), TypeScript, file-based JSON storage (`backend/data/`: members, reservations, payments, courts, journal-entries, training-plans).
- **Auth:** Custom JWT + session; sign-up, sign-in, email verification, forgot/reset password; roles: `player`, `coach`, `parent`, `admin`.
- **Payments:** Stripe (PaymentIntent + Payment Element); config served from backend (`GET /api/config/stripe`).
- **AI:** Google Gemini (model from `.env`); public chat, admin booking assistant, orchestrator (Ace) for training/journal.

### 2.2 Public Marketing Site (Homepage)

- **Single-page flow:** TopBanner → Navigation → Hero → LatestNews → MissionProgramsFacilities → CountdownTimer → ProgramsShowcase → **CourtReservation** → FeaturesSection → SubscribeSection → ContactSection → Footer → CookieBanner → **AIAssistant**.
- **Navigation:** In-app hash/anchor links (#home, #juniors, #reservations, #locations, etc.); **SIGN IN** goes to `/signin` (your auth), not Court Reserve.
- **Reservations:** Full in-site flow in `CourtReservation.tsx`: date → court → details → payment (Stripe) → confirmation; uses `/api/availability`, `/api/reservations`, `/api/payments/create-intent`, `/api/payments/confirm`; optional prefill from logged-in user.
- **Contact form:** Client-side only (simulated submit with `setTimeout` + alert); no backend or email service wired in the snippet seen.
- **Subscribe:** UI only (no backend endpoint referenced in the components checked).
- **Cookie banner:** Component present; behavior is local (e.g. accept/dismiss).
- **AI:** Floating AIAssistant; calls `POST /api/chat` (Gemini); helps with bookings, programs, facilities, general Q&A.

### 2.3 Authentication & User Accounts

- **Routes:** `/signin`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`.
- **Context:** `AuthProvider`; token and user in localStorage; `getCurrentUser` to validate token.
- **Roles:** player, coach, parent, admin; used for dashboard and API access.

### 2.4 Dashboard (Post–Sign-In)

- **Layout:** `(dashboard)` and `dashboard/` use `ProtectedRoute`; only authenticated users.
- **Dashboard home:** Welcome by first name; Upcoming Bookings (from `/api/members/me/reservations`); Recent Payments; MembershipStatus; Quick Actions (Book a Court, Edit Profile, View Bookings).
- **Bookings:** `/dashboard/bookings` — list; cancel with confirmation; `/dashboard/book` — court booking (CourtReservation in “dashboard” variant).
- **Profile:** `/dashboard/profile` — edit profile.
- **Payments:** `/dashboard/payments` — payment history.
- **Journal:** `/dashboard/journal` — coaching journal (create, list, filter, export, analytics); coach/player views; API: `/api/journal/entries` (CRUD, filters by player/coach/date/area).

### 2.5 Admin

- **Admin bookings:** `/dashboard/admin/bookings` — table view + **calendar view** (weekly grid, 7 days × 14 hours); 10 courts; drag-and-drop to move bookings; conflict detection (frontend + backend); uses `PATCH /api/admin/reservations/:id`; @dnd-kit.
- **Admin AI:** AdminAIAssistant — natural-language booking (move, cancel, find, availability); `POST /api/admin/chat`; admin-only.

### 2.6 AI Agents

- **Public:** `POST /api/chat` — facility info, reservations, tennis Q&A (Gemini, optional web search).
- **Admin:** `POST /api/admin/chat` — booking management (tools for search, move, cancel, availability).
- **Orchestrator (Ace):** `POST /api/orchestrator/chat` — training plans, journal analysis, player management; used by admin/coach/player; dual-mode in UI (Training vs Booking for admins).

### 2.7 API Summary

- **Courts:** GET `/api/courts`.
- **Availability:** GET `/api/availability?date=YYYY-MM-DD` (cached 30s).
- **Reservations:** GET/POST `/api/reservations`, GET/PUT/DELETE `/api/reservations/:id`; conflict detection and file locking.
- **Members:** CRUD, search, by role; `/api/members/me/reservations`, `/api/members/me`.
- **Auth:** sign-up, sign-in, verify-email, forgot-password, reset-password, getCurrentUser.
- **Payments:** POST `/api/payments/create-intent`, POST `/api/payments/confirm`; GET payments; refunds; config: GET `/api/config/stripe`.
- **Journal:** CRUD `/api/journal/entries` with filters; role-based access.
- **Chat:** `/api/chat`, `/api/admin/chat`, `/api/orchestrator/chat`.

### 2.8 Design & UX

- **Design system:** `tailwind.config.ts` — primary (teal), accent (lime); tokens (e.g. primary-600, accent-400).
- **Responsive:** Tailwind breakpoints; mobile menu in Navigation.
- **Motion:** Framer Motion for hero, sections, cards, modals.

---

## Part 3: Main Technical Differentiators (Current Website vs. Project)

### 3.1 Reservations & Payments

| Aspect | Current website (providencetennis.com) | Project (providence_tennis) |
|--------|----------------------------------------|-----------------------------|
| **Where to book** | Court Reserve (external). Site only has “LOG IN” link. | In-site flow: pick date → court → time → details → pay → confirm. |
| **Availability** | Not shown on site; handled in Court Reserve. | GET `/api/availability?date=...`; 30s cache; conflict-aware. |
| **Payment** | Presumed in Court Reserve; no Stripe on marketing site. | Stripe PaymentIntent + Payment Element; $40/court; create-intent → confirm; linked to reservation and member. |
| **Guest vs member** | N/A (no site account). | Guest bookings (no payment in flow); members can pay and have bookings under their account. |

**Differentiator:** The project provides an **integrated reservation and payment experience** on the same domain with your own data and business rules; the current site is **informational + link-out** to Court Reserve.

### 3.2 Authentication & User Accounts

| Aspect | Current website | Project |
|--------|-----------------|--------|
| **Accounts** | None on site. “SIGN IN” = Court Reserve. | Full auth: sign-up, sign-in, email verification, password reset. |
| **Roles** | N/A | player, coach, parent, admin. |
| **Session** | N/A | JWT + localStorage; getCurrentUser to validate. |
| **Protected areas** | N/A | Dashboard, profile, bookings, payments, journal, admin. |

**Differentiator:** The project has **first-party user identity and role-based access**; the current site has **no on-site accounts**.

### 3.3 Dashboard & Self-Service

| Aspect | Current website | Project |
|--------|-----------------|--------|
| **Member dashboard** | None. | Welcome, upcoming bookings, recent payments, membership status, quick actions. |
| **Bookings list** | In Court Reserve. | `/dashboard/bookings` with cancel. |
| **Payment history** | In Court Reserve. | `/dashboard/payments`. |
| **Profile** | N/A | `/dashboard/profile` edit. |

**Differentiator:** The project offers a **unified member dashboard** (bookings, payments, profile) on your domain; the current site does not.

### 3.4 Admin & Operations

| Aspect | Current website | Project |
|--------|-----------------|--------|
| **Booking management** | In Court Reserve. | Admin bookings page: table + **weekly calendar**, 10 courts, **drag-and-drop** to move bookings; conflict checks. |
| **Admin AI** | None. | Natural-language booking (move/cancel/find/availability) via `/api/admin/chat`. |

**Differentiator:** The project has **admin tools and AI** for booking management on your own stack; the current site relies entirely on Court Reserve.

### 3.5 Coaching & Training

| Aspect | Current website | Project |
|--------|-----------------|--------|
| **Staff page** | Static bios and external links. | Same idea (content can be mirrored); plus **journal** and **orchestrator** below. |
| **Coaching journal** | None. | Journal entries (session summary, areas worked on, pointers); coach/player views; filters and export; `/api/journal/entries`. |
| **Training plans** | None. | Orchestrator (Ace) creates and manages training plans; stored in backend. |
| **Player/coach tools** | None. | Coaches write journals; players see entries about them; Ace for plans and analysis. |

**Differentiator:** The project adds **coaching workflows and AI-assisted training** (journal + Ace); the current site has **no coaching or training tooling**.

### 3.6 AI & Chat

| Aspect | Current website | Project |
|--------|-----------------|--------|
| **On-site chat** | None. | Floating AI assistant (public); answers facility, booking, programs, general tennis Q&A. |
| **Admin chat** | N/A | Admin-only booking assistant (move, cancel, find, availability). |
| **Training/player chat** | N/A | Orchestrator (Ace) for plans, journal analysis, player management; all authenticated roles. |

**Differentiator:** The project has **three AI agents** (public, admin, orchestrator) integrated into the app; the current site has **no AI or chat**.

### 3.7 Platform & Control

| Aspect | Current website | Project |
|--------|-----------------|--------|
| **Platform** | Wix (or similar builder). | Next.js + Express; TypeScript; your repo and hosting. |
| **Content updates** | Builder CMS/editor. | Code/content in repo (or future CMS you add). |
| **Integrations** | Wix + Court Reserve + map + reCAPTCHA. | Your API, Stripe, Gemini; you control every integration. |
| **Data** | In Wix and Court Reserve. | JSON files (members, reservations, payments, courts, journal, training plans); can be replaced by DB. |
| **Custom logic** | Limited to builder. | Full backend: conflict detection, locking, caching, role checks, webhooks (e.g. Stripe). |

**Differentiator:** The project is **fully owned and extensible** (code, data, APIs); the current site is **builder-hosted with external reservation system**.

### 3.8 Contact & Forms

| Aspect | Current website | Project |
|--------|-----------------|--------|
| **Contact form** | Wix form + reCAPTCHA; submits to Wix. | ContactSection exists; submit is simulated (alert); no backend/email in snippet. |
| **Subscribe** | Builder newsletter widget. | SubscribeSection UI only; no backend in snippet. |

**Differentiator:** Current site has **working form delivery** via builder; the project has **UI ready** but contact/subscribe **not wired to backend/email** in the code reviewed.

### 3.9 Design & Front-End

| Aspect | Current website | Project |
|--------|-----------------|--------|
| **Design** | Wix templates; grey/white, circular logo, clear sections. | Custom Tailwind design system (teal/lime); Framer Motion; gradient text and cards. |
| **Navigation** | Hamburger overlay; expandable items; “SIGN IN” to Court Reserve. | Sticky nav; hash links; “SIGN IN” to `/signin`. |
| **Reservation CTA** | “LOG IN” to Court Reserve. | In-page court reservation flow + “Book a Court” in nav/dashboard. |
| **Responsive** | Yes (Wix). | Yes (Tailwind + mobile menu). |

**Differentiator:** The project has a **custom, consistent design system** and **in-page reservation flow**; the current site is **template-based** and **link-out for reservations**.

---

## Summary Table: Where the Project Goes Beyond the Current Website

| Area | Current site | Project |
|------|--------------|--------|
| **Court booking** | External (Court Reserve) | In-site flow with availability and conflict handling |
| **Payments** | In Court Reserve | Stripe on your backend, linked to reservations and members |
| **User accounts** | None | Full auth + roles (player, coach, parent, admin) |
| **Member dashboard** | None | Bookings, payments, profile, quick actions |
| **Admin booking UI** | In Court Reserve | Table + calendar + drag-and-drop + conflict detection |
| **Admin AI** | None | Natural-language booking management |
| **Coaching journal** | None | Journal CRUD, filters, export, coach/player views |
| **Training AI** | None | Orchestrator (Ace): plans, journal analysis, player management |
| **Public AI** | None | Site-wide chat for info and booking help |
| **Platform** | Wix | Next.js + Express, full control and extensibility |

---

**Document purpose:** To give a precise, technical comparison of the live site vs. your project so you can communicate differentiators (e.g. integrated booking, payments, auth, dashboard, admin tools, coaching journal, and AI) and identify any gaps (e.g. contact/subscribe backend, or future CMS) for your roadmap.

---

## Part 4: Small-Business Owner Quote (Non-Technical)

### 4.1 Simple Business Explanation (30 seconds)

Today, the website is mostly informational and sends people to external tools to log in and book.  
This project turns the site into a full digital front desk: customers can book and pay directly on your website, members can manage their account, and staff can manage operations from one place.

### 4.2 What Is Better (Concise)

- **Higher conversion:** Fewer drop-offs because booking/payment happen on your own site (no external handoff).
- **Less admin work:** Staff can manage bookings, payments, and schedules from one dashboard.
- **Better customer experience:** Cleaner booking flow, member accounts, and faster support with AI chat.
- **Business control:** You own the platform, data, and rules (instead of being limited by a site builder + external reservation platform).
- **Future-ready foundation:** Easier to add memberships, reports, promotions, and automation later.

### 4.3 Proposed Pricing Plans (Reasonable for a Small Business)

All plans assume the current repository is the base and we are finalizing, polishing, and launching production.

| Plan | Best for | One-Time Build | Timeline | Monthly Support | Includes |
|------|----------|----------------|----------|-----------------|----------|
| **Plan A: Launch Essentials** | Get live quickly with core booking/payment | **$4,500** | 3-4 weeks | **$250/mo** | Production launch, in-site booking, Stripe payment flow, member sign-in, dashboard basics, bug fixes, handoff training |
| **Plan B: Operations Growth (Recommended)** | Strong day-to-day operations | **$7,900** | 5-7 weeks | **$400/mo** | Everything in Plan A + admin calendar/booking tools, contact form backend wiring, newsletter backend wiring, email notifications, analytics setup, stronger QA |
| **Plan C: Performance + AI** | Differentiated premium digital experience | **$11,900** | 7-9 weeks | **$650/mo** | Everything in Plan B + public AI assistant tuning, admin AI booking assistant, coaching journal + training workflows, monthly optimization report |

### 4.4 Estimated Total Investment (Year 1)

- **Plan A:** ~$7,500 + payment processing fees + optional AI usage
- **Plan B:** ~$12,700 + payment processing fees + optional AI usage
- **Plan C:** ~$19,700 + payment processing fees + optional AI usage

### 4.5 Third-Party Costs (Pass-Through)

- **Card processing (Stripe):** currently **2.9% + 30 cents per successful card charge** (online standard pricing).  
  Source: [Stripe pricing](https://stripe.com/pricing)
- **Hosting (example baseline):** Vercel Pro starts at **$20/month per seat** (if using Vercel Pro).  
  Source: [Vercel pricing](https://vercel.com/pricing)
- **AI usage:** usage-based token billing (Google Gemini API), usually low at small-business traffic levels and scalable with usage.  
  Source: [Google AI pricing](https://ai.google.dev/gemini-api/docs/pricing)

### 4.6 Suggested Script for the Owner

"Right now the website is mainly a brochure and pushes clients to outside systems.  
This new platform keeps booking and payment inside your website, gives members and staff a real dashboard, and reduces manual coordination.  
For a small business, I recommend Plan B at $7,900 one-time plus $400/month support, which gives a strong operational upgrade without overbuilding on day one."

### 4.7 Optional Add-Ons (If Needed)

- Historical data migration from external tools: **$800-$2,000** depending on data quality.
- SMS reminders/alerts: **$100 setup + monthly usage costs**.
- Ongoing SEO/content work: **$300-$900/mo** depending on scope.
