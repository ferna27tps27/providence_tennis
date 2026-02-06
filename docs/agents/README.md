# AI Agents

Documentation for all AI-powered features in Providence Tennis Academy.

| Agent | Doc | Description |
|-------|-----|-------------|
| **Public Assistant** | [public-assistant.md](public-assistant.md) | Website chat: facility info, reservations, tennis Q&A. Uses Gemini with web search. |
| **Admin Assistant** | [admin-assistant.md](admin-assistant.md) | Admin-only: natural-language booking management (move, cancel, find, availability). |
| **Orchestrator (Ace)** | [orchestrator.md](orchestrator.md) | Unified training coach: personalized plans, journal analysis, player management. Serves all roles. |

All agents use Google Gemini 3 Flash Preview. See each doc for setup, env vars, and usage.

## Dual-Mode Chat Interface

The **Admin AI Assistant** (`AdminAIAssistant.tsx`) is a single component that supports two modes:

- **Training Mode** (Ace): Personalized training recommendations, plan creation, journal analysis. Routes to `/api/orchestrator/chat`.
- **Booking Mode**: Natural language booking management. Routes to `/api/admin/chat`.

**Mode selection:**
- **Admins** see a toggle in the chat header to switch between Training Coach and Booking Manager.
- **Coaches and players** are locked to Training Mode (no toggle).

The mode is detected automatically based on the logged-in user's role.

## Legacy Agents

| Agent | Status | Replacement |
|-------|--------|-------------|
| **Player Training Assistant** | Legacy | Replaced by Orchestrator (Ace). The `/api/training/chat` endpoint still works but delegates to the orchestrator. See [player-training-assistant.md](player-training-assistant.md) for historical reference. |
