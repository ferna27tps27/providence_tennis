# Providence Tennis: Project Breakdown & Time Estimates (Agent-Assisted)

All estimates assume **AI agent-assisted development** (Cursor agents, code generation, automated testing). Times are in **focused working hours**, not calendar time.

**Legend:**
- ✅ = Already built and functional
- 🔧 = Built but needs production hardening / finishing touches
- ❌ = Not yet implemented (UI-only or stubbed)

---

## 1. Reservations & Payments (Section 3.1)

**Status: ~85% complete — core flow works end-to-end**

| Sub-task | Status | What Exists | What's Needed | Est. Hours |
|----------|--------|-------------|---------------|------------|
| **Booking flow UI** (date → court → time → details → confirm) | ✅ | Full multi-step flow in `CourtReservation.tsx` (902 lines), date picker, court selector, time slots | — | 0 |
| **Availability API** | ✅ | `GET /api/availability?date=` with 30s cache, conflict-aware | — | 0 |
| **Reservation CRUD** | ✅ | `POST/GET/PUT/DELETE /api/reservations`, conflict detection, file locking | — | 0 |
| **Stripe PaymentIntent flow** | ✅ | `stripe-client.ts`, `payment-processor.ts`, `StripePaymentForm.tsx`; create-intent → confirm → record | — | 0 |
| **Guest vs member booking** | ✅ | Both paths supported; guest needs name/email/phone, member uses auth token | — | 0 |
| **Invoice generation** | ✅ | `invoice-generator.ts` with JSON and text format output | — | 0 |
| **Refund processing** | ✅ | `POST /api/payments/:id/refund` with Stripe refund API | — | 0 |
| **Stripe webhook for async status** | ❌ | No webhook endpoint | Add `POST /api/webhooks/stripe` to sync payment status on async events (failed charges, disputes) | 2–3 |
| **Production Stripe testing** | 🔧 | Test-mode keys work | Switch to production keys, test with real cards, verify Payment Element renders correctly in prod | 1–2 |
| **Booking confirmation email** | ❌ | No email sent after booking | Wire email service (see Auth section) + booking confirmation template | 1–2 |
| **Edge case hardening** | 🔧 | Basic error handling exists | Double-booking race condition stress test, payment timeout handling, partial-failure recovery | 2–3 |

**Total for Reservations & Payments: ~6–10 hours remaining**

---

## 2. Authentication & User Accounts (Section 3.2)

**Status: ~75% complete — auth flow works, email delivery is stubbed**

| Sub-task | Status | What Exists | What's Needed | Est. Hours |
|----------|--------|-------------|---------------|------------|
| **Sign up / Sign in** | ✅ | `POST /api/auth/signup`, `POST /api/auth/signin`, JWT tokens, `AuthProvider` context | — | 0 |
| **Role system** | ✅ | player, coach, parent, admin; `requireRole()` middleware; role-based API access | — | 0 |
| **Session management** | ✅ | JWT + localStorage, `getCurrentUser`, `authenticate` middleware | — | 0 |
| **Password reset flow** | ✅ | Token generation, verification, reset endpoint, frontend forms all exist | — | 0 |
| **Email verification flow** | 🔧 | Logic exists but **disabled** (signup auto-signs in); token system works | Re-enable after email service is wired; toggle via env var | 0.5 |
| **Wire real email service** | ❌ | `email-service.ts` has 3 functions that only `console.log()` | Integrate SendGrid or Resend (npm package, API key, HTML templates for verification, reset, welcome) | 2–3 |
| **Rate limiting on auth endpoints** | ❌ | None | Add express-rate-limit on `/api/auth/*` (signup: 5/hr, signin: 10/min, forgot-password: 3/hr) | 1 |
| **Password strength validation** | 🔧 | Frontend checks ≥8 chars | Add backend validation (min length, complexity), match frontend rules | 0.5 |
| **Session expiry / refresh** | 🔧 | JWT has expiry but no refresh token flow | Add refresh token endpoint or extend session on activity | 1–2 |
| **Security headers & CORS hardening** | 🔧 | `cors()` with defaults | Lock down CORS origins, add helmet.js, set secure cookie flags for production | 1 |

**Total for Auth: ~5–7 hours remaining**

---

## 3. Dashboard & Self-Service (Section 3.3)

**Status: ~90% complete — all pages exist and are functional**

| Sub-task | Status | What Exists | What's Needed | Est. Hours |
|----------|--------|-------------|---------------|------------|
| **Dashboard home** | ✅ | Welcome message, upcoming bookings, recent payments, membership status, quick actions | — | 0 |
| **Bookings list + cancel** | ✅ | `/dashboard/bookings` with cancel confirmation | — | 0 |
| **Book from dashboard** | ✅ | `/dashboard/book` uses `CourtReservation` in dashboard variant | — | 0 |
| **Payment history** | ✅ | `/dashboard/payments` | — | 0 |
| **Profile edit** | ✅ | `/dashboard/profile` | — | 0 |
| **Empty / loading / error states** | 🔧 | Basic loading exists | Polish empty states (no bookings yet, no payments), skeleton loaders, error boundaries | 1–2 |
| **Booking details view** | 🔧 | List shows summary | Add a detail/expand view with full reservation info, payment link, cancel/reschedule options | 1–2 |
| **Membership status display** | 🔧 | Component exists | Wire to real membership data if membership tiers are defined; currently likely placeholder | 1 |

**Total for Dashboard: ~3–4 hours remaining**

---

## 4. Admin & Operations (Section 3.4)

**Status: ~85% complete — calendar, drag-drop, and AI all functional**

| Sub-task | Status | What Exists | What's Needed | Est. Hours |
|----------|--------|-------------|---------------|------------|
| **Admin bookings table** | ✅ | Table view with filters (date range, status, court, search), enriched with member info | — | 0 |
| **Weekly calendar view** | ✅ | `BookingCalendarGrid.tsx` — 7 days × 14 hours, week navigation | — | 0 |
| **Drag-and-drop booking moves** | ✅ | `@dnd-kit/core`, `DraggableBookingBlock`, `CalendarTimeSlot`, conflict detection on drop | — | 0 |
| **Admin reservation CRUD** | ✅ | `POST/GET/PATCH/DELETE /api/admin/reservations` with auth + role guard | — | 0 |
| **Admin AI assistant** | ✅ | Natural-language move/cancel/find/availability via `POST /api/admin/chat` | — | 0 |
| **Admin member management UI** | ❌ | API exists (`/api/members` CRUD) but no admin UI page for managing members | Build `/dashboard/admin/members` page: list, search, edit roles, activate/deactivate | 3–4 |
| **Admin reporting / analytics** | ❌ | Data exists in JSON files | Build basic admin dashboard: bookings/day, revenue/week, utilization by court, member growth | 3–4 |
| **Admin create-booking form** | 🔧 | Admin can create via API | Add a quick-create form in the calendar UI (click empty slot → fill details → save) | 1–2 |
| **Conflict detection on PATCH** | 🔧 | Frontend checks conflicts; backend PATCH doesn't re-validate time conflicts | Add server-side conflict check in `PATCH /api/admin/reservations/:id` when date/time/court change | 1–2 |

**Total for Admin: ~8–12 hours remaining**

---

## 5. Coaching & Training (Section 3.5)

**Status: ~90% complete — journal, training agent, and orchestrator all functional**

| Sub-task | Status | What Exists | What's Needed | Est. Hours |
|----------|--------|-------------|---------------|------------|
| **Journal entry CRUD** | ✅ | Full CRUD with `POST/GET/PUT/DELETE /api/journal/entries`, role-based access, enrichment with names | — | 0 |
| **Journal filters** | ✅ | Filter by player, coach, date range, area worked on; name-based search | — | 0 |
| **Coach journal form** | ✅ | `CoachJournalForm.tsx` (475 lines) with player select, areas, pointers, localStorage draft save | — | 0 |
| **Player reflection** | ✅ | `POST /api/journal/entries/:id/reflection` | — | 0 |
| **Player training AI agent** | ✅ | `player-training-agent.ts` with Gemini, tool calls for analytics/profile/history/plan creation | — | 0 |
| **Orchestrator (Ace)** | ✅ | `orchestrator-agent.ts`, routes for players/coaches/admins, dual-mode UI | — | 0 |
| **Training plan repository** | ✅ | `file-training-plan-repository.ts` with CRUD and file locking | — | 0 |
| **Journal export** | 🔧 | Export mentioned in docs | Verify CSV/PDF export works end-to-end; add date range selection for export | 1–2 |
| **Training plan display UI** | 🔧 | Plans created by AI agent | Build a `/dashboard/training-plans` page to view, track, and update plans | 2–3 |
| **Analytics visualization** | 🔧 | `analyzePlayerJournals()` calculates stats | Add charts (area frequency, progress over time) to player/coach dashboard views | 2–3 |

**Total for Coaching & Training: ~5–8 hours remaining**

---

## 6. AI & Chat (Section 3.6)

**Status: ~90% complete — all three agents functional**

| Sub-task | Status | What Exists | What's Needed | Est. Hours |
|----------|--------|-------------|---------------|------------|
| **Public AI assistant** | ✅ | `AIAssistant.tsx`, `POST /api/chat`, Gemini integration, facility/booking/tennis Q&A | — | 0 |
| **Admin AI assistant** | ✅ | `AdminAIAssistant.tsx`, `POST /api/admin/chat`, tool calls for search/move/cancel/availability | — | 0 |
| **Orchestrator (Ace)** | ✅ | `POST /api/orchestrator/chat`, role-based behavior (player/coach/admin), training + journal tools | — | 0 |
| **Prompt tuning & knowledge base** | 🔧 | System prompts exist | Refine prompts with real facility info (hours, pricing, programs, policies); add seasonal updates | 1–2 |
| **Conversation persistence** | ❌ | History is client-side only (lost on refresh) | Optional: save conversation history server-side for logged-in users | 2–3 |
| **Rate limiting on chat endpoints** | ❌ | None | Add rate limits (public: 20/min, authenticated: 40/min) to prevent abuse and control API costs | 0.5 |
| **Token usage monitoring** | ❌ | None | Log token usage per request; add basic dashboard or alerts for cost tracking | 1–2 |
| **Fallback / offline behavior** | 🔧 | Generic error message on failure | Add graceful degradation: show contact info if AI is down, retry logic, timeout handling | 1 |

**Total for AI & Chat: ~5–8 hours remaining**

---

## 7. Platform & Control (Section 3.7)

**Status: ~70% complete — stack works locally, needs production infrastructure**

| Sub-task | Status | What Exists | What's Needed | Est. Hours |
|----------|--------|-------------|---------------|------------|
| **Next.js + Express stack** | ✅ | Frontend on Next.js 14 (App Router), backend on Express (port 8080) | — | 0 |
| **TypeScript throughout** | ✅ | Full TS on both sides with types for all entities | — | 0 |
| **File-based JSON storage** | ✅ | Repositories for members, reservations, payments, courts, journal, training plans; file locking | — | 0 |
| **Migrate to PostgreSQL** | ❌ | All data in JSON files | Replace file repositories with Postgres (Prisma or Drizzle ORM); migrate schema; data migration script | 4–6 |
| **Deployment configuration** | ❌ | `start.sh` for local dev | Configure Vercel (frontend) + Railway/Render/Fly.io (backend); env vars; build scripts; health checks | 2–3 |
| **CI/CD pipeline** | ❌ | No pipeline | GitHub Actions: lint → test → build → deploy (staging + production) | 2–3 |
| **Environment management** | 🔧 | `env.sample` exists | Create `.env.production`, `.env.staging`; document all required vars; validate on startup | 1 |
| **Monitoring & logging** | ❌ | `console.log/error` only | Add structured logging (pino/winston); error tracking (Sentry); uptime monitoring | 2–3 |
| **Backup strategy** | ❌ | None (JSON files at risk) | If staying on JSON: add file backup cron; if Postgres: automated DB backups | 1–2 |

**Total for Platform: ~12–18 hours remaining**

---

## 8. Contact & Forms (Section 3.8)

**Status: ~30% complete — UI exists, no backend wiring**

| Sub-task | Status | What Exists | What's Needed | Est. Hours |
|----------|--------|-------------|---------------|------------|
| **Contact form UI** | ✅ | `ContactSection.tsx` with name, email, message fields, validation | — | 0 |
| **Contact form backend** | ❌ | Submit is `setTimeout` + `alert()` | Create `POST /api/contact` endpoint; send email to owner (via SendGrid/Resend); store in DB; success/error response | 1–2 |
| **Contact form spam protection** | ❌ | None | Add reCAPTCHA v3 or honeypot field; rate limiting (5/hr per IP) | 1–2 |
| **Subscribe form UI** | ✅ | `SubscribeSection.tsx` with email input | — | 0 |
| **Subscribe form backend** | ❌ | Submit is just `alert()` | Create `POST /api/subscribe` endpoint; integrate with Mailchimp/Buttondown/ConvertKit or store email list in DB | 1–2 |
| **Subscribe double opt-in** | ❌ | None | Send confirmation email with opt-in link; comply with CAN-SPAM | 1–2 |
| **Admin notification on contact** | ❌ | None | Email owner when contact form is submitted (can be same email service) | 0.5 |

**Total for Contact & Forms: ~5–8 hours remaining**

---

## 9. Design & Front-End (Section 3.9)

**Status: ~90% complete — polished custom design system in place**

| Sub-task | Status | What Exists | What's Needed | Est. Hours |
|----------|--------|-------------|---------------|------------|
| **Design system** | ✅ | Tailwind config with primary (teal) + accent (lime) tokens | — | 0 |
| **Responsive design** | ✅ | Tailwind breakpoints, mobile menu in Navigation | — | 0 |
| **Animations** | ✅ | Framer Motion on hero, sections, cards, modals | — | 0 |
| **Navigation** | ✅ | Sticky nav, hash links, SIGN IN to `/signin` | — | 0 |
| **Cookie banner** | ✅ | Component present, local dismiss | — | 0 |
| **Cross-browser testing** | 🔧 | Developed in one browser | Test Safari, Firefox, Edge, iOS Safari, Android Chrome; fix any layout/animation issues | 1–2 |
| **Accessibility audit** | 🔧 | Basic semantic HTML | Run axe/Lighthouse audit; fix focus management, ARIA labels, contrast ratios, keyboard nav | 2–3 |
| **Performance optimization** | 🔧 | Next.js defaults | Image optimization (next/image for all images), code splitting review, lazy load below-fold sections | 1–2 |
| **SEO basics** | ❌ | Minimal meta tags | Add `<title>`, meta description, Open Graph tags per page; sitemap.xml; robots.txt | 1–2 |
| **Favicon & PWA manifest** | 🔧 | May have basic favicon | Add proper favicon set, Apple touch icon, web app manifest | 0.5 |

**Total for Design & Front-End: ~5–9 hours remaining**

---

## Summary: Total Remaining Work

| Area | Completion | Remaining Hours |
|------|-----------|-----------------|
| **1. Reservations & Payments** | ~85% | 6–10 hrs |
| **2. Authentication & User Accounts** | ~75% | 5–7 hrs |
| **3. Dashboard & Self-Service** | ~90% | 3–4 hrs |
| **4. Admin & Operations** | ~85% | 8–12 hrs |
| **5. Coaching & Training** | ~90% | 5–8 hrs |
| **6. AI & Chat** | ~90% | 5–8 hrs |
| **7. Platform & Control** | ~70% | 12–18 hrs |
| **8. Contact & Forms** | ~30% | 5–8 hrs |
| **9. Design & Front-End** | ~90% | 5–9 hrs |
| **TOTAL** | | **54–84 hrs** |

---

## Suggested Priority Order (Production Launch Path)

If the goal is to get to a **production-ready launch** as fast as possible, here's the recommended order:

### Phase 1: Core Infrastructure (must-have for launch) — ~20–30 hrs
1. **Wire email service** (Auth #6 + Contact #3–7) — shared dependency
2. **Contact form + Subscribe form backend** (Section 8) — quick wins, completes the marketing site
3. **Deployment configuration** (Platform #4–5) — needed to go live
4. **Security hardening** (Auth #7–10, rate limiting) — non-negotiable for production
5. **Environment management** (Platform #7) — needed for deployment

### Phase 2: Production Polish — ~15–25 hrs
6. **Stripe webhook** (Reservations #8) — handles async payment events
7. **Dashboard polish** (Section 3) — empty states, loading, error boundaries
8. **Admin member management UI** (Admin #6) — staff needs this day-to-day
9. **SEO & accessibility** (Design #7–10) — important for discoverability and compliance
10. **Cross-browser testing** (Design #6) — catch issues before users do

### Phase 3: Database & Scale — ~10–15 hrs
11. **PostgreSQL migration** (Platform #4) — replaces JSON files for production reliability
12. **CI/CD pipeline** (Platform #6) — automated deploys
13. **Monitoring & logging** (Platform #8) — visibility into production

### Phase 4: Premium Features — ~10–15 hrs
14. **Admin reporting** (Admin #7) — business intelligence
15. **Training plan UI** (Coaching #9) — player-facing training experience
16. **AI prompt tuning** (AI #4) — better responses with real facility data
17. **Conversation persistence** (AI #5) — nice-to-have for logged-in users
18. **Token usage monitoring** (AI #7) — cost control

---

## Calendar Estimate (Agent-Assisted)

| Pace | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Total to Launch-Ready |
|------|---------|---------|---------|---------|----------------------|
| **Full-time (6–8 hrs/day)** | 3–4 days | 2–3 days | 1–2 days | 1–2 days | **~7–11 working days** |
| **Half-time (3–4 hrs/day)** | 5–8 days | 4–6 days | 3–4 days | 3–4 days | **~15–22 working days** |
| **Part-time (1–2 hrs/day)** | 10–15 days | 8–12 days | 5–8 days | 5–8 days | **~28–43 working days** |

> **Note:** "Launch-ready" = Phase 1 + Phase 2 complete. Phases 3–4 can happen post-launch with the JSON file storage working as a temporary solution for low-to-moderate traffic.
