# Technical Reference Guide

Single source of truth for ports, URLs, and configuration.

## Architecture

- **Backend:** Express.js on port **8080**
- **Frontend:** Next.js 14 on port **3009**
- **Storage:** JSON files in `backend/data/`
- **AI:** Google Gemini 3 Flash Preview (`gemini-3-flash-preview`)

## Ports

| Service | Port |
|---------|------|
| Backend API | 8080 |
| Frontend | 3009 |

## API Base URL

- Development: `http://localhost:8080`

## Environment Variables

**Backend (`.env` in backend):**  
`PORT`, `JWT_SECRET`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `GOOGLE_API_KEY`, `GOOGLE_GENAI_MODEL`, SMTP vars, `FRONTEND_URL`

**Frontend (`.env.local`):**  
`GOOGLE_API_KEY`, `GOOGLE_GENAI_USE_VERTEXAI`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_BASE_URL`

See [env.sample](../env.sample) at project root (copy sections to `.env.local` and `backend/.env`).

## Data Files

- `backend/data/members.json`
- `backend/data/reservations.json`
- `backend/data/payments.json`
- `backend/data/courts.json`
- `backend/data/journal-entries.json` (coaching journal entries; path uses `DATA_DIR` when set)

## Running Tests

```bash
cd backend && npm run test:all
```

See [TESTING_STRATEGY.md](TESTING_STRATEGY.md) for full testing guide.
