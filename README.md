# Providence Tennis Academy - Modern Web Application

A modern, responsive web application for Providence Tennis Academy built with Next.js, React, and Tailwind CSS, featuring improved UI/UX design, court reservation system, summer camp landing pages, and AI-powered assistant.

## Features

- 🎨 Modern, clean UI with gradient accents and smooth animations
- 📱 Fully responsive design (mobile, tablet, desktop)
- ⚡ Fast performance with Next.js 14
- 🎭 Smooth animations using Framer Motion
- 🎯 Enhanced user experience with intuitive navigation
- 🌈 Beautiful color scheme with custom Tailwind configuration
- 🤖 **AI Assistant** - Google Gemini-powered chat assistant with web search capabilities
- 🎾 **Court Reservation System** - Modern booking interface for court time reservations
- 🏕️ **Summer Camp Flow** - Dedicated landing page, local registration, and payment handoff
- 👥 **Member Management** - Complete authentication and member dashboard system
- 💳 **Payment Processing** - Stripe integration for court bookings and membership fees
- ✉️ **Contact Inbox** - Contact form submissions stored in the backend and surfaced in admin
- 🔧 **RESTful API** - Express.js backend with full CRUD operations
- ⚡ **Performance Optimized** - In-memory caching and file locking for concurrency
- 🖼️ **Optimized Images** - WebP and JPEG formats with Next.js Image optimization

## Current Implementation Notes

- The public summer camp experience now lives on `/summer-camp` and uses a local registration flow instead of CourtReserve.
- Summer camp registrations are stored in the backend and can be paid through the existing Stripe-backed deposit flow.
- The contact form now posts to the backend and the admin inbox lives at `/dashboard/admin/contact-submissions`.
- The frontend is a Next.js app and the API server is a separate Express app in `backend/`; use `NEXT_PUBLIC_API_BASE_URL` if you point the frontend somewhere other than `http://localhost:8080`.
- Newsletter signup is still a placeholder for now and will be connected to a mailbox or mailing service later.

## Tech Stack

### Frontend
- **Next.js 14** - React framework for production with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library

### Backend
- **Express.js Server** - RESTful API server running on port 8080
- **Hybrid Persistence** - Prisma/Postgres when `DATABASE_URL` is set, JSON file fallback otherwise
- **Google Generative AI** - Gemini 3 Flash Preview for AI assistant with Google Search grounding

### Additional Tools
- **date-fns** - Date manipulation and formatting

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `backend/.env` file (see `env.sample` for reference):
```env
PORT=8080
DATA_DIR=backend/data
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/providence_tennis
JWT_SECRET=your-super-secure-jwt-secret-key-here
SESSION_SECRET=your-super-secure-session-secret-here
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_GENAI_USE_VERTEXAI=false
GOOGLE_GENAI_MODEL=gemini-3-flash-preview
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
FRONTEND_URL=http://localhost:3009
```

3. Run the development server:

**Option 1: Using the start script (recommended)**
```bash
./start.sh
```

**Option 2: Using npm directly**
```bash
npm run dev
```

The start script will:
- Clean port 3009 if it's already in use
- Check and install dependencies if needed
- Start the development server

4. Open [http://localhost:3009](http://localhost:3009) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
providence_tennis/
├── app/
│   ├── api/              # API routes (backend)
│   │   ├── chat/         # AI assistant chat endpoint
│   │   ├── reservations/ # Court reservation CRUD operations
│   │   ├── courts/       # Court information endpoint
│   │   ├── availability/ # Court availability checking
│   │   └── ...           # Summer camp, contact, payments, auth, and admin routes
│   ├── dashboard/admin/  # Admin dashboards, including contact inbox
│   ├── summer-camp/      # Dedicated summer camp landing page
│   ├── globals.css       # Global styles and Tailwind directives
│   ├── layout.tsx        # Root layout component
│   └── page.tsx          # Home page
├── components/
│   ├── Navigation.tsx    # Header navigation with mobile menu
│   ├── Hero.tsx          # Hero section with animations
│   ├── LatestNews.tsx    # News section with announcements
│   ├── MissionProgramsFacilities.tsx # Combined mission, programs, facilities
│   ├── CountdownTimer.tsx # Countdown to events
│   ├── ProgramsShowcase.tsx # Program cards
│   ├── FeaturesSection.tsx # Smart courts and live streaming
│   ├── ContactSection.tsx # Contact form and info
│   ├── SummerCampPage.tsx # Summer camp landing page content
│   ├── SummerCampRegistrationForm.tsx # Local summer camp registration form
│   ├── dashboard/        # Dashboard shell and workspaces
│   ├── Footer.tsx        # Footer with links
│   ├── CourtReservation.tsx # Court booking interface
│   ├── AIAssistant.tsx   # AI chat assistant component
│   ├── CookieBanner.tsx  # Cookie consent banner
│   └── SubscribeSection.tsx # Newsletter subscription
├── lib/
│   ├── ai-agent.ts       # Google Gemini AI integration
│   ├── api/              # Frontend API helpers for backend endpoints
│   └── reservations.ts   # Reservation data management utilities
├── types/
│   └── reservation.ts    # TypeScript types for reservations
├── public/
│   └── images/           # Optimized images (WebP, JPEG)
│       ├── providence-tennis-logo.webp
│       ├── pt-courts-day.jpeg
│       ├── pt-courts-sunset.jpeg
│       └── pt-tennis-and-ball.jpeg
├── start.sh              # Startup script with port cleanup
└── package.json          # Dependencies and scripts
```

## Key Features in Detail

### AI Assistant 🤖
- Powered by Google Gemini 3 Flash Preview with Google Search grounding
- Can answer questions about:
  - Court reservations and booking
  - Facility information and hours
  - Programs and services
  - General tennis-related queries (with web search)
- Real-time chat interface with conversation history
- Source citations for web-sourced information

### Court Reservation System 🎾
- Modern, intuitive booking interface
- Multi-step reservation flow:
  1. Date selection
  2. Court selection
  3. Time slot selection
  4. Customer details and confirmation
- Real-time availability checking
- Hybrid data storage (Prisma/Postgres when available, JSON fallback otherwise)
- RESTful API endpoints for full CRUD operations

### Summer Camp Flow 🏕️
- Dedicated `/summer-camp` route with a more polished landing-page experience
- Local registration form stored in the backend
- Deposit/payment flow reuses the existing Stripe payment system
- Admin review path for camp and contact submissions

### Contact Inbox ✉️
- Public contact form submits to the backend
- Admin inbox at `/dashboard/admin/contact-submissions`
- Hybrid storage mirrors the rest of the backend persistence pattern

### Design Highlights

- **Modern Color Palette**: Primary blue gradients with accent colors
- **Smooth Animations**: Fade-in, slide-up, and hover effects
- **Responsive Grid Layouts**: Adapts beautifully to all screen sizes
- **Interactive Elements**: Hover states, transitions, and micro-interactions
- **Accessibility**: Semantic HTML, proper ARIA labels, keyboard navigation
- **Optimized Images**: Next.js Image component with WebP and JPEG formats

## API Endpoints

### Chat API
- `POST /api/chat` - Send messages to the AI assistant
  - Body: `{ message: string, conversationHistory?: ChatMessage[] }`
  - Returns: `{ response: string, sources?: Array<{ title: string, url: string }> }`

### Reservations API
- `GET /api/reservations` - List all reservations
- `POST /api/reservations` - Create a new reservation
- `GET /api/reservations/[id]` - Get a specific reservation
- `DELETE /api/reservations/[id]` - Delete a reservation

### Courts API
- `GET /api/courts` - Get list of available courts

### Availability API
- `GET /api/availability?date=YYYY-MM-DD` - Check court availability for a date

### Summer Camp API
- `POST /api/summer-camp/registrations` - Create a summer camp registration
- `GET /api/summer-camp/registrations` - List summer camp registrations for coaches/admins

### Contact API
- `POST /api/contact-submissions` - Store a public contact message
- `GET /api/admin/contact-submissions` - List contact messages for admins

## Configuration

### Port
The application runs on port **3009** by default. This can be changed in:
- `package.json` - `dev` script
- `start.sh` - PORT variable

### Backend Storage
- Set `DATABASE_URL` to enable Prisma/Postgres persistence in the backend.
- When `DATABASE_URL` is unset, the backend falls back to JSON files in `backend/data` or the directory specified by `DATA_DIR`.
- After changing `backend/prisma/schema.prisma`, run `cd backend && npm run db:generate` so the Prisma client matches the schema.

### Environment Variables
All environment variables are configured in `backend/.env` (single source of truth):
- `PORT` - Backend port, default `8080`
- `DATA_DIR` - Optional JSON fallback directory for file-backed persistence
- `DATABASE_URL` - Postgres connection string for Prisma-backed persistence
- `GOOGLE_API_KEY` - Google Generative AI API key (required for AI assistant)
- `GOOGLE_GENAI_USE_VERTEXAI` - Set to "false" for standard API usage
- `GOOGLE_GENAI_MODEL` - AI model name (default: gemini-3-flash-preview)
- `STRIPE_SECRET_KEY` - Stripe secret key (required for payments)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (served to frontend via API)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `JWT_SECRET` / `SESSION_SECRET` - Authentication and session signing secrets
- `FRONTEND_URL` - Public URL used in generated email links
- `NEXT_PUBLIC_API_BASE_URL` - Optional frontend override when the API is not on localhost:8080

## Customization

### Colors

Edit `tailwind.config.ts` to customize the color scheme:
- `primary`: Main brand colors (blues)
- `accent`: Secondary accent colors (yellows)

### Animations

Framer Motion animations can be adjusted in individual components. Animation timings and effects are configurable.

### AI Assistant Context

Edit `lib/ai-agent.ts` to customize the AI assistant's system instructions and context about Providence Tennis Academy.

### Reservation System

The reservation system uses JSON files for data storage. To upgrade to a database:
1. Modify `lib/reservations.ts` to use your preferred database
2. Update the API routes in `app/api/reservations/`

## Development

### Running the Start Script
The `start.sh` script automatically:
- Cleans port 3009 if it's in use
- Installs dependencies if needed
- Starts the development server

Make sure the script is executable:
```bash
chmod +x start.sh
```

## Documentation

All developer docs live in **[docs/](docs/README.md)**. Start there for setup, API, testing, and features.

| Doc | Description |
|-----|-------------|
| [docs/README.md](docs/README.md) | Documentation index |
| [docs/TECHNICAL_REFERENCE.md](docs/TECHNICAL_REFERENCE.md) | Ports, env vars, architecture |
| [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) | How to run tests |
| [docs/api/API_DOCUMENTATION.md](docs/api/API_DOCUMENTATION.md) | Full API reference |
| [docs/getting-started/DEVELOPER_ONBOARDING_BOOKINGS.md](docs/getting-started/DEVELOPER_ONBOARDING_BOOKINGS.md) | Onboarding & book-a-court |
| [docs/agents/](docs/agents/README.md) | AI agents (public chat + admin assistant) |
| [env.sample](env.sample) | Environment variables reference (copy backend section to `backend/.env`) |

## License

All Rights Reserved - Providence Tennis Academy
