# Documentation

Developer documentation for Providence Tennis Academy. Everything here is aimed at helping a new developer learn and work on the project.

## Quick links

- **[Technical Reference](TECHNICAL_REFERENCE.md)** – Ports, env vars, architecture
- **[API Reference](api/API_DOCUMENTATION.md)** – Backend API
- **[Testing Strategy](TESTING_STRATEGY.md)** – How to run and write tests
- **[Getting Started](getting-started/DEVELOPER_ONBOARDING_BOOKINGS.md)** – Onboarding and book-a-court flow
- **[AI Agents](agents/README.md)** – Public assistant + Admin assistant (setup and usage for both)

## Configuration

- **[env.sample](../env.sample)** (root) – Single file with all env vars; copy the frontend section to `.env.local` and the backend section to `backend/.env`

## Archive (historical / one-off reports)

Reference only; not needed for day-to-day development.

- [archive/IMPLEMENTATION_PLAN.md](archive/IMPLEMENTATION_PLAN.md)
- [archive/E2E_TEST_RESULTS.md](archive/E2E_TEST_RESULTS.md) – E2E test run snapshot
- [archive/FEATURE_COMPLETE.md](archive/FEATURE_COMPLETE.md) – Feature completion notes
- [archive/DRAG_DROP_IMPLEMENTATION_SUMMARY.md](archive/DRAG_DROP_IMPLEMENTATION_SUMMARY.md) – Drag-and-drop implementation summary
- [archive/ADK_AND_AI_AGENT_ANALYSIS.md](archive/ADK_AND_AI_AGENT_ANALYSIS.md) – ADK vs current AI analysis

## Stack (verified)

- Backend: Express.js (port 8080), JWT auth, Stripe, file storage
- Frontend: Next.js 14, React 18, Tailwind
- AI: Gemini 3 Flash Preview
- Coaching journals: coach notes and player feedback (dashboard Journal, optional link from bookings)
