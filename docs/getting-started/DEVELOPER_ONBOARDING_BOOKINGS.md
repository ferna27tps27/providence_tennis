# Developer Onboarding: Members and Book-a-Court

This document explains the business goal, the member model, and how the book-a-court system works end-to-end (frontend and backend). It is aimed at new developers joining the project.

## Business Goal (Why This Exists)
- Provide a fast self-service booking experience for members and guests.
- Prevent double-booking and enforce court availability constraints.
- Keep member profiles and booking history consistent for support and operations.
- Enable admins to oversee all bookings and resolve issues quickly.

## Core Concepts

### Member
- A registered user with a profile and role (player, coach, parent, admin).
- Members are stored in a file-backed repository (`backend/data/members.json`).
- Authentication returns a member object plus a session token (JWT).

### Reservation (Booking)
- Represents a court/time slot reservation.
- Stored in `backend/data/reservations.json`.
- Can be either:
  - Member reservation (`memberId` set), or
  - Guest reservation (guest/customer fields set)
- Status: `confirmed` or `cancelled`.

### Courts and Availability
- Courts are stored in `backend/data/courts.json` and initialized automatically if missing.
- Availability is computed per date by comparing all reservations for that day and applying time overlap detection.

## Backend: Members

### Member creation and validation
- `backend/src/lib/members.ts` is the business layer for member management.
- `createMember` validates data, normalizes role, and writes to repository.
- `validateMemberActive` is used before creating member-linked reservations.

### Authentication flow
- `backend/src/lib/auth/auth.ts` implements sign-up/sign-in:
  - Sign-up validates password strength, creates a member, and sets role.
  - Sign-in verifies password, sets a session, and issues a token.
- `backend/src/lib/auth/auth-middleware.ts` handles token verification and role-based access.

Key files:
- `backend/src/lib/members.ts`
- `backend/src/lib/auth/auth.ts`
- `backend/src/lib/auth/auth-middleware.ts`

## Backend: Book-a-Court System

### Availability
`getAvailabilityByDate`:
- Loads courts + reservations for the date.
- Generates 60-minute slots from 08:00 to 21:00.
- Marks slots as unavailable if any reservation overlaps.
Files:
- `backend/src/lib/reservations.ts`
- `backend/src/lib/utils/time-ranges.ts`

### Create reservation
`createReservation`:
- If `memberId` is provided, validates the member is active.
- Otherwise validates guest name/email/phone.
- Looks up the court to set `courtName`.
- Writes a `confirmed` reservation to the repository.
- Invalidates availability cache for the reservation date.
Files:
- `backend/src/lib/reservations.ts`
- `backend/src/lib/repositories/file-reservation-repository.ts`

### Cancel reservation
`cancelReservation`:
- Marks the reservation as cancelled.
- If a payment exists, applies cancellation policy and attempts a refund.
- For member reservations, increments penalty cancellations.
File:
- `backend/src/lib/reservations.ts`

### Reservation endpoints (public/member)
- `GET /api/availability?date=YYYY-MM-DD`
- `POST /api/reservations` (creates booking; supports memberId or guest fields)
- `GET /api/members/me/reservations` (member-only list)
File:
- `backend/src/app.ts`

### Payment endpoints (authenticated)
- `POST /api/payments/create-intent` — creates a Stripe PaymentIntent (amount in dollars, optional reservationId/description)
- `POST /api/payments/confirm` — confirms payment after client-side Stripe flow completes (paymentIntentId, optional reservationId)
- `GET /api/config/stripe` — returns the Stripe publishable key for initializing Stripe.js (no auth required)
Files:
- `backend/src/app.ts` (routes)
- `backend/src/lib/payments/payments.ts` (business logic)
- `backend/src/lib/payments/stripe-client.ts` (Stripe API wrapper)
- `backend/src/lib/payments/payment-processor.ts` (orchestration)

### Admin reservation endpoints
Admin-only endpoints (require `admin` role):
- `GET /api/admin/reservations` (filters by date/status/court/search)
- `POST /api/admin/reservations` (create reservation)
- `PATCH /api/admin/reservations/:id` (edit date/time/court/notes or cancel)
- `DELETE /api/admin/reservations/:id` (cancel)
File:
- `backend/src/app.ts`

## Backend: Coaching Journals

Coaching journals let coaches record session summaries, focus areas, and pointers for the next session. Players can view entries about themselves.

### Journal data and storage
- Journal entries are stored in `backend/data/journal-entries.json` (path respects `DATA_DIR` when set).
- File-based repository with locking: `backend/src/lib/repositories/file-journal-repository.ts`.
- Business logic and authorization: `backend/src/lib/journal.ts`.

### Journal endpoints (authenticated)
- `POST /api/journal/entries` — create entry (coach or admin only).
- `GET /api/journal/entries` — list with filters (playerId, coachId, startDate, endDate, areaWorkedOn; players see only their own).
- `GET /api/journal/entries/:id` — get one (coach who wrote it or player it’s about).
- `PUT /api/journal/entries/:id` — update (coach who created or admin).
- `DELETE /api/journal/entries/:id` — delete (coach who created or admin).

Files:
- `backend/src/app.ts` (routes), `backend/src/lib/journal.ts`, `backend/src/types/journal.ts`, `backend/src/lib/errors/journal-errors.ts`

## Frontend: Auth and Member Context

### Auth state
The auth context:
- Stores `user` and `token` in localStorage.
- Refreshes the current user on load.
File:
- `lib/auth/auth-context.tsx`

### Role gating
Protected routes enforce role access (admin-only pages).
File:
- `lib/auth/protected-route.tsx`

## Frontend: Book-a-Court Flow

### Booking UI component
`components/CourtReservation.tsx` is the core booking UI.

**Flow for guest users (no payment):**
1. Date selection (future dates only).
2. Court/time selection based on availability.
3. Details step (name, email, phone).
4. POST to `/api/reservations` → confirmation.

**Flow for authenticated users (with Stripe payment — $40.00/hr):**
1. Date selection (future dates only).
2. Court/time selection based on availability.
3. Details step (member info prefilled; shows $40.00 price).
4. Reservation created on server via POST `/api/reservations` (to lock the slot).
5. Payment Intent created via POST `/api/payments/create-intent`.
6. **Payment step** — `StripePaymentForm` renders the Stripe Payment Element for card entry.
7. On successful payment, POST `/api/payments/confirm` links the payment to the reservation.
8. Confirmation step shows "Payment Successful" with amount paid.

Key behaviors:
- Uses `useAuth` to attach `memberId` and auth header.
- Handles conflict errors (409) by returning to selection and refreshing availability.
- Stripe publishable key is fetched at runtime from `GET /api/config/stripe` (not embedded in frontend env).
- The progress indicator shows 5 steps for logged-in users (Date → Court → Details → Payment → Confirmation) vs 4 for guests.
Files:
- `components/CourtReservation.tsx` (main booking flow, payment orchestration)
- `components/StripePaymentForm.tsx` (Stripe Elements wrapper, dynamic key loading)
- `lib/api/payment-api.ts` (createPaymentIntent, confirmPaymentOnServer)

### Member bookings page
The member bookings page:
- Loads `GET /api/members/me/reservations`.
- Filters upcoming/past/cancelled in the client.
File:
- `app/(dashboard)/bookings/page.tsx`

## Frontend: Admin Bookings Dashboard

### Admin UI
The admin view lives at `/dashboard/admin/bookings`.
Features:
- Summary metrics (total/confirmed/cancelled)
- Filters (date range, status, court, search)
- **Table View**: Edit reservation (date/time/court/notes), cancel reservation
- **Calendar View**: Weekly drag-and-drop grid for moving bookings between dates/times

### Calendar View (Drag-and-Drop)
Admins can toggle between Table View and Calendar View. The calendar shows a weekly grid (Mon–Sun, 08:00–21:00) with color-coded booking blocks per court.

**Drag-and-drop flow:**
1. Drag a booking block from one time slot to another.
2. Frontend performs a **per-court conflict check** (same court + same date + same time = conflict).
3. On drop, the local state is **optimistically updated** (block moves instantly, no loading spinner).
4. A `PATCH /api/admin/reservations/:id` call updates the backend.
5. Data is silently refreshed in the background; on failure the state is reverted.

Files:
- `app/dashboard/admin/bookings/page.tsx` (page, view toggle, `handleCalendarUpdate` with optimistic update)
- `lib/api/admin-booking-api.ts`
- `components/admin/BookingCalendarGrid.tsx` (weekly grid, DndContext, conflict check)
- `components/admin/DraggableBookingBlock.tsx` (individual booking card, drag handle)
- `components/admin/CalendarTimeSlot.tsx` (droppable cell, visual drop feedback)

### Navigation
Admins see the "Admin Bookings" link in the dashboard sidebar.
File:
- `components/dashboard/DashboardLayout.tsx`

## Frontend: Coaching Journals

### Journal in the dashboard
- All dashboard users see a **Journal** item in the sidebar (`/dashboard/journal`).
- **Coaches:** `CoachJournalView` — list entries (with filters by player, date range, area), create new entries, edit/delete their own. Optional draft in `localStorage`.
- **Players:** `PlayerJournalView` — read-only list of entries about them (filter by coach, dates, area).
- **Create from booking:** In the bookings list, coaches see "Create Journal Entry" on a booking; it opens `CoachJournalForm` in a modal with player and optional reservation pre-filled.

Files:
- `app/dashboard/journal/page.tsx`, `app/(dashboard)/journal/page.tsx`
- `components/journal/CoachJournalView.tsx`, `components/journal/CoachJournalForm.tsx`, `components/journal/PlayerJournalView.tsx`, `components/journal/JournalEntryCard.tsx`
- `components/dashboard/BookingCard.tsx` (journal button and modal)
- `lib/api/journal-api.ts`

## Data Model Summary

### Member (stored in `backend/data/members.json`)
- `id`, `memberNumber`, `firstName`, `lastName`, `email`, `phone`
- `role` (`player|coach|parent|admin`)
- `isActive`, `emailVerified`

### Reservation (stored in `backend/data/reservations.json`)
- `id`, `courtId`, `courtName`, `date`, `timeSlot`
- `memberId` (optional)
- `guestName/guestEmail/guestPhone` (optional)
- `customerName/customerEmail/customerPhone` (legacy compatibility)
- `status` (`confirmed|cancelled`)
- `paymentId`, `paymentStatus`, `paymentAmount` (optional — populated after Stripe payment)

### Payment (stored in `backend/data/payments.json`)
- `id`, `memberId`, `amount`, `status` (`pending|completed|failed|refunded`)
- `stripePaymentIntentId` (Stripe PI ID)
- `reservationId` (linked booking)
- `description`, `createdAt`

### Journal entry (stored in `backend/data/journal-entries.json`)
- `id`, `playerId`, `coachId`, `reservationId` (optional), `sessionDate`, `sessionTime` (optional)
- `summary`, `areasWorkedOn` (array), `pointersForNextSession`, `additionalNotes` (optional)
- `createdAt`, `lastModified`, `createdBy`

## How to Trace a Booking (End-to-End)

**Guest booking:**
1. UI form (`CourtReservation`) builds reservation data.
2. `POST /api/reservations` validates, writes to repository, returns booking.
3. Confirmation step shown immediately.

**Authenticated booking (with payment):**
1. UI form (`CourtReservation`) builds reservation data.
2. `POST /api/reservations` validates, writes to repository, returns booking (slot locked).
3. `POST /api/payments/create-intent` creates a Stripe PaymentIntent; returns `clientSecret`.
4. `StripePaymentForm` renders the Stripe Payment Element; user enters card details.
5. `stripe.confirmPayment()` runs client-side via Stripe.js.
6. `POST /api/payments/confirm` records the completed payment in the backend.
7. Confirmation step shows payment success.

**Viewing bookings:**
- Member bookings page requests `/api/members/me/reservations`.
- Admin dashboard requests `/api/admin/reservations`.

## How to Trace a Journal Entry (End-to-End)
1. Coach opens Journal from sidebar or "Create Journal Entry" on a booking; `CoachJournalForm` submits to `POST /api/journal/entries`.
2. Backend validates, ensures player/coach exist, writes to file repository.
3. Coach/player Journal page requests `GET /api/journal/entries` (with optional filters); entries may be enriched with coach/player names.

## AI Agents

The application includes three AI agents. All use Google Gemini 3 Flash Preview.

### Public Assistant
- Available on every page via the floating chat button (`components/AIAssistant.tsx`).
- Answers questions about facility info, programs, and tennis topics with web search.
- API route: `app/api/chat/route.ts` → `lib/ai-agent.ts`.

### Admin Booking Assistant
- Accessible from the admin bookings page (`/dashboard/admin/bookings`).
- Natural-language booking management: search, move, cancel, availability, conflict resolution.
- Backend: `POST /api/admin/chat` → `backend/src/lib/admin-ai-agent.ts`.

### Orchestrator (Ace)
- Unified training coach for all roles (admin, coach, player).
- Creates personalized training plans, analyzes journal entries, manages players.
- Accessible via the floating chat button on dashboard pages (`components/admin/AdminAIAssistant.tsx`).
- Admin users get a toggle to switch between Training Coach mode and Booking Manager mode.
- Backend: `POST /api/orchestrator/chat` → `backend/src/lib/orchestrator-agent.ts`.
- Legacy endpoint `POST /api/training/chat` delegates to the orchestrator.

See [AI Agents docs](../agents/README.md) for detailed documentation.

## Design System

The app uses a custom teal/lime color palette defined in `tailwind.config.ts`. All UI components reference the `primary-*` and `accent-*` tokens via Tailwind classes.

- **Primary (teal):** Used for buttons, headers, badges, toggles, focus rings, gradients.
- **Accent (lime):** Used for decorative highlights.
- **Semantic colors:** Red (errors/cancellations), yellow (warnings/conflicts), green (success/confirmed) are not overridden.

See [TECHNICAL_REFERENCE.md](../TECHNICAL_REFERENCE.md) for the full color table.

## Key Files Index
- Frontend booking UI: `components/CourtReservation.tsx`
- Stripe payment form: `components/StripePaymentForm.tsx`
- Payment API client: `lib/api/payment-api.ts`
- Member bookings UI: `app/(dashboard)/bookings/page.tsx`
- Admin bookings UI: `app/dashboard/admin/bookings/page.tsx`
- Admin calendar (drag-and-drop): `components/admin/BookingCalendarGrid.tsx`, `DraggableBookingBlock.tsx`, `CalendarTimeSlot.tsx`
- Journal UI: `components/journal/CoachJournalView.tsx`, `CoachJournalForm.tsx`, `PlayerJournalView.tsx`, `lib/api/journal-api.ts`
- AI Chat (public): `components/AIAssistant.tsx`, `app/api/chat/route.ts`, `lib/ai-agent.ts`
- AI Chat (admin/training): `components/admin/AdminAIAssistant.tsx`
- Orchestrator agent: `backend/src/lib/orchestrator-agent.ts`
- Admin AI agent: `backend/src/lib/admin-ai-agent.ts`
- Auth context: `lib/auth/auth-context.tsx`
- Backend reservations: `backend/src/lib/reservations.ts`
- Backend members: `backend/src/lib/members.ts`
- Backend payments: `backend/src/lib/payments/payments.ts`, `backend/src/lib/payments/stripe-client.ts`, `backend/src/lib/payments/payment-processor.ts`
- Backend journal: `backend/src/lib/journal.ts`, `backend/src/lib/repositories/file-journal-repository.ts`
- Backend endpoints: `backend/src/app.ts`
- Tailwind config: `tailwind.config.ts`
