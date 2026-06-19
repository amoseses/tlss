# Givit Platform

AI-powered gift recommendation platform. Built with React, Vite, and Supabase.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, TypeScript |
| UI | Tailwind CSS 4, Radix UI, Framer Motion |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| ORM | Drizzle Kit |
| API | OpenAPI 3.0, Orval (code generation) |
| Package Manager | pnpm (workspace monorepo) |

## Project Structure

```
├── artifacts/givit-platform/   # Main frontend application
│   ├── src/
│   │   ├── components/         # Reusable React components (ui, layout, product, etc.)
│   │   ├── lib/
│   │   │   └── supabase/       # Supabase client, server, env config
│   │   ├── pages/              # Route pages
│   │   └── types/              # TypeScript type definitions
│   ├── public/                 # Static assets (favicon, opengraph)
│   └── vite.config.ts
├── lib/
│   ├── db/                     # Drizzle database schema + migrations
│   │   └── src/schema/         # PostgreSQL schema definitions
│   ├── api-client-react/       # Generated React API client (Orval)
│   ├── api-spec/               # OpenAPI spec + codegen config
│   └── api-zod/                # Generated Zod validation schemas
├── scripts/                    # Utility scripts
└── config files                # pnpm-workspace, tsconfig, vercel, etc.
```

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 (install: `npm install -g pnpm`)
- **Supabase** project (free tier at [supabase.com](https://supabase.com))

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Supabase

Create a `.env.local` file in `artifacts/givit-platform/`:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> These values are found in your Supabase project dashboard under **Settings > API**.

### 3. Database Migrations

The database schema is defined with Drizzle ORM in `lib/db/src/schema/`. To push the schema to your Supabase PostgreSQL database:

```bash
# Set your Supabase database connection string
export DATABASE_URL=postgresql://postgres:password@host:6543/postgres

# Push schema directly (creates/updates tables)
pnpm --filter @workspace/db push

# Or generate migration files first
pnpm --filter @workspace/db push-force
```

> Your Supabase database connection string is in **Settings > Database > Connection string** (use the "Session pooler" or "Direct" connection).

### 4. Run Development Server

```bash
pnpm dev
```

This starts the Vite dev server at `http://localhost:5173`.

### 5. Build for Production

```bash
pnpm build
```

The build output goes to `artifacts/givit-platform/dist/`.

## Supabase Setup (Required)

This application uses Supabase for:

### Authentication
- Email/password signup and login
- Session management via `@supabase/ssr`
- Configurable in `src/lib/supabase/`

### Database
- PostgreSQL via Drizzle ORM
- Schema: `lib/db/src/schema/index.ts`
- Migrations: Run `pnpm --filter @workspace/db push`

### Storage (Optional)
- Product images, gift board assets
- Configured via `src/lib/storage.ts`

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm --filter @workspace/db push` | Push database schema |

## Deployment

The project is configured for Vercel deployment via `vercel.json`:

```json
{
  "buildCommand": "pnpm --filter @workspace/givit-platform run build",
  "outputDirectory": "artifacts/givit-platform/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Required Environment Variables in Vercel:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`