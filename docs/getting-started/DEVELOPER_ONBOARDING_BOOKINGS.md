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
Flow:
1. Date selection (future dates only).
2. Court/time selection based on availability.
3. Details step (member info prefilled if signed in).
4. POST to `/api/reservations` with:
   - `memberId` (if signed in)
   - `customerName/email/phone` (guest or fallback)

Key behaviors:
- Uses `useAuth` to attach `memberId` and auth header.
- Handles conflict errors (409) by returning to selection and refreshing availability.
File:
- `components/CourtReservation.tsx`

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
- Edit reservation (date/time/court/notes)
- Cancel reservation

Files:
- `app/dashboard/admin/bookings/page.tsx`
- `lib/api/admin-booking-api.ts`

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
- `paymentId`, `paymentStatus`, `paymentAmount` (optional)

### Journal entry (stored in `backend/data/journal-entries.json`)
- `id`, `playerId`, `coachId`, `reservationId` (optional), `sessionDate`, `sessionTime` (optional)
- `summary`, `areasWorkedOn` (array), `pointersForNextSession`, `additionalNotes` (optional)
- `createdAt`, `lastModified`, `createdBy`

## How to Trace a Booking (End-to-End)
1. UI form (`CourtReservation`) builds reservation data.
2. `POST /api/reservations` validates, writes to repository, returns booking.
3. Member bookings page requests `/api/members/me/reservations`.
4. Admin dashboard requests `/api/admin/reservations`.

## How to Trace a Journal Entry (End-to-End)
1. Coach opens Journal from sidebar or "Create Journal Entry" on a booking; `CoachJournalForm` submits to `POST /api/journal/entries`.
2. Backend validates, ensures player/coach exist, writes to file repository.
3. Coach/player Journal page requests `GET /api/journal/entries` (with optional filters); entries may be enriched with coach/player names.

## Key Files Index
- Frontend booking UI: `components/CourtReservation.tsx`
- Member bookings UI: `app/(dashboard)/bookings/page.tsx`
- Admin bookings UI: `app/dashboard/admin/bookings/page.tsx`
- Journal UI: `components/journal/CoachJournalView.tsx`, `CoachJournalForm.tsx`, `PlayerJournalView.tsx`, `lib/api/journal-api.ts`
- Auth context: `lib/auth/auth-context.tsx`
- Backend reservations: `backend/src/lib/reservations.ts`
- Backend members: `backend/src/lib/members.ts`
- Backend journal: `backend/src/lib/journal.ts`, `backend/src/lib/repositories/file-journal-repository.ts`
- Backend endpoints: `backend/src/app.ts`
