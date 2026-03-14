# M5 Services CRM

A full-featured CRM and operations management app for M5 Services, a facility maintenance company.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Shadcn UI, Wouter (routing), TanStack Query, @react-pdf/renderer
- **Backend:** Express.js, Node.js, Drizzle ORM
- **Database:** PostgreSQL
- **Auth:** Replit Auth (OpenID Connect via Passport.js) with role-based access (Admin, Manager, Member)

## Features

- **Dashboard** — Key metrics (active leads, pipeline value, open tasks, monthly revenue), activity feed, upcoming tasks; filter by All Team / My Data / specific team member (persisted per user); pipeline value includes tier-based leads using DB-configured estimates; **Action Required card** with 5 alert sections (Email Reply Needed 24h / Price Not Sent 2d / Draft Quote Stale / Follow Up Sent Quote 7d / Expiring Soon 23d) — each item dismissible with 7-day snooze; **Quotes Pipeline card** showing all draft/sent estimates in two columns
- **Lead/Pipeline Management** — Kanban board by stage (New Lead → Won/Lost), list view, drag-free stage transitions, lead detail sheet with activity timeline; Kanban cards auto-sorted by estimated value (high → low) within each column; **BuildOps Quotes view** — preset filter showing all leads with `buildopsQuoteId` in 4 columns (Quote Needed / Quote Sent / Approved / Rejected); "Sync BuildOps Quotes" button to pull latest from BuildOps API
- **Client Database** — Company profiles, contacts, tabbed detail view (Overview, Contacts, Leads, Estimates, Org Chart, Activity); contacts support `reportsTo` for hierarchy; contacts have custom stages (with color coding, inline picker, and manage stages dialog)
- **Task Management** — Priority + status filtering, due date tracking, assignments, detail sheet editing
- **Reminders** — Bell notification dropdown in header, create/dismiss reminders linked to leads/clients/tasks
- **Estimates Hub** — Consolidated hub at `/estimates` with sub-navigation tabs for Estimates, Calculators, Service Catalog, and Proposals; sidebar shows single "Estimates" entry instead of three separate links
- **Estimate Calculators** — Five service-specific calculators (Building Engineering, Special Projects, Facility Solutions, Janitorial, Property Assessment) with real-time live price breakdowns using catalog rates with fallback defaults; "Create Estimate" button pre-populates a new estimate with calculated line items
- **Service Catalog** — Predefined service items with pricing by service type; Admin/Manager CRUD
- **Estimation Tool** — Estimate builder at `/estimates/:id` with line items from catalog or custom, auto-computed totals + tax
- **Proposals** — Proposal builder linked to estimates, status workflow (Draft → Sent → Signed), PDF export with M5 branding
- **Activity Timeline** — Reusable timeline component used on lead, client, and estimate detail views
- **Email Sync** — Gmail OAuth integration with three-column desktop layout (thread list w-72 / email messages flex-1 / CRM sidebar w-80); AI-powered analysis (summary, sentiment, tasks, stage suggestions) with user-identity-aware prompts; thread grouping by `gmailThreadId` with collapsible per-message expansion; CC detection; domain-based auto-linking; AI connection + create suggestions in CRM sidebar with thumbs feedback + X dismiss; bulk multi-select on thread rows with block/dismiss action bar; CRM sidebar shows thread summary, inline linked records editing (combobox, no dialog), People in This Thread section, remaining AI suggestions; all thread participants (from/to/cc across whole chain) passed to AI for better suggestions; block individual sender or entire domain; email search; auto-sync every 15 minutes; emails persist permanently in DB
- **Settings** — Profile view; Admin-only team member role management

## Architecture

- `client/src/pages/` — All page components
- `client/src/components/layout/` — ProtectedLayout (auth gate + sidebar), Sidebar, AppSidebar
- `client/src/pages/estimates-hub.tsx` — Consolidated estimates hub with sub-navigation tabs
- `client/src/pages/calculators.tsx` — Five service-specific estimate calculators
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

Tables: `users`, `sessions`, `clients`, `client_contacts`, `client_offices`, `contact_buildings`, `bd_spend_entries`, `leads`, `tasks`, `reminders`, `service_catalog`, `estimates`, `estimate_line_items`, `proposals`, `activity_logs`, `pipeline_stages`, `role_configs`, `role_permissions`, `invites`, `building_portfolios`, `portfolio_buildings`, `portfolio_contacts`, `value_tier_settings`, `meetings`, `meeting_actions`

- `value_tier_settings` — stores estimated dollar values for deal tiers (`$`, `$$`, `$$$`, `$$$$`); seeded with defaults ($25k, $75k, $200k, $500k); admin-configurable via Admin → Configuration tab; used in pipeline value calculations and Kanban card sorting
- `users.dashboard_filter` — persists the user's selected dashboard scope (`all`, `mine`, or a specific userId)

- `leads.building_id` → FK to `contact_buildings` (optional, links a lead to a specific portfolio building)
- `estimates.building_id` → FK to `contact_buildings` (optional, links an estimate to a specific portfolio building)
- `building_portfolios` — named groups of buildings; optional `clientId` FK to clients
- `portfolio_buildings` — junction: portfolioId + buildingId (cascade delete)
- `portfolio_contacts` — junction: portfolioId + contactId + role (cascade delete)
- `meetings` — meeting records with `attendeeContactIds integer[]` (array of contact IDs), `clientId`, `leadId`, `status`, `transcript`, `summary`, AI-generated meeting actions
- `meeting_actions` — follow-up action items generated from meeting AI summary; FK to meetingId

## BuildOps Integration

- `server/buildops.ts` — BuildOps API service layer; base URL `https://public-api.live.buildops.com`
- **Auth**: Client credentials flow — POST `/v1/auth/token` with `clientId` + `clientSecret`; token cached 55min in-memory; `tenantId` sent as request header
- Functions: `testConnection`, `getCustomers`, `getCustomerById`, `createCustomer`, `updateCustomer`, `mapClientToCustomer`, `getDepartments`, `createQuote`, `getServiceAgreements`
- Credentials stored in `app_settings` as `buildopsClientId` + `buildopsClientSecret` + `buildopsTenantId` + `buildopsDefaultDepartmentId`
- Routes: `POST /api/buildops/test`, `GET /api/buildops/departments`, `POST /api/buildops/sync-pull`, `POST /api/buildops/push-client/:id`, `POST /api/buildops/push-all`, `POST /api/buildops/push-estimate/:estimateId`, `GET /api/clients/:id/buildops-agreements`, `GET /api/buildops/last-sync`
- `clients.buildopsId` — BuildOps customer UUID; `estimates.buildopsQuoteId` — BuildOps quote UUID (set after push)
- `buildops_sync_log` table — audit trail of all pull/push operations (`entityType` can be `client` or `estimate`)
- Admin → BuildOps tab: Client ID + Client Secret (masked) + Tenant ID; Test Connection; Default Department dropdown (loads after successful test); pull/push sync controls
- Client detail: BuildOpsIcon tooltip badge when synced; "Push to BuildOps"/"Sync to BuildOps" button; BuildOps Service Agreements section on overview tab (loads when client has `buildopsId`)
- Estimate detail: "AI Generate Scope" (GPT-4o), "Push to BuildOps" (live — creates quote in BuildOps, stores `buildopsQuoteId`); BuildOpsIcon badge when linked
- `client/src/components/BuildOpsIcon.tsx` — reusable orange "B" SVG icon, shown on clients list (table+card), client-detail header, estimate-detail header

## Branding

- Primary: #BE1916 (red), Accent: #F93262 (hot pink)
- Fonts: Space Grotesk (body), Archivo Black (headings)
- Logo: `/public/logo.webp`
