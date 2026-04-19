Providence Tennis: Current Website vs. Full Deployment Proposal
Plain Text Version (Complete Document)

============================================================

1. Executive Overview
   ============================================================

This proposal covers a full deployment of the providence_tennis platform to replace the current “marketing site + external booking tool” experience with a single, owned platform where customers can book and pay directly on providencetennis.com, members can manage their account, and staff can manage operations from one place.

The current providencetennis.com site is primarily informational and pushes reservations to Court Reserve. The providence_tennis project is a functional app with first-party accounts, integrated booking, Stripe payments, admin scheduling tools, and optional AI-powered assistance.

This document includes:

* Page-by-page analysis of the current website
* Summary of the project’s implemented capabilities
* Key technical differentiators
* Gaps to address before launch
* Pricing (Full Deployment only) with 3–4 month installment options
* Support (kept under Court Reserve’s $200/month anchor)

============================================================
2) Part 1 — Current Website (providencetennis.com) Analysis
===========================================================

2.1 Technology & Platform

* Platform: Wix (or Wix-style builder). Typical builder patterns: CDN image behavior, overlay hamburger navigation, “Powered by” footer branding.
* Architecture: Builder/CMS multi-page marketing site, with third-party embeds and external tools.
* Backend: No custom backend observed; relies on external platforms for reservations and internal widgets for forms/hours/maps.

2.2 Homepage (/)
Key sections and flow:

* Announcement bar (e.g., “2026 memberships, summer camps…”)
* Header with hamburger nav, logo, phone number (tel link)
* Hero image of outdoor tennis courts
* Long-form page sections:

  * Latest News
  * Mission / Programs / Facilities (expand/collapse)
  * Countdown timer (“Season 6 at Roger Williams Park…”)
  * Programs and events links (Juniors, Adult, Competition)
  * Log In section pointing to Court Reserve
  * PlayReplay “Coming March 2026”
  * PlaySight streaming info and login
  * Subscribe widget
  * Contact form (Wix form + reCAPTCHA)
  * Address, phone, hours widget
* Footer with builder branding, cookie banner, and trust badge

Technical notes:

* “Sign In” is an outbound link to Court Reserve (not first-party login)
* Countdown and show/hide content are client-side widgets
* Contact form submits through the builder platform

2.3 Junior Tennis (/junior-tennis)

* Static informational page about the academy, programming timelines, camp details, event schedules, and differentiators.
* Reservation access routes outward (Court Reserve). No native booking on the site.

2.4 Locations (/locations)

* Static address, hours, phone/email
* Embedded map (third-party embed)

2.5 Staff (/staff)

* Static bios and external links
* No operational tools (no scheduling, permissions, staff management)

2.6 Court Reservations & Sign-In (Current Site)

* Reservations are not hosted on the website.
* Booking and member identity live in Court Reserve (external).
* The marketing site does not implement first-party accounts.

============================================================
3) Part 2 — Project (providence_tennis) Capabilities Implemented
================================================================

3.1 Stack (Implemented)
Frontend:

* Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion

Backend:

* Express.js (TypeScript)
* File-based JSON storage (members, courts, reservations, payments, journal entries, training plans)

Authentication:

* First-party sign-up / sign-in
* Email verification
* Password reset
* Role-based access: player, coach, parent, admin

Payments:

* Stripe PaymentIntent + Payment Element
* Backend serves Stripe config

AI (Optional features already built in the codebase):

* Public assistant
* Admin booking assistant
* Orchestrator (Ace) for training and journal analysis

3.2 Public Marketing Experience (Project Homepage)

* Single-page flow designed to mirror a modern, clean marketing site but includes the reservation experience directly on-site.
* Navigation is in-app; “Sign In” routes to /signin (first-party), not Court Reserve.
* Court Reservation component: users can select date/court/time, enter details, pay with Stripe, and receive confirmation.

3.3 Member Experience (Post Sign-In)

* Dashboard overview (upcoming bookings, recent payments, membership status)
* Bookings list with cancellation
* Profile management
* Payment history

3.4 Admin Operations

* Admin bookings management view
* Weekly calendar grid (10 courts)
* Drag-and-drop booking moves
* Conflict detection on reschedule
* Admin AI assistant for booking operations (find, move, cancel, check availability)

3.5 Coaching / Training Workflows (If Included)

* Coaching journal: create, list, filter, export, analytics
* Orchestrator “Ace”: training plans, journal analysis, player management

3.6 API Summary (Implemented)

* Courts: GET /api/courts
* Availability: GET /api/availability?date=YYYY-MM-DD (cached)
* Reservations: CRUD endpoints with conflict detection
* Members: CRUD + “me” endpoints
* Auth: signup/signin/verify/reset
* Payments: create-intent, confirm, payments history, refunds
* Journal: CRUD with filtering and role-based access
* Chat: public/admin/orchestrator endpoints

============================================================
4) Part 3 — Key Differentiators (Current Site vs Project)
=========================================================

4.1 Booking + Payments

* Current: booking happens off-site (Court Reserve)
* Project: booking and payment happen on your own website, with your own availability logic and business rules

4.2 Accounts + Roles

* Current: no first-party accounts
* Project: first-party authentication with player/coach/parent/admin roles

4.3 Member Dashboard

* Current: none
* Project: unified dashboard for bookings, payments, profile

4.4 Admin Operations

* Current: handled externally
* Project: admin booking tools + calendar + drag-and-drop scheduling + conflict checks

4.5 Coaching & Training Tools (if included)

* Current: none
* Project: journal + training plan workflows + AI support

4.6 AI (if included)

* Current: none
* Project: public assistant + admin booking assistant + orchestrator agent

4.7 Ownership & Control

* Current: builder platform with limited customization + external booking system
* Project: owned codebase, owned data model, owned integrations; extensible to a database later

============================================================
5) Known Gaps to Close Before Launch
====================================

These are the items that must be finalized to ship a production-grade “full deployment”:

* Production hosting + domain cutover plan
* Contact form backend wiring (real message delivery)
* Newsletter/subscribe backend wiring (store + send to email platform)
* Email notifications (booking confirmations/cancellations)
* Analytics instrumentation (basic tracking + conversions)
* QA pass across mobile/desktop and booking/payment flows
* Security + operational hardening (environment variables, logging, error handling)

============================================================
6) Proposed Implementation Plan (Full Deployment)
=================================================

Target outcomes:

* Replace “external handoff” booking with on-site booking + payment
* Enable first-party member accounts and admin operations
* Launch with stable production deployment, monitoring, and initial support

Timeline:

* 5–7 weeks (typical, depending on final scope choices and feedback turnaround)

Key phases:

1. Production setup + configuration (hosting, environments, Stripe live mode)
2. Booking + payment readiness (end-to-end testing, edge cases)
3. Admin operations readiness (calendar tools, conflicts, roles)
4. Contact/subscribe wiring + notifications
5. QA + launch checklist + go-live

============================================================
7) Pricing (Full Deployment Only)
=================================

Build + Deployment Fee (Fixed)

* Total: $7,900

Installment Options (3–4 months max)

Option A (3 months total)

* $3,900 upfront
* $2,000/month for 2 months
* Total: $7,900

Option B (4 months total)

* $3,400 upfront
* $1,500/month for 3 months
* Total: $7,900

Option C (3 months total)

* $4,500 upfront
* $1,700/month for 2 months
* Total: $7,900

Payment Protection (Standard)

* Autopay required (card or ACH)
* Go-live occurs after the upfront payment and first installment clear
* If a payment fails, the site can be placed into maintenance mode until the account is current

============================================================
8) Support (Additional; Kept Under Current Court Reserve Anchor)
================================================================

The client is currently paying approximately $200/month for Court Reserve. Support is priced to remain below that anchor and time-limited.

Launch Support (Time-Limited)
Option 1 (Recommended)

* $150/month for 3 months
  Includes:
* Bug fixes and small tweaks
* Monitoring and backups
* 1 monthly check-in call (30 minutes)
* Response time: 2 business days

Option 2 (Minimum)

* $100/month for 3 months
  Includes:
* Bug fixes only
* Email support only
* Response time: 3 business days

After the initial support window:

* No ongoing retainer required
* As-needed support available at $95/hour

============================================================
9) Third-Party Costs (Pass-Through)
===================================

* Payment processing (Stripe): card processing fees per transaction (commonly 2.9% + $0.30 in standard online pricing)
* Hosting: depends on provider and tier selected (can be optimized for small business budgets)
* AI usage (if enabled): usage-based; scales with traffic and feature usage

============================================================
10) Owner-Friendly Script (Non-Technical)
=========================================

“Right now the website is mainly informational and pushes clients to an outside system for booking. This project makes your website a full digital front desk: customers can book and pay directly on your site, members can manage their account, and staff can manage bookings from one dashboard. It reduces friction for customers and reduces manual coordination for staff.”

============================================================
11) Next Steps
==============

To proceed:

1. Select installment option (A, B, or C)
2. Confirm what’s included in “Full Deployment” (especially AI and coaching features)
3. Execute agreement + collect upfront payment
4. Begin production setup and deployment plan

If you want, I can also convert this into a client-ready “one-page pricing + scope” version for faster close, while keeping this full technical appendix as supporting material.
