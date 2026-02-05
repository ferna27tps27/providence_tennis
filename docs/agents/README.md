# AI Agents

Documentation for all AI-powered features in Providence Tennis Academy.

| Agent | Doc | Description |
|-------|-----|-------------|
| **Public Assistant** | [public-assistant.md](public-assistant.md) | Website chat: facility info, reservations, tennis Q&A. Uses Gemini with web search. |
| **Admin Assistant** | [admin-assistant.md](admin-assistant.md) | Admin-only: natural-language booking management (move, cancel, find, availability). |
| **Player Training Assistant** | [player-training-assistant.md](player-training-assistant.md) | Personalized tennis training coach. Analyzes journal entries, provides data-driven recommendations, creates training plans. |

All agents use Google Gemini. See each doc for setup, env vars, and usage.

## Dual-Mode Chat Interface

The **Admin/Training Assistant** is a single component that automatically switches modes:
- **Admin Mode**: Natural language booking management
- **Player Mode**: Personalized training recommendations based on journal analysis

The mode is detected automatically based on the logged-in user's role.
