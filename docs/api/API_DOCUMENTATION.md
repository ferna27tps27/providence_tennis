# Reservation System API Documentation

**Version:** 1.1  
**Date:** February 6, 2026  
**Base URL:** `http://localhost:8080`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Endpoints](#endpoints)
   - [Courts](#courts)
   - [Availability](#availability)
   - [Reservations](#reservations)
   - [Payments](#payments)
   - [Config](#config)
   - [Chat](#chat)
   - [Admin Chat](#admin-chat)
   - [Orchestrator Chat](#orchestrator-chat)
   - [Journal](#journal)
5. [Data Models](#data-models)
6. [Error Codes](#error-codes)
7. [Examples](#examples)

---

## Overview

The Reservation System API provides endpoints for managing tennis court reservations, checking availability, and interacting with an AI assistant for customer support.

### Features

- ✅ Court availability checking with caching
- ✅ Reservation creation with conflict detection
- ✅ Reservation updates and cancellations
- ✅ Time range overlap detection
- ✅ Concurrency control (file locking)
- ✅ Stripe payment integration (PaymentIntent + Payment Element for court bookings)
- ✅ AI-powered chat assistant (public)
- ✅ Admin AI booking assistant (natural-language booking management)
- ✅ Orchestrator AI agent (Ace – training plans, journal analysis, player management)
- ✅ Coaching journals (create, list, filter, update, delete; coach/player roles)

---

## Authentication

Most reservation, availability, and chat endpoints do not require authentication. **Journal endpoints** require a valid session: send `Authorization: Bearer <token>` (JWT from sign-in). Create is restricted to `coach` or `admin`; list/get/update/delete are restricted by ownership (coaches see their entries, players see entries about them).

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE" // Optional, for specific error types
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `409` - Conflict (e.g., time slot already reserved)
- `500` - Internal Server Error
- `503` - Service Unavailable (lock timeout)

---

## Endpoints

### Courts

#### Get All Courts

**GET** `/api/courts`

Returns a list of all available courts.

**Response:** `200 OK`

```json
[
  {
    "id": "1",
    "name": "Court 1",
    "type": "clay",
    "available": true
  },
  {
    "id": "2",
    "name": "Court 2",
    "type": "clay",
    "available": true
  }
]
```

---

### Availability

#### Get Availability by Date

**GET** `/api/availability?date=YYYY-MM-DD`

Returns availability for all courts on a specific date.

**Query Parameters:**
- `date` (required) - Date in `YYYY-MM-DD` format

**Response:** `200 OK`

```json
{
  "date": "2026-01-24",
  "availability": [
    {
      "courtId": "1",
      "courtName": "Court 1",
      "courtType": "clay",
      "slots": [
        {
          "start": "08:00",
          "end": "09:00",
          "available": true
        },
        {
          "start": "09:00",
          "end": "10:00",
          "available": false
        }
      ]
    }
  ]
}
```

**Error Responses:**

- `400 Bad Request` - Missing or invalid date format
```json
{
  "error": "Date parameter is required"
}
```

- `500 Internal Server Error` - Server error
```json
{
  "error": "Failed to fetch availability"
}
```

**Notes:**
- Results are cached for 30 seconds for performance
- Time slots are 1-hour intervals from 08:00 to 21:00
- Availability considers confirmed reservations only

---

### Reservations

#### Get All Reservations

**GET** `/api/reservations`

Returns all reservations, or filtered by date if `date` query parameter is provided.

**Query Parameters:**
- `date` (optional) - Filter by date in `YYYY-MM-DD` format

**Response:** `200 OK`

```json
[
  {
    "id": "1234567890",
    "courtId": "1",
    "courtName": "Court 1",
    "date": "2026-01-24",
    "timeSlot": {
      "start": "10:00",
      "end": "11:00"
    },
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "401-555-1234",
    "notes": "First time player",
    "status": "confirmed",
    "createdAt": "2026-01-24T10:00:00.000Z"
  }
]
```

#### Get Reservation by ID

**GET** `/api/reservations/:id`

Returns a specific reservation by ID.

**Path Parameters:**
- `id` (required) - Reservation ID

**Response:** `200 OK`

```json
{
  "id": "1234567890",
  "courtId": "1",
  "courtName": "Court 1",
  "date": "2026-01-24",
  "timeSlot": {
    "start": "10:00",
    "end": "11:00"
  },
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "401-555-1234",
  "notes": "First time player",
  "status": "confirmed",
  "createdAt": "2026-01-24T10:00:00.000Z"
}
```

**Error Responses:**

- `404 Not Found`
```json
{
  "error": "Reservation not found",
  "code": "NOT_FOUND"
}
```

#### Create Reservation

**POST** `/api/reservations`

Creates a new reservation with conflict detection.

**Request Body:**

```json
{
  "courtId": "1",
  "date": "2026-01-24",
  "timeSlot": {
    "start": "10:00",
    "end": "11:00"
  },
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "401-555-1234",
  "notes": "First time player" // Optional
}
```

**Required Fields:**
- `courtId` - Court ID (must exist)
- `date` - Date in `YYYY-MM-DD` format
- `timeSlot.start` - Start time in `HH:mm` format
- `timeSlot.end` - End time in `HH:mm` format
- `customerName` - Customer's full name
- `customerEmail` - Valid email address
- `customerPhone` - Phone number

**Response:** `201 Created`

```json
{
  "id": "1234567890",
  "courtId": "1",
  "courtName": "Court 1",
  "date": "2026-01-24",
  "timeSlot": {
    "start": "10:00",
    "end": "11:00"
  },
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "401-555-1234",
  "notes": "First time player",
  "status": "confirmed",
  "createdAt": "2026-01-24T10:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request` - Missing required fields or validation error
```json
{
  "error": "Missing required fields"
}
```

- `404 Not Found` - Court doesn't exist
```json
{
  "error": "Court not found"
}
```

- `409 Conflict` - Time slot already reserved
```json
{
  "error": "Time slot 10:00-11:00 conflicts with existing reservation 10:30-11:30",
  "code": "CONFLICT"
}
```

- `503 Service Unavailable` - Lock timeout
```json
{
  "error": "Service temporarily unavailable. Please try again.",
  "code": "LOCK_ERROR"
}
```

**Notes:**
- Time slots are checked for overlaps (not just exact matches)
- Example: `10:00-11:00` conflicts with `10:30-11:30`
- File locking prevents race conditions
- Cache is automatically invalidated for the reservation date

#### Update Reservation

**PUT** `/api/reservations/:id`

Updates an existing reservation.

**Path Parameters:**
- `id` (required) - Reservation ID

**Request Body:**

```json
{
  "customerName": "Jane Doe",
  "timeSlot": {
    "start": "14:00",
    "end": "15:00"
  },
  "notes": "Updated notes"
}
```

All fields are optional. Only provided fields will be updated.

**Response:** `200 OK`

```json
{
  "id": "1234567890",
  "courtId": "1",
  "courtName": "Court 1",
  "date": "2026-01-24",
  "timeSlot": {
    "start": "14:00",
    "end": "15:00"
  },
  "customerName": "Jane Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "401-555-1234",
  "notes": "Updated notes",
  "status": "confirmed",
  "createdAt": "2026-01-24T10:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
```json
{
  "error": "Invalid email format"
}
```

- `404 Not Found` - Reservation doesn't exist
```json
{
  "error": "Reservation with id 1234567890 not found",
  "code": "NOT_FOUND"
}
```

- `409 Conflict` - Updated time slot conflicts
```json
{
  "error": "Updated time slot 14:00-15:00 conflicts with existing reservation 14:30-15:30",
  "code": "CONFLICT"
}
```

- `503 Service Unavailable` - Lock timeout
```json
{
  "error": "Service temporarily unavailable. Please try again.",
  "code": "LOCK_ERROR"
}
```

**Notes:**
- If `courtId` is updated, `courtName` is automatically updated
- Time slot updates are checked for conflicts
- Cache is invalidated for both old and new dates (if date changes)

#### Cancel Reservation

**DELETE** `/api/reservations/:id`

Cancels (soft deletes) a reservation by setting status to "cancelled".

**Path Parameters:**
- `id` (required) - Reservation ID

**Response:** `200 OK`

```json
{
  "message": "Reservation cancelled successfully"
}
```

**Error Responses:**

- `404 Not Found` - Reservation doesn't exist
```json
{
  "error": "Reservation not found"
}
```

- `503 Service Unavailable` - Lock timeout
```json
{
  "error": "Service temporarily unavailable. Please try again.",
  "code": "LOCK_ERROR"
}
```

**Notes:**
- Cancelled reservations are not returned in availability queries
- Cache is automatically invalidated for the reservation date

---

### Payments

The payment flow uses Stripe PaymentIntents. Authenticated users pay **$40.00** per court booking. Guest bookings do not require payment.

#### Create Payment Intent

**POST** `/api/payments/create-intent`

**Auth:** Required (any authenticated user).

Creates a Stripe PaymentIntent for a court booking. Call this after the reservation is created but before collecting card details.

**Request Body:**

```json
{
  "amount": 40,
  "reservationId": "reservation-id",
  "description": "Court booking - Court 1, Feb 10 2026 10:00-11:00"
}
```

**Required Fields:**
- `amount` - Amount in dollars (e.g. `40` for $40.00)

**Optional Fields:**
- `reservationId` - ID of the associated reservation
- `description` - Human-readable description of the charge

**Response:** `200 OK`

```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

**Error Responses:**

- `400 Bad Request` - Missing amount
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error`

---

#### Confirm Payment

**POST** `/api/payments/confirm`

**Auth:** Required (any authenticated user).

Confirms a payment after the client-side Stripe Payment Element completes. Updates the payment record and links it to the reservation.

**Request Body:**

```json
{
  "paymentIntentId": "pi_xxx",
  "reservationId": "reservation-id"
}
```

**Required Fields:**
- `paymentIntentId` - The Stripe PaymentIntent ID returned from create-intent

**Optional Fields:**
- `reservationId` - Links the payment to a reservation

**Response:** `200 OK`

```json
{
  "id": "payment-uuid",
  "memberId": "member-uuid",
  "amount": 40,
  "status": "completed",
  "stripePaymentIntentId": "pi_xxx",
  "reservationId": "reservation-id",
  "createdAt": "2026-02-06T10:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request` - Missing paymentIntentId
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error`

---

### Config

#### Get Stripe Publishable Key

**GET** `/api/config/stripe`

Returns the Stripe publishable key for initializing Stripe.js on the frontend. No authentication required.

**Response:** `200 OK`

```json
{
  "publishableKey": "pk_test_..."
}
```

**Error Responses:**

- `503 Service Unavailable` - Stripe is not configured (key missing from backend env)
```json
{
  "error": "Stripe is not configured"
}
```

**Notes:**
- The publishable key is stored in `backend/.env` as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- The frontend fetches this key at runtime via the API (no frontend env file needed)

---

### Chat

#### Chat with AI Assistant

**POST** `/api/chat`

Interacts with the AI assistant for customer support.

**Request Body:**

```json
{
  "message": "What are your hours?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Hello"
    },
    {
      "role": "assistant",
      "content": "Hello! How can I help you?"
    }
  ]
}
```

**Required Fields:**
- `message` - User's message (string)

**Optional Fields:**
- `conversationHistory` - Array of previous messages for context

**Response:** `200 OK`

```json
{
  "response": "We're open from 8 AM to 9 PM daily.",
  "sources": [
    "https://example.com/hours"
  ]
}
```

**Error Responses:**

- `400 Bad Request`
```json
{
  "error": "Message is required"
}
```

- `500 Internal Server Error`
```json
{
  "error": "Failed to process chat message"
}
```

---

### Admin Chat

#### Chat with Admin AI Assistant

**POST** `/api/admin/chat`

Admin-only endpoint for natural-language booking management (search, move, cancel, availability, conflict resolution).

**Auth:** Required. Role: `admin`.

**Request Body:**

```json
{
  "message": "Move the 10 AM booking on Court 1 to 2 PM",
  "conversationHistory": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help?" }
  ]
}
```

**Required Fields:**
- `message` - User's message (string)

**Optional Fields:**
- `conversationHistory` - Array of previous messages for context

**Response:** `200 OK`

```json
{
  "response": "I've moved the booking to 2:00 PM.",
  "needsConfirmation": false,
  "conflictInfo": null
}
```

**Error Responses:**

- `403 Forbidden` - Non-admin user
- `500 Internal Server Error`

See [admin-assistant.md](../agents/admin-assistant.md) for tool details and example conversations.

---

### Orchestrator Chat

#### Chat with Orchestrator AI (Ace)

**POST** `/api/orchestrator/chat`

Unified AI assistant for training plans, journal analysis, and player management. Serves all authenticated roles (admin, coach, player).

**Auth:** Required (any authenticated user).

**Request Body:**

```json
{
  "message": "Create a training plan for me",
  "conversationHistory": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! I'm Ace..." }
  ]
}
```

**Required Fields:**
- `message` - User's message (string)

**Optional Fields:**
- `conversationHistory` - Array of previous messages for context

**Response:** `200 OK`

```json
{
  "response": "I've created a personalized training plan..."
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error`

**Note:** The legacy endpoint `POST /api/training/chat` still works and delegates to the orchestrator.

See [orchestrator.md](../agents/orchestrator.md) for tool details and example conversations.

---

### Journal

Coaching journal entries let coaches record session summaries, areas worked on, and pointers for the next session. Players can view entries about themselves. All journal endpoints require authentication (`Authorization: Bearer <token>`).

#### Create Journal Entry

**POST** `/api/journal/entries`

**Auth:** Required. Role: `coach` or `admin`.

**Request Body:**

```json
{
  "playerId": "member-uuid",
  "reservationId": "optional-booking-id",
  "sessionDate": "2026-02-05",
  "sessionTime": "10:00",
  "summary": "Worked on backhand and serve",
  "areasWorkedOn": ["backhand", "serve"],
  "pointersForNextSession": "Focus on follow-through; bring spare balls next time.",
  "additionalNotes": "Optional notes"
}
```

**Required:** `playerId`, `sessionDate` (YYYY-MM-DD), `summary`, `areasWorkedOn` (array), `pointersForNextSession`.  
**Optional:** `reservationId`, `sessionTime` (HH:mm), `additionalNotes`.

**Response:** `201 Created` — returns the created `JournalEntry` (includes `id`, `coachId`, `createdAt`, `lastModified`, etc.).

**Error Responses:** `400` (validation), `403` (not coach/admin), `503` (lock).

---

#### Get Journal Entries (List with Filters)

**GET** `/api/journal/entries`

**Auth:** Required. Players see only their own entries; coaches see their entries (optionally filtered by player); admins see all.

**Query Parameters:**

| Parameter     | Description                          |
|---------------|--------------------------------------|
| `playerId`    | Filter by player (coach/admin)       |
| `playerName`  | Filter by player name (substring)    |
| `coachId`     | Filter by coach                      |
| `coachName`   | Filter by coach name (substring)     |
| `startDate`   | From date (YYYY-MM-DD)              |
| `endDate`     | To date (YYYY-MM-DD)                |
| `areaWorkedOn`| Filter by focus area                 |

**Response:** `200 OK`

```json
{
  "entries": [
    {
      "id": "entry-uuid",
      "playerId": "member-uuid",
      "coachId": "coach-uuid",
      "sessionDate": "2026-02-05",
      "summary": "Worked on backhand and serve",
      "areasWorkedOn": ["backhand", "serve"],
      "pointersForNextSession": "Focus on follow-through.",
      "createdAt": "2026-02-05T12:00:00.000Z",
      "lastModified": "2026-02-05T12:00:00.000Z",
      "coachName": "Jane Coach",
      "playerName": "John Player"
    }
  ],
  "total": 1
}
```

---

#### Get Journal Entry by ID

**GET** `/api/journal/entries/:id`

**Auth:** Required. Caller must be the coach who wrote the entry or the player the entry is about (or admin).

**Response:** `200 OK` — single `JournalEntry` (with optional `coachName`, `playerName`).

**Error Responses:** `403` (not allowed), `404` (not found).

---

#### Update Journal Entry

**PUT** `/api/journal/entries/:id`

**Auth:** Required. Only the coach who created the entry (or admin) can update.

**Request Body:** Partial `JournalEntryRequest` (e.g. `summary`, `areasWorkedOn`, `pointersForNextSession`, `sessionDate`, `sessionTime`, `additionalNotes`). Only provided fields are updated.

**Response:** `200 OK` — updated `JournalEntry` (with optional `coachName`, `playerName`).

**Error Responses:** `400` (validation), `403` (not owner), `404` (not found), `503` (lock).

---

#### Delete Journal Entry

**DELETE** `/api/journal/entries/:id`

**Auth:** Required. Only the coach who created the entry (or admin) can delete.

**Response:** `204 No Content` on success.

**Error Responses:** `403` (not allowed), `404` (not found), `503` (lock).

---

## Data Models

### Reservation

```typescript
interface Reservation {
  id: string;                    // Auto-generated timestamp ID
  courtId: string;               // Court ID
  courtName: string;             // Court name (auto-populated)
  date: string;                  // YYYY-MM-DD format
  timeSlot: {
    start: string;               // HH:mm format
    end: string;                 // HH:mm format
  };
  customerName: string;          // Customer's full name
  customerEmail: string;        // Valid email address
  customerPhone: string;        // Phone number
  notes?: string;               // Optional notes
  status: "confirmed" | "cancelled";
  createdAt: string;            // ISO 8601 timestamp
}
```

### Court

```typescript
interface Court {
  id: string;
  name: string;
  type: "clay" | "hard" | "grass";
  available: boolean;
}
```

### Availability Slot

```typescript
interface AvailabilitySlot {
  start: string;      // HH:mm format
  end: string;        // HH:mm format
  available: boolean; // true if slot is free
}
```

### Availability Response

```typescript
interface AvailabilityResponse {
  date: string;       // YYYY-MM-DD format
  availability: Array<{
    courtId: string;
    courtName: string;
    courtType: string;
    slots: AvailabilitySlot[];
  }>;
}
```

### Payment

```typescript
interface Payment {
  id: string;                           // Auto-generated UUID
  memberId: string;                     // Member who made the payment
  amount: number;                       // Amount in dollars
  status: "pending" | "completed" | "failed" | "refunded";
  stripePaymentIntentId?: string;       // Stripe PaymentIntent ID
  reservationId?: string;               // Linked reservation
  description?: string;                 // Charge description
  createdAt: string;                    // ISO 8601 timestamp
}
```

### Journal Entry

```typescript
interface JournalEntry {
  id: string;
  playerId: string;
  coachId: string;
  reservationId?: string;
  sessionDate: string;           // YYYY-MM-DD
  sessionTime?: string;          // HH:mm
  summary: string;
  areasWorkedOn: string[];
  pointersForNextSession: string;
  additionalNotes?: string;
  createdAt: string;            // ISO 8601
  lastModified: string;         // ISO 8601
  createdBy: string;
  coachName?: string;           // Enriched by API
  playerName?: string;          // Enriched by API
}
```

### Journal Entry Request (create/update)

```typescript
interface JournalEntryRequest {
  playerId: string;
  reservationId?: string;
  sessionDate: string;         // YYYY-MM-DD
  sessionTime?: string;        // HH:mm
  summary: string;
  areasWorkedOn: string[];
  pointersForNextSession: string;
  additionalNotes?: string;
}
```

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `CONFLICT` | Time slot conflict | 409 |
| `LOCK_ERROR` | Could not acquire file lock | 503 |
| `NOT_FOUND` | Resource not found | 404 |
| `UNAUTHORIZED` | Not authorized for this resource (e.g. journal) | 403 |
| `VALIDATION_ERROR` | Input validation failed | 400 |

---

## Examples

### Example: Create a Reservation

```bash
curl -X POST http://localhost:8080/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "courtId": "1",
    "date": "2026-01-24",
    "timeSlot": {
      "start": "10:00",
      "end": "11:00"
    },
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "401-555-1234",
    "notes": "First time player"
  }'
```

### Example: Check Availability

```bash
curl http://localhost:8080/api/availability?date=2026-01-24
```

### Example: Update Reservation

```bash
curl -X PUT http://localhost:8080/api/reservations/1234567890 \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Jane Doe",
    "notes": "Updated notes"
  }'
```

### Example: Cancel Reservation

```bash
curl -X DELETE http://localhost:8080/api/reservations/1234567890
```

### Example: Create Payment Intent

```bash
curl -X POST http://localhost:8080/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "amount": 40,
    "reservationId": "1234567890",
    "description": "Court booking - Court 1"
  }'
```

### Example: Confirm Payment

```bash
curl -X POST http://localhost:8080/api/payments/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "paymentIntentId": "pi_xxx",
    "reservationId": "1234567890"
  }'
```

### Example: JavaScript/TypeScript

```typescript
// Create reservation
const response = await fetch('http://localhost:8080/api/reservations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    courtId: '1',
    date: '2026-01-24',
    timeSlot: {
      start: '10:00',
      end: '11:00',
    },
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '401-555-1234',
  }),
});

const reservation = await response.json();

// Check availability
const availabilityResponse = await fetch(
  'http://localhost:8080/api/availability?date=2026-01-24'
);
const availability = await availabilityResponse.json();
```

---

## Rate Limiting

Currently, there is no rate limiting implemented. This may be added in future versions.

---

## Caching

Availability queries are cached for **30 seconds** to improve performance. The cache is automatically invalidated when:
- A reservation is created
- A reservation is updated
- A reservation is cancelled

---

## Concurrency

The API uses file-based locking to prevent race conditions when multiple requests try to modify reservations simultaneously. If a lock cannot be acquired within 5 seconds, a `503 Service Unavailable` error is returned.

---

**Last Updated:** February 6, 2026
