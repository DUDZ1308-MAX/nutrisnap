# NutriSnap

A personal nutrition and workout tracker. Track your meals, log workouts, and monitor your daily nutrition goals — all stored privately on your device.

## Tech Stack

- **Frontend:** React 19, Vite 7, TypeScript 5.9, Tailwind CSS 4, shadcn/ui
- **Backend:** Express 5, Drizzle ORM, PostgreSQL
- **State:** React hooks + localStorage (client-side only)
- **Validation:** Zod schemas
- **Deployment:** Vercel (frontend), Vercel Postgres + Vercel Auth (backend)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+

### Install

```bash
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### Development

```bash
# Frontend (port 26270)
pnpm --filter @workspace/nutrisnap dev

# API server (port 8080)
pnpm --filter @workspace/api-server dev
```

### Build

```bash
pnpm run build
```

### Test

```bash
pnpm test
```

### Lint

```bash
pnpm lint
```

## Project Structure

```
├── artifacts/
│   ├── nutrisnap/          # React SPA frontend
│   ├── api-server/         # Express REST API
│   └── mockup-sandbox/     # Component preview (dev only)
├── lib/
│   ├── api-client-react/   # Auto-generated React Query hooks
│   ├── api-spec/           # OpenAPI spec + codegen config
│   ├── api-zod/            # Auto-generated Zod schemas
│   └── db/                 # Drizzle ORM + PostgreSQL
├── scripts/                # Build/utility scripts
├── vercel.json             # Vercel deployment config
└── package.json            # pnpm workspace root
```

## Features

- **Meal Tracking** — Log meals with nutrition facts, attach photos
- **Workout Logging** — Track workouts with interactive muscle map
- **Daily Goals** — Set and monitor calorie, protein, carb, and fat targets
- **Dashboard** — Overview of today's nutrition and movement
- **Data Export/Import** — Backup and restore your data as JSON
- **Responsive** — Works on desktop and mobile
- **Accessible** — ARIA labels, focus management, keyboard navigation

## License

MIT
