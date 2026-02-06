# Documentation

Developer documentation for Providence Tennis Academy. Everything here is aimed at helping a new developer learn and work on the project.

## Quick links

- **[Technical Reference](TECHNICAL_REFERENCE.md)** – Ports, env vars, architecture, design system
- **[API Reference](api/API_DOCUMENTATION.md)** – Backend API
- **[Testing Strategy](TESTING_STRATEGY.md)** – How to run and write tests
- **[Getting Started](getting-started/DEVELOPER_ONBOARDING_BOOKINGS.md)** – Onboarding and book-a-court flow
- **[AI Agents](agents/README.md)** – Public assistant, Admin assistant, Orchestrator (Ace)

## Configuration

- **[env.sample](../env.sample)** (root) – Reference for all env vars; copy the backend section to `backend/.env`
- All credentials and environment variables live in **`backend/.env`** (single source of truth)

## Archive (historical / one-off reports)

Reference only; not needed for day-to-day development.

- [archive/IMPLEMENTATION_PLAN.md](archive/IMPLEMENTATION_PLAN.md)
- [archive/E2E_TEST_RESULTS.md](archive/E2E_TEST_RESULTS.md) – E2E test run snapshot
- [archive/FEATURE_COMPLETE.md](archive/FEATURE_COMPLETE.md) – Feature completion notes
- [archive/DRAG_DROP_IMPLEMENTATION_SUMMARY.md](archive/DRAG_DROP_IMPLEMENTATION_SUMMARY.md) – Drag-and-drop implementation summary
- [archive/ADK_AND_AI_AGENT_ANALYSIS.md](archive/ADK_AND_AI_AGENT_ANALYSIS.md) – ADK vs current AI analysis
- [archive/ADMIN_AI_ASSISTANT_DOCUMENTATION.md](archive/ADMIN_AI_ASSISTANT_DOCUMENTATION.md) – Admin AI assistant standalone doc
- [archive/TRAINING_AI_SUMMARY.md](archive/TRAINING_AI_SUMMARY.md) – Player training AI summary
- [archive/IMPLEMENTATION_AUDIT_REPORT.md](archive/IMPLEMENTATION_AUDIT_REPORT.md) – Implementation audit report

## Stack (verified)

- Backend: Express.js (port 8080), JWT auth, Stripe payments, file storage
- Frontend: Next.js 14, React 18, Tailwind CSS (custom teal primary + lime accent palette)
- Payments: Stripe (PaymentIntent + Payment Element), $40/hr court booking fee for logged-in users
- AI: Google Gemini 3 Flash Preview (`gemini-3-flash-preview`)
- AI Agents: Public chat, Admin booking assistant, Orchestrator (Ace) training coach
- Coaching journals: coach notes and player feedback (dashboard Journal, optional link from bookings)
