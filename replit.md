# M5 Services CRM

A full-featured CRM and operations management app for M5 Services, a facility maintenance company.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Shadcn UI, Wouter (routing), TanStack Query, @react-pdf/renderer
- **Backend:** Express.js, Node.js, Drizzle ORM
- **Database:** PostgreSQL
- **Auth:** Replit Auth (OpenID Connect via Passport.js) with role-based access (Admin, Manager, Member)

## Features

- **Dashboard** — Key metrics (active leads, pipeline value, open tasks, monthly revenue), activity feed, upcoming tasks; filter by All Team / My Data / specific team member (persisted per user); pipeline value includes tier-based leads using DB-configured estimates
- **Lead/Pipeline Management** — Kanban board by stage (New Lead → Won/Lost), list view, drag-free stage transitions, lead detail sheet with activity timeline; Kanban cards auto-sorted by estimated value (high → low) within each column
- **Client Database** — Company profiles, contacts, tabbed detail view (Overview, Contacts, Leads, Estimates, Org Chart, Activity); contacts support `reportsTo` for hierarchy; contacts have custom stages (with color coding, inline picker, and manage stages dialog)
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

Tables: `users`, `sessions`, `clients`, `client_contacts`, `client_offices`, `contact_buildings`, `bd_spend_entries`, `leads`, `tasks`, `reminders`, `service_catalog`, `estimates`, `estimate_line_items`, `proposals`, `activity_logs`, `pipeline_stages`, `role_configs`, `role_permissions`, `invites`, `building_portfolios`, `portfolio_buildings`, `portfolio_contacts`, `value_tier_settings`

- `value_tier_settings` — stores estimated dollar values for deal tiers (`$`, `$$`, `$$$`, `$$$$`); seeded with defaults ($25k, $75k, $200k, $500k); admin-configurable via Admin → Configuration tab; used in pipeline value calculations and Kanban card sorting
- `users.dashboard_filter` — persists the user's selected dashboard scope (`all`, `mine`, or a specific userId)

- `leads.building_id` → FK to `contact_buildings` (optional, links a lead to a specific portfolio building)
- `estimates.building_id` → FK to `contact_buildings` (optional, links an estimate to a specific portfolio building)
- `building_portfolios` — named groups of buildings; optional `clientId` FK to clients
- `portfolio_buildings` — junction: portfolioId + buildingId (cascade delete)
- `portfolio_contacts` — junction: portfolioId + contactId + role (cascade delete)

## BuildOps Integration

- `server/buildops.ts` — BuildOps API service layer; base URL `https://public-api.live.buildops.com`; Bearer token auth + tenantId query param
- Functions: `testConnection`, `getCustomers` (paginated), `getCustomerById`, `createCustomer`, `updateCustomer`, `mapClientToCustomer`
- Credentials stored in `app_settings` table as `buildopsApiKey` + `buildopsTenantId`; retrieved at request time via `getBuildOpsCreds()`
- Routes: `POST /api/buildops/test`, `POST /api/buildops/sync-pull`, `POST /api/buildops/push-client/:id`, `POST /api/buildops/push-all`, `GET /api/buildops/last-sync`
- `clients.buildopsId` — stores BuildOps customer UUID; `leads.buildopsId` — reserved for future quote reference
- `buildops_sync_log` table — audit trail of all pull/push operations
- Admin → BuildOps tab: API key + tenant ID config, test connection, pull from BuildOps, push all
- Client detail: "Push to BuildOps" / "Sync to BuildOps" button; "BuildOps Linked" badge when synced
- Estimate detail: "AI Generate Scope" button — calls GPT-4o to generate scope of work + line items; "Push to BuildOps" stub (Quotes API pending)

## Branding

- Primary: #BE1916 (red), Accent: #F93262 (hot pink)
- Fonts: Space Grotesk (body), Archivo Black (headings)
- Logo: `/public/logo.webp`
