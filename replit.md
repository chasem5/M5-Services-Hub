# M5 Services CRM

A full-featured CRM and operations management app for M5 Services, a facility maintenance company.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Shadcn UI, Wouter (routing), TanStack Query, @react-pdf/renderer
- **Backend:** Express.js, Node.js, Drizzle ORM
- **Database:** PostgreSQL
- **Auth:** Replit Auth (OpenID Connect via Passport.js) with role-based access (Admin, Manager, Member)

## Features

- **Dashboard** — Key metrics (active leads, pipeline value, open tasks, monthly revenue), activity feed, upcoming tasks
- **Lead/Pipeline Management** — Kanban board by stage (New Lead → Won/Lost), list view, drag-free stage transitions, lead detail sheet with activity timeline
- **Client Database** — Company profiles, contacts, tabbed detail view (Overview, Contacts, Leads, Estimates, Org Chart, Activity); contacts support `reportsTo` for hierarchy
- **Task Management** — Priority + status filtering, due date tracking, assignments, detail sheet editing
- **Reminders** — Bell notification dropdown in header, create/dismiss reminders linked to leads/clients/tasks
- **Service Catalog** — Predefined service items with pricing by service type; Admin/Manager CRUD
- **Estimation Tool** — Estimate builder at `/estimates/:id` with line items from catalog or custom, auto-computed totals + tax
- **Proposals** — Proposal builder linked to estimates, status workflow (Draft → Sent → Signed), PDF export with M5 branding
- **Activity Timeline** — Reusable timeline component used on lead, client, and estimate detail views
- **Settings** — Profile view; Admin-only team member role management

## Architecture

- `client/src/pages/` — All page components
- `client/src/components/layout/` — ProtectedLayout (auth gate + sidebar), Sidebar, AppSidebar
- `client/src/components/` — ActivityTimeline, RemindersDropdown, ProposalPdf
- `server/routes.ts` — All API routes under `/api`
- `server/storage.ts` — Drizzle-based storage implementation
- `shared/schema.ts` — All Drizzle table definitions + Zod insert schemas
- `shared/models/auth.ts` — Auth tables (users with role, sessions)

## Role & Permissions System

- **Roles:** `admin` (full access + user management), `manager`, `member` — role display names are customizable
- **`role_configs` table:** stores custom display names per role (e.g., Manager → "Supervisor", Member → "Technician")
- **`role_permissions` table:** stores per-role, per-module access levels (full | view_all | own_only | none)
- **`GET /api/my-permissions`:** returns current user's permissions map + custom display name; used by sidebar to conditionally render nav items
- **Admin Portal (`/admin`):** Team Members tab (role change, remove user), Invitations tab (generate/copy links), Permissions tab (rename roles + module access matrix)
- **`invites` table:** token-based invite flow; admin generates link → employee visits `/invite/:token` → Replit login → role assigned

## Database Schema

Tables: `users`, `sessions`, `clients`, `client_contacts`, `client_offices`, `contact_buildings`, `bd_spend_entries`, `leads`, `tasks`, `reminders`, `service_catalog`, `estimates`, `estimate_line_items`, `proposals`, `activity_logs`, `pipeline_stages`, `role_configs`, `role_permissions`, `invites`

- `leads.building_id` → FK to `contact_buildings` (optional, links a lead to a specific portfolio building)
- `estimates.building_id` → FK to `contact_buildings` (optional, links an estimate to a specific portfolio building)

## Branding

- Primary: #BE1916 (red), Accent: #F93262 (hot pink)
- Fonts: Space Grotesk (body), Archivo Black (headings)
- Logo: `/public/logo.webp`
