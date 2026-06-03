# Admin AI Assistant

**Natural-language booking management for administrators.**

---

## Overview

The Admin AI Assistant is an intelligent conversational interface that allows tennis club administrators to manage court reservations using natural language instead of manual drag-and-drop or form-based interactions.

### Key Capabilities

- **Natural Language**: "Move the 10 AM booking to tomorrow at 2 PM"
- **Conflict Detection**: Automatically warns about scheduling conflicts
- **Admin Override**: Can cancel conflicting bookings with confirmation
- **Search & Find**: Find bookings by date, court, member name, or ID
- **Availability Checking**: Ask about court availability
- **Confirmation Flow**: Always confirms before making changes

---

## Setup Requirements

### Environment Configuration

The Admin AI Assistant requires Google Generative AI API credentials in **`backend/.env`**:

```env
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_GENAI_USE_VERTEXAI=false
GOOGLE_GENAI_MODEL=gemini-3.5-flash
```

**Important Notes:**
- Never commit `backend/.env` to version control (already in `.gitignore`)
- If you see "API key was reported as leaked", generate a new key from [Google Cloud Console](https://console.cloud.google.com/)
- Restart the backend server after updating environment variables

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────┐
│         Admin Bookings Page                 │
│  (app/dashboard/admin/bookings/page.tsx)   │
└──────────────────┬──────────────────────────┘
                   │
     ┌─────────────▼──────────────┐
     │  AdminAIAssistant          │
     │  (Frontend Component)      │
     │  - Chat UI                 │
     │  - Message history         │
     │  - Conflict highlighting   │
     └─────────────┬──────────────┘
                   │ HTTP POST /api/admin/chat
                   ▼
     ┌─────────────────────────────┐
     │  Admin Chat API Endpoint    │
     │  - Auth: Admin only         │
     │  - Token verification       │
     │  - Role check              │
     └─────────────┬───────────────┘
                   │
                   ▼
     ┌─────────────────────────────┐
     │  Admin AI Agent             │
     │  (backend/lib/admin-ai-agent.ts)│
     │  - Gemini 3.5 Flash   │
     │  - Custom booking tools     │
     │  - Conflict detection       │
     │  - Reservation management   │
     └─────────────┬───────────────┘
                   │
                   ▼
     ┌─────────────────────────────┐
     │  Reservation Repository     │
     │  - CRUD operations          │
     │  - File-based storage       │
     │  - Conflict checking        │
     └─────────────────────────────┘
```

---

## Features

### 1. Search & Find Reservations

**Natural Language Examples:**
- "Show me all bookings for today"
- "Find reservations for Court 1"
- "Who has bookings tomorrow?"
- "Search for John Smith's booking"
- "Show me the booking with ID 1770..."

**Tool Used:** `searchReservations`
- Searches by date, court ID, or member name
- Returns list of matching reservations
- Shows full details (court, time, member, status)

### 2. Move/Reschedule Bookings

**Natural Language Examples:**
- "Move the 10 AM Court 1 booking to tomorrow at 2 PM"
- "Reschedule John Smith's booking to next Monday"
- "Change the 3 PM booking on Court 2 to Court 3"
- "Move booking ID 1770... to Friday at 4 PM"

**Tool Used:** `moveReservation`
- Extracts reservation ID, new date/time/court
- Checks for conflicts BEFORE moving
- If conflict found: Warns admin and asks what to do
- If no conflict: Moves booking immediately

**Conflict Handling:**
- ⚠️ Detects overlapping bookings
- 🚨 Highlights conflict in yellow
- 🤝 Asks admin for decision:
  - Cancel conflicting booking
  - Choose different time
  - Keep existing unchanged

### 3. Cancel Reservations

**Natural Language Examples:**
- "Cancel the 10 AM booking on Court 1"
- "Delete John Smith's reservation"
- "Cancel booking ID 1770..."
- "Remove the 2 PM booking tomorrow"

**Tool Used:** `cancelReservation`
- Finds the target reservation
- Sets status to "cancelled"
- Confirms cancellation with details

### 4. Check Availability

**Natural Language Examples:**
- "Is Court 1 available tomorrow at 3 PM?"
- "Show me available times on Monday"
- "What courts are free today after 5 PM?"
- "Check availability for next week"

**Tool Used:** `checkAvailability`
- Queries reservation system
- Returns list of available slots
- Shows court name, date, and time ranges

### 5. Admin Override (Conflict Resolution)

**Natural Language Example:**
- *Agent*: "⚠️ CONFLICT: Court 1 is already booked by Jane Doe..."
- *Admin*: "Override and cancel Jane's booking"
- *Agent*: [Uses `overrideConflictAndMove`]

**Tool Used:** `overrideConflictAndMove`
- Cancels the conflicting reservation
- Moves the target reservation to new slot
- Logs "[Admin override]" in notes
- Confirms both actions

---

## AI Agent Tools

### Available Function Declarations

#### 1. `searchReservations`
```typescript
{
  date?: string;        // YYYY-MM-DD
  courtId?: string;     // Court ID
  searchTerm?: string;  // Name or booking ID
}
```
**Returns**: List of matching reservations with full details

#### 2. `getReservationDetails`
```typescript
{
  reservationId: string; // Required
}
```
**Returns**: Full reservation details (court, date, time, member, payment)

#### 3. `checkAvailability`
```typescript
{
  date: string;          // Required: YYYY-MM-DD
  courtId?: string;      // Optional
}
```
**Returns**: List of available time slots

#### 4. `moveReservation`
```typescript
{
  reservationId: string;  // Required
  newDate?: string;       // YYYY-MM-DD
  newTimeStart?: string;  // HH:mm
  newTimeEnd?: string;    // HH:mm
  newCourtId?: string;    // Court ID
  notes?: string;         // Optional
}
```
**Returns**: 
- Success: Details of moved reservation
- Conflict: Warning message with conflicting booking info

#### 5. `cancelReservation`
```typescript
{
  reservationId: string;  // Required
  reason?: string;        // Optional
}
```
**Returns**: Confirmation of cancellation

#### 6. `overrideConflictAndMove`
```typescript
{
  reservationId: string;           // Target to move
  conflictingReservationId: string; // To cancel
  newDate: string;                 // YYYY-MM-DD
  newTimeStart: string;            // HH:mm
  newTimeEnd: string;              // HH:mm
  newCourtId: string;              // Court ID
}
```
**Returns**: Details of cancelled booking + moved booking

#### 7. `listAllCourts`
```typescript
{}  // No parameters
```
**Returns**: List of all courts with ID, name, type, availability

---

## Security & Authorization

### Admin-Only Access

✅ **Authentication Required**
- Endpoint: `POST /api/admin/chat`
- Requires: Valid JWT token
- Middleware: `authenticate` + `requireRole("admin")`

✅ **Role Check**
```typescript
app.post("/api/admin/chat", 
  authenticate,           // Verify token
  requireRole("admin"),   // Check role = "admin"
  async (req, res) => { ... }
);
```

✅ **Frontend Guard**
- Component only renders if `token` exists
- Only visible on admin pages (`/dashboard/admin/bookings`)

### No Public Access
- Regular users cannot access admin chat
- Protected by same auth as admin booking page
- 403 Forbidden for non-admin users

---

## Conflict Detection & Resolution

### How Conflicts Are Detected

```typescript
async function checkMoveConflict(
  reservationId: string,
  newDate: string,
  newTimeStart: string,
  newTimeEnd: string,
  newCourtId: string
): Promise<ConflictInfo>
```

**Logic:**
1. Get all reservations from system
2. Filter out the reservation being moved (no self-conflict)
3. Filter out cancelled reservations
4. Check for same date + same court + overlapping time
5. Return conflict info with details

### Conflict Resolution Flow

```
Admin: "Move booking X to slot Y"
         ↓
Agent: Calls moveReservation tool
         ↓
Backend: Checks for conflicts
         ↓
    [Conflict Found?]
         ↓
    Yes → Returns conflict warning
         ↓
Agent: "⚠️ CONFLICT: Court 1 already booked by Jane..."
       "What would you like to do?"
         ↓
Admin: "Cancel Jane's booking and move mine there"
         ↓
Agent: Calls overrideConflictAndMove
         ↓
Backend: 1. Cancels Jane's booking
         2. Moves admin's booking
         3. Adds "[Admin override]" note
         ↓
Agent: "✓ Done! Cancelled Jane's booking. Your booking moved."
```

---

## UI/UX Design

### Component: `AdminAIAssistant.tsx`

**Location**: Floating button (bottom-right corner)

**States:**
1. **Closed**: Pulsing teal button with icon (`primary-600`)
2. **Open**: Chat window (450×650px) with teal gradient header
3. **Loading**: Animated dots while AI thinks
4. **Conflict**: Yellow-highlighted message with ⚠️ warning

### Visual Elements

- **Gradient Header**: Teal (`primary-600` → `primary-700`)
- **Toggle Button**: Teal gradient (`primary-600` → `primary-500`)
- **User Messages**: Right-aligned, teal gradient background
- **AI Messages**: Left-aligned, white background
- **Quick Action Chips**: `primary-50` background with `primary-700` text
- **Conflict Messages**: Yellow border + warning icon
- **Loading**: Bouncing teal dots animation
- **Send Button**: Teal gradient (`primary-600` → `primary-500`)
- **Input Focus Ring**: `primary-500`

### Accessibility

- Focus management (auto-focus input when opened)
- Keyboard support (Enter to send)
- ARIA labels for buttons
- Semantic HTML structure
- Color contrast for readability

---

## Example Conversations

### Example 1: Simple Move (No Conflict)

**Admin**: "Move the 10 AM booking on Court 1 tomorrow to 2 PM"

**AI**: "I found a booking on Court 1 at 10:00-11:00 for tomorrow. Let me check if 2 PM is available..."

**AI**: "✓ No conflicts! I've moved the booking to 2:00 PM on Court 1. The reservation is now scheduled for tomorrow at 2:00 PM - 3:00 PM."

### Example 2: Conflict Detected

**Admin**: "Move John Smith's booking to Monday at 3 PM on Court 2"

**AI**: "I found John Smith's booking. Checking Monday at 3 PM on Court 2..."

**AI**: "⚠️ CONFLICT: Court 2 is already booked on Monday at 3:00 PM - 4:00 PM by Jane Doe (jane@example.com). Booking ID: 1770298290220.

What would you like to do?
- Choose a different time
- Cancel Jane's booking and move John's there
- Keep everything as is"

**Admin**: "Cancel Jane's booking and move John there"

**AI**: "✓ Done! I've cancelled Jane Doe's booking and moved John Smith's reservation to Monday at 3:00 PM on Court 2. Jane will need to be notified about the cancellation."

### Example 3: Availability Check

**Admin**: "Is Court 3 available on Friday afternoon?"

**AI**: "Let me check Friday's availability for Court 3..."

**AI**: "Court 3 is available on Friday at:
- 2:00 PM - 3:00 PM
- 3:00 PM - 4:00 PM  
- 4:00 PM - 5:00 PM
- 6:00 PM - 7:00 PM

Would you like to book any of these slots?"

### Example 4: Search

**Admin**: "Show me all bookings for today"

**AI**: "Here are today's confirmed bookings:

1. Court 1, 9:00 AM - 10:00 AM  
   Member: John Smith (john@example.com)
   
2. Court 2, 2:00 PM - 3:00 PM  
   Guest: Jane Doe (jane@example.com)
   
3. Court 3, 4:00 PM - 5:00 PM  
   Member: Bob Johnson (bob@example.com)

Total: 3 bookings today"

---

## Technical Implementation

### Model Configuration

**From `backend/.env`:**
```env
GOOGLE_GENAI_MODEL=gemini-3.5-flash
```

**Initialization:**
```typescript
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const modelName = process.env.GOOGLE_GENAI_MODEL || "gemini-3.5-flash";

const model = genAI.getGenerativeModel({
  model: modelName,
  tools: [...adminBookingTools]
});
```

### System Context

```typescript
const ADMIN_BOOKING_CONTEXT = `
You are an AI assistant helping tennis club administrators 
manage court reservations at Providence Tennis Academy.

Your role:
- Help admins find, view, and modify court reservations
- Move/reschedule bookings when requested
- Check for conflicts before making changes
- Warn about conflicts but allow admin override if requested
- Provide clear confirmation of all actions
...
`;
```

### Conversation History

- Keeps last **15 messages** (more than regular chat's 10)
- Filters invalid messages
- Maps roles (user → user, assistant → model)
- Includes system context as first message

### Error Handling

```typescript
try {
  const result = await chatWithAdminAgent(message, history, adminId);
  return res.json({
    response: result.response,
    needsConfirmation: result.needsConfirmation,
    conflictInfo: result.conflictInfo
  });
} catch (error) {
  console.error("Error in admin chat API:", error);
  return res.status(500).json({
    error: error.message || "Failed to process admin chat message"
  });
}
```

---

## Testing

### Manual Testing Steps

1. **Access Admin Page**
   - Navigate to `/dashboard/admin/bookings`
   - Sign in as admin user
   - See floating AI button (bottom-right)

2. **Open AI Assistant**
   - Click the pulsing teal button
   - Chat window opens with welcome message

3. **Test Search**
   - Type: "Show me all bookings for today"
   - Verify: List of bookings appears

4. **Test Move (No Conflict)**
   - Type: "Move the [time] booking to [new time]"
   - Verify: Booking moves successfully
   - Check: Calendar reflects the change

5. **Test Move (With Conflict)**
   - Type: "Move booking to an occupied slot"
   - Verify: ⚠️ Conflict warning appears
   - Verify: Yellow highlighting
   - Verify: Details of conflicting booking shown

6. **Test Override**
   - After conflict warning
   - Type: "Cancel the conflicting booking"
   - Verify: Both actions complete
   - Verify: Success confirmation

7. **Test Availability**
   - Type: "Is Court 1 available tomorrow at 3 PM?"
   - Verify: Availability info appears

8. **Test Cancel**
   - Type: "Cancel the [time] booking"
   - Verify: Cancellation confirmed
   - Check: Booking status = "cancelled"

### Automated Testing (Future)

```typescript
// Unit tests for admin-ai-agent.ts
describe("Admin AI Agent", () => {
  test("searches reservations by date", async () => { ... });
  test("detects conflicts when moving", async () => { ... });
  test("overrides conflict with admin permission", async () => { ... });
  test("cancels reservations", async () => { ... });
});

// Integration tests
describe("Admin Chat API", () => {
  test("requires admin authentication", async () => { ... });
  test("rejects non-admin users", async () => { ... });
  test("handles tool calls correctly", async () => { ... });
});
```

---

## Troubleshooting

### Common Issues

#### 1. AI Button Not Appearing
**Cause**: Not signed in as admin  
**Solution**: Verify admin role in account settings

#### 2. "Failed to get response"
**Cause**: Backend server down or API key invalid  
**Solution**: 
- Check backend is running (port 8080)
- Verify `GOOGLE_API_KEY` in `backend/.env`
- Check browser console for errors
- If you see "API key was reported as leaked", generate a new key from Google Cloud Console

#### 3. Conflicts Not Detecting
**Cause**: Database out of sync  
**Solution**: Refresh the admin page to reload reservations

#### 4. "Unknown function call" Error
**Cause**: Tool name mismatch  
**Solution**: Check tool declarations match handler names

#### 5. Override Not Working
**Cause**: Confirmation message not recognized  
**Solution**: Be explicit: "Cancel the conflicting booking and move mine"

### Debug Mode

**Enable Logging:**
```typescript
// In admin-ai-agent.ts
console.log(`[Admin AI] Tool called: ${call.name}`, args);
```

**Check Network Tab:**
- POST `/api/admin/chat`
- Status: 200 OK
- Response: `{ response, needsConfirmation, conflictInfo }`

---

## Future Enhancements

### Potential Features

1. **Multi-Step Workflows**
   - "Move all of John's bookings to next week"
   - "Cancel all bookings for tomorrow afternoon"

2. **Batch Operations**
   - "Show me all cancellations this week"
   - "Move all Court 1 bookings to Court 2"

3. **Smart Suggestions**
   - AI suggests alternative times when conflict detected
   - "Court 1 is taken, but Court 2 is free at the same time"

4. **Voice Commands**
   - Speech-to-text integration
   - "Hey AI, move the 10 AM booking..."

5. **Undo/Redo**
   - "Undo the last change"
   - Action history with rollback

6. **Notifications**
   - Automatically email affected members
   - SMS notifications for cancellations

7. **Analytics**
   - "How many bookings were moved this month?"
   - "Which court has the most cancellations?"

8. **Integration with Calendar**
   - Export to Google Calendar
   - Sync with Outlook

---

## Best Practices

### For Admins

✅ **Be Specific**
- Include date, time, court number
- Use member names or booking IDs
- Example: "Move John Smith's 10 AM Court 1 booking tomorrow"

✅ **Confirm Changes**
- Review AI's response before confirming
- Check conflict warnings carefully
- Verify details match your intent

✅ **Use for Complex Tasks**
- Multi-step operations
- Finding bookings across dates
- Handling conflicts quickly

✅ **Fallback to Manual**
- If AI doesn't understand, use drag-and-drop
- Complex scenarios may need manual intervention

### For Developers

✅ **Tool Design**
- Keep tools focused and single-purpose
- Return structured data for AI to parse
- Include helpful error messages

✅ **Context Management**
- Provide clear system instructions
- Include relevant business rules
- Update context as features change

✅ **Error Handling**
- Graceful degradation
- Helpful error messages for users
- Log errors for debugging

✅ **Testing**
- Test all tool combinations
- Verify conflict detection thoroughly
- Test with real booking data

---

## Conclusion

The Admin AI Assistant revolutionizes booking management by providing a natural, conversational interface for administrative tasks. It combines the power of Gemini 3 Flash with custom booking tools to create an intelligent, context-aware system that understands admin intent and helps manage conflicts efficiently.

**Key Benefits:**
- ⚡ Faster than manual drag-and-drop
- 🛡️ Built-in conflict detection
- 🤖 Natural language interface
- 🔒 Admin-only security
- ✅ Always confirms changes

**Production Ready:** ✅  
**Last Updated:** February 6, 2026  
**Version:** 1.1.0
