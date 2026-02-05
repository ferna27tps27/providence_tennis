# Providence Tennis Academy - Modern Web Application

A modern, responsive web application for Providence Tennis Academy built with Next.js, React, and Tailwind CSS, featuring improved UI/UX design, court reservation system, and AI-powered assistant.

## Features

- 🎨 Modern, clean UI with gradient accents and smooth animations
- 📱 Fully responsive design (mobile, tablet, desktop)
- ⚡ Fast performance with Next.js 14
- 🎭 Smooth animations using Framer Motion
- 🎯 Enhanced user experience with intuitive navigation
- 🌈 Beautiful color scheme with custom Tailwind configuration
- 🤖 **AI Assistant** - Google Gemini-powered chat assistant with web search capabilities
- 🎾 **Court Reservation System** - Modern booking interface for court time reservations
- 👥 **Member Management** - Complete authentication and member dashboard system
- 💳 **Payment Processing** - Stripe integration for court bookings and membership fees
- 🔧 **RESTful API** - Express.js backend with full CRUD operations
- ⚡ **Performance Optimized** - In-memory caching and file locking for concurrency
- 🖼️ **Optimized Images** - WebP and JPEG formats with Next.js Image optimization

## Tech Stack

### Frontend
- **Next.js 14** - React framework for production with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library

### Backend
- **Express.js Server** - RESTful API server running on port 8080
- **JSON File Storage** - Data persistence for reservations, members, and payments
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
Create a `.env.local` file in the root directory:
```env
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_GENAI_USE_VERTEXAI=false
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
│   │   └── availability/ # Court availability checking
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
│   ├── Footer.tsx        # Footer with links
│   ├── CourtReservation.tsx # Court booking interface
│   ├── AIAssistant.tsx   # AI chat assistant component
│   ├── CookieBanner.tsx  # Cookie consent banner
│   └── SubscribeSection.tsx # Newsletter subscription
├── lib/
│   ├── ai-agent.ts       # Google Gemini AI integration
│   └── reservations.ts   # Reservation data management utilities
├── types/
│   └── reservation.ts    # TypeScript types for reservations
├── public/
│   └── images/           # Optimized images (WebP, JPEG)
│       ├── providence-tennis-logo.webp
│       ├── pt-courts-day.jpeg
│       ├── pt-courts-sunset.jpeg
│       └── pt-tennis-and-ball.jpeg
├── .env.local            # Environment variables (not in git)
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
- JSON-based data storage (easily upgradeable to database)
- RESTful API endpoints for full CRUD operations

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

## Configuration

### Port
The application runs on port **3009** by default. This can be changed in:
- `package.json` - `dev` script
- `start.sh` - PORT variable

### Environment Variables
Required environment variables in `.env.local`:
- `GOOGLE_API_KEY` - Google Generative AI API key (required for AI assistant)
- `GOOGLE_GENAI_USE_VERTEXAI` - Set to "false" for standard API usage

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
| [env.sample](env.sample) | Environment variables (copy to `.env.local` and `backend/.env`) |

## License

All Rights Reserved - Providence Tennis Academy
