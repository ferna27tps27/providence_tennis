# Technical Reference Guide

Single source of truth for ports, URLs, configuration, and design system.

## Architecture

- **Backend:** Express.js on port **8080**
- **Frontend:** Next.js 14 on port **3009**
- **Storage:** JSON files in `backend/data/`
- **Payments:** Stripe (PaymentIntent API + Payment Element UI)
- **AI:** Google Gemini 3 Flash Preview (`gemini-3-flash-preview`)

## Ports

| Service | Port |
|---------|------|
| Backend API | 8080 |
| Frontend | 3009 |

## API Base URL

- Development: `http://localhost:8080`

## Environment Variables

**All environment variables live in `backend/.env`** (single source of truth):  
`PORT`, `JWT_SECRET`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `GOOGLE_API_KEY`, `GOOGLE_GENAI_MODEL`, SMTP vars, `FRONTEND_URL`

> **Note:** The Stripe publishable key is served to the frontend at runtime via `GET /api/config/stripe`. The frontend API base URL defaults to `http://localhost:8080` and does not require a separate env file.

See [env.sample](../env.sample) at project root for reference.

## Data Files

- `backend/data/members.json`
- `backend/data/reservations.json`
- `backend/data/payments.json`
- `backend/data/courts.json`
- `backend/data/journal-entries.json` (coaching journal entries; path uses `DATA_DIR` when set)
- `backend/data/training-plans.json` (AI-generated training plans)

## Design System

### Color Palette

Defined in `tailwind.config.ts`. All UI components use these tokens via Tailwind classes (`primary-600`, `accent-400`, etc.).

**Primary (teal):**

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-50` | `#f0fdfa` | Light backgrounds, hover states |
| `primary-100` | `#ccfbf1` | Tag backgrounds, badges |
| `primary-200` | `#99f6e4` | Borders, dividers |
| `primary-300` | `#5eead4` | Decorative accents |
| `primary-400` | `#2dd4bf` | Secondary buttons |
| `primary-500` | `#14b8a6` | Gradient endpoints |
| `primary-600` | `#0d9488` | Primary buttons, headers, gradients |
| `primary-700` | `#0f766e` | Hover states, gradient endpoints |
| `primary-800` | `#115e59` | Dark text on light primary backgrounds |
| `primary-900` | `#134e4a` | Darkest text |

**Accent (lime):**

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-400` | `#a3e635` | Highlight accents |
| `accent-500` | `#84cc16` | Secondary accent |
| `accent-600` | `#65a30d` | Accent buttons |

### Color Usage Guidelines

- **Buttons:** `bg-primary-600 hover:bg-primary-700`
- **Gradients:** `from-primary-600 to-primary-700` (headers, hero sections)
- **Active toggles:** `bg-primary-600 text-white`
- **Badges/tags:** `bg-primary-100 text-primary-800`
- **Focus rings:** `focus:ring-primary-500`
- **Info panels:** `bg-primary-50 border-primary-200`
- **Semantic colors** (not overridden): red for errors/cancellations, yellow for warnings, green for success/confirmed
- **Third-party brand colors** are kept as-is (e.g., Facebook blue)
- **Homepage accent cards** use intentionally varied gradients for visual differentiation

## Running Tests

```bash
cd backend && npm run test:all
```

See [TESTING_STRATEGY.md](TESTING_STRATEGY.md) for full testing guide.
