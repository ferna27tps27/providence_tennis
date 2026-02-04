# Reservation System API Documentation

**Version:** 1.0  
**Date:** January 24, 2026  
**Base URL:** `http://localhost:3001` (or your configured port)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Endpoints](#endpoints)
   - [Courts](#courts)
   - [Availability](#availability)
   - [Reservations](#reservations)
   - [Chat](#chat)
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
- ✅ AI-powered chat assistant

---

## Authentication

Currently, the API does not require authentication. This may be added in future versions.

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

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `CONFLICT` | Time slot conflict | 409 |
| `LOCK_ERROR` | Could not acquire file lock | 503 |
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Input validation failed | 400 |

---

## Examples

### Example: Create a Reservation

```bash
curl -X POST http://localhost:3001/api/reservations \
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
curl http://localhost:3001/api/availability?date=2026-01-24
```

### Example: Update Reservation

```bash
curl -X PUT http://localhost:3001/api/reservations/1234567890 \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Jane Doe",
    "notes": "Updated notes"
  }'
```

### Example: Cancel Reservation

```bash
curl -X DELETE http://localhost:3001/api/reservations/1234567890
```

### Example: JavaScript/TypeScript

```typescript
// Create reservation
const response = await fetch('http://localhost:3001/api/reservations', {
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
  'http://localhost:3001/api/availability?date=2026-01-24'
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

**Last Updated:** January 24, 2026
