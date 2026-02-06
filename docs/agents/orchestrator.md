# Orchestrator AI Agent (Ace)

**Unified AI tennis coach and player management assistant.**

---

## Overview

The Orchestrator Agent ("Ace") is the primary AI assistant for training and player management. It replaces the legacy player-training agent with a unified, role-aware system that serves admins, coaches, and players from a single entry point.

### Key Capabilities

- **Personalized Training Plans**: Creates data-driven plans based on journal analysis
- **Journal Entry Logging**: Automatically saves generated plans as journal entries
- **Player Management** (admin/coach): Search, list, and create players
- **Progress Analysis**: Analyzes journal entries to track improvement over time
- **Role-Aware Behavior**: Adapts prompts, tools, and UX based on user role

---

## Architecture

```
┌─────────────────────────────────┐
│   AdminAIAssistant Component    │
│   (components/admin/)           │
│   - Mode toggle (admin only)    │
│   - Role-based welcome message  │
│   - Quick action chips          │
└──────────────┬──────────────────┘
               │
          Detect chatMode + userRole
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
Training Mode        Booking Mode
(all roles)          (admin only)
    │                     │
    ▼                     ▼
POST /api/          POST /api/
orchestrator/chat   admin/chat
    │                     │
    ▼                     ▼
Orchestrator Agent   Admin AI Agent
(orchestrator-       (admin-ai-
 agent.ts)            agent.ts)
```

### Request Flow

1. User sends a message from the chat UI
2. Frontend routes to `/api/orchestrator/chat` (training mode) or `/api/admin/chat` (booking mode)
3. Backend authenticates the user and passes `userId`, `userRole`, and `userName` to the orchestrator
4. Orchestrator builds a role-specific system prompt and selects available tools
5. Gemini processes the message, optionally calling tools in an agentic loop
6. Response is returned to the frontend

---

## Setup Requirements

Same as other AI agents — requires Google Gemini API key in **`backend/.env`**:

```env
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_GENAI_USE_VERTEXAI=false
GOOGLE_GENAI_MODEL=gemini-3-flash-preview
```

---

## Tools

### Training Tools (all roles)

| Tool | Description |
|------|-------------|
| `getPlayerJournalAnalytics` | Analyzes a player's journal history (areas, trends, pointers) |
| `getPlayerProfile` | Fetches basic player profile information |
| `getPlayerTrainingHistory` | Retrieves past training plans for the player |
| `createTrainingPlanForPlayer` | Creates a new personalized training plan |
| `createJournalEntryForPlan` | Saves a training plan as a journal entry |

### Admin/Coach Tools (admin and coach only)

| Tool | Description |
|------|-------------|
| `searchPlayersByName` | Finds members by name search |
| `listAllPlayers` | Lists all active players |
| `createNewPlayer` | Creates a new player member (admin only) |

---

## Role-Based Behavior

### Admin
- Access to **all** tools (training + admin tools)
- Can create plans for any player by name: "Create a plan for Jose"
- Can create new player accounts
- Mode toggle in chat header: **Training Coach** / **Booking Manager**

### Coach
- Access to training tools + search/list players
- Can create plans for their players
- No mode toggle (training mode only)

### Player
- Access to training tools only (scoped to own data)
- Requests plans for themselves: "Create a plan for me"
- No player search/management tools
- Plans are automatically logged as journal entries

---

## How Plans Are Logged

When the orchestrator creates a training plan, it follows a two-step process:

1. **`createTrainingPlanForPlayer`** — generates the plan content (focus areas, drills, goals)
2. **`createJournalEntryForPlan`** — saves it directly to the journal repository

The journal entry creation bypasses the standard `createJournalEntry` business logic (which requires coach/admin role) to allow AI-generated entries for any authenticated user. The entry is marked with `createdBy: "ai-orchestrator-{userId}"`.

---

## API Endpoint

### POST `/api/orchestrator/chat`

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

**Response:**
```json
{
  "response": "I've created a personalized training plan for you..."
}
```

The legacy endpoint `POST /api/training/chat` still works and delegates to the orchestrator.

---

## Frontend Component

### `AdminAIAssistant.tsx`

**Location:** `components/admin/AdminAIAssistant.tsx`

**Position:** Floating button (bottom-right corner) on all dashboard pages.

**UI Elements:**
- **Toggle button:** Teal gradient (`primary-600` to `primary-500`), pulsing indicator
- **Chat header:** Teal gradient (`primary-600` to `primary-700`)
- **Mode toggle** (admin only): Training Coach / Booking Manager tabs
- **User messages:** Teal gradient background, right-aligned
- **AI messages:** White background with gray border, left-aligned
- **Quick action chips:** Light teal (`primary-50`) with teal text/border
- **Send button:** Teal gradient
- **Input focus ring:** `primary-500`
- **Loading animation:** Three bouncing teal dots

### Welcome Messages (by role)

- **Admin:** "Hi! I'm Ace... I can help you manage players and create personalized training plans."
- **Coach:** "Hi! I'm Ace... I can help you create training plans for your players."
- **Player:** "Hi! I'm Ace... I'm here to help you improve your game with personalized training plans."

---

## Example Conversations

### Admin creates a plan for a player

**Admin:** "Create a training plan for Nico Fireball"

**Ace:** Calls `searchPlayersByName` → finds Nico → calls `getPlayerJournalAnalytics` → analyzes 5 sessions → calls `createTrainingPlanForPlayer` → calls `createJournalEntryForPlan`

**Ace:** "I've created a training plan for Nico: **Patience & Strategic Point Building**. Focus areas: Strategy, Serve Placement, Consistency. This has been logged as a journal entry."

### Player requests their own plan

**Player:** "Create a plan for me please"

**Ace:** Calls `getPlayerProfile` → calls `getPlayerJournalAnalytics` → creates plan → logs journal entry

**Ace:** "I've created your **Foundation & Consistency** plan with drills and weekly goals. It's been saved to your journal!"

---

## Files

| File | Purpose |
|------|---------|
| `backend/src/lib/orchestrator-agent.ts` | Core orchestrator logic, tools, agentic loop |
| `backend/src/app.ts` | API endpoint (`/api/orchestrator/chat`) |
| `components/admin/AdminAIAssistant.tsx` | Frontend chat component |

---

## Troubleshooting

### "Failed to get response from AI"
- Check backend is running (port 8080)
- Verify `GOOGLE_API_KEY` in `backend/.env`
- Check backend logs for Gemini API errors

### Plan not appearing in journal
- Verify the `createJournalEntryForPlan` tool was called (check backend logs)
- Refresh the journal page after the plan is created

### Player can't create plans
- Ensure the player is authenticated (valid JWT)
- The orchestrator bypasses role checks for AI-generated journal entries

---

**Last Updated:** February 6, 2026
**Version:** 1.0.0
