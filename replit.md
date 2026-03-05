# Project Overview

A full-stack TypeScript web application built with React (frontend) and Express (backend).

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Shadcn UI, Wouter (routing), TanStack Query
- **Backend:** Express.js, Node.js, Drizzle ORM
- **Database:** PostgreSQL
- **Auth:** Replit Auth (OpenID Connect via Passport.js)

## Architecture

- `client/src/` — React frontend
  - `pages/` — Page components (home.tsx, not-found.tsx)
  - `hooks/` — Custom hooks (use-auth.ts, use-toast.ts)
  - `lib/` — Utilities (queryClient.ts, auth-utils.ts)
  - `components/ui/` — Shadcn UI components
- `server/` — Express backend
  - `index.ts` — Server entry point (sets up auth, routes)
  - `routes.ts` — Application API routes
  - `storage.ts` — In-memory storage interface
  - `db.ts` — Drizzle database connection
  - `replit_integrations/auth/` — Replit Auth integration
- `shared/` — Shared types between frontend and backend
  - `schema.ts` — Re-exports from `models/auth.ts`
  - `models/auth.ts` — Database schema (users, sessions tables)

## Database Schema

- `users` — Stores user profiles from Replit Auth (id, email, firstName, lastName, profileImageUrl)
- `sessions` — Express session storage (required for Replit Auth)

## Color Theme

Professional blue/navy theme. Primary color: blue (221 83% 53% light / 217 91% 60% dark).
