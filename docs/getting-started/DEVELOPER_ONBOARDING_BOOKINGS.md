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

## How to Trace a Booking (End-to-End)
1. UI form (`CourtReservation`) builds reservation data.
2. `POST /api/reservations` validates, writes to repository, returns booking.
3. Member bookings page requests `/api/members/me/reservations`.
4. Admin dashboard requests `/api/admin/reservations`.

## Key Files Index
- Frontend booking UI: `components/CourtReservation.tsx`
- Member bookings UI: `app/(dashboard)/bookings/page.tsx`
- Admin bookings UI: `app/dashboard/admin/bookings/page.tsx`
- Auth context: `lib/auth/auth-context.tsx`
- Backend reservations: `backend/src/lib/reservations.ts`
- Backend members: `backend/src/lib/members.ts`
- Backend endpoints: `backend/src/app.ts`
