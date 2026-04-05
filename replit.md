# M5 Services CRM

A full-featured CRM and operations management app for M5 Services, a facility maintenance company.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Shadcn UI, Wouter (routing), TanStack Query, @react-pdf/renderer
- **Backend:** Express.js, Node.js, Drizzle ORM
- **Database:** PostgreSQL
- **Auth:** Replit Auth (OpenID Connect via Passport.js) with role-based access (Admin, Manager, Member)

## Features

- **Dashboard** — Key metrics (active leads, pipeline value, open tasks, monthly revenue, estimated MRR, win rate), activity feed, upcoming tasks; filter by All Team / My Data / specific team member (persisted per user); **Active Leads card** shows CRM/BuildOps source breakdown; **Pipeline Value card** shows CRM + BuildOps breakdown; **Win Rate** scoped to last 12 months with label; **Estimated MRR** includes CRM recurring leads + active BuildOps agreements (prorated to monthly); **Monthly Revenue** uses `won_at` date for CRM + BuildOps invoice `issuedDate`; **Revenue Trend** bar chart uses proper dates; **Estimated Pipeline donut** includes BuildOps quotes from leads with `buildopsQuoteId`; **Action Required card** collapsed by default with summary badges per category — expand to see full tabbed list; **Quotes Pipeline card** shows CRM estimates AND unlinked BuildOps leads with draft/sent quote status
- **Lead/Pipeline Management** — **Two-track pipeline**: Relationship track (Met/Introduced → Reached Out → In Conversation → Ready for Proposal) and Deal track (Proposal Sent → Won → Lost) with visual separator in Kanban; `pipeline_stages.track` column (`relationship` | `deal`); Kanban cards auto-sorted by estimated value (high → low); Deal-track lead cards show BuildOps quote status badge inline; **BuildOps Quotes view** — preset filter showing all leads with `buildopsQuoteId` in 4 columns (Quote Needed / Quote Sent / Approved / Rejected); "Sync BuildOps Quotes" button to pull latest from BuildOps API
- **Client Database** — Company profiles, contacts, tabbed detail view (Overview, Contacts, Leads, Estimates, Org Chart, Activity); contacts support `reportsTo` for hierarchy; contacts have custom stages (with color coding, inline picker, and manage stages dialog)
- **Task Management** — Priority + status filtering, due date tracking, assignments, detail sheet editing
- **Reminders** — Bell notification dropdown in header, create/dismiss reminders linked to leads/clients/tasks
- **Estimates Hub** — Consolidated hub at `/estimates` with sub-navigation tabs for Estimates, Calculators, Service Catalog, Proposals, and **BuildOps Quotes**; sidebar shows single "Estimates" entry; `/buildops-quotes` also routes here
- **Estimate Calculators** — Five service-specific calculators (Building Engineering, Special Projects, Facility Solutions, Janitorial, Property Assessment) with real-time live price breakdowns using catalog rates with fallback defaults; "Create Estimate" button pre-populates a new estimate with calculated line items
- **Service Catalog** — Predefined service items with pricing by service type; Admin/Manager CRUD
- **Estimation Tool** — Estimate builder at `/estimates/:id` with line items from catalog or custom, auto-computed totals + tax
- **Proposals** — Proposal builder linked to estimates, status workflow (Draft → Sent → Signed), PDF export with M5 branding
- **Activity Timeline** — Reusable timeline component used on lead, client, and estimate detail views
- **Email Sync** — Gmail OAuth integration with three-column desktop layout (thread list w-72 / email messages flex-1 / CRM sidebar w-80); AI-powered analysis (summary, sentiment, tasks, stage suggestions) with user-identity-aware prompts; thread grouping by `gmailThreadId` with collapsible per-message expansion; CC detection; domain-based auto-linking; AI connection + create suggestions in CRM sidebar with thumbs feedback + X dismiss; bulk multi-select on thread rows with block/dismiss action bar; CRM sidebar shows thread summary, inline linked records editing (combobox, no dialog), People in This Thread section, remaining AI suggestions; all thread participants (from/to/cc across whole chain) passed to AI for better suggestions; block individual sender or entire domain; email search; auto-sync every 15 minutes; emails persist permanently in DB
- **Customer Intelligence** — Per-customer Intelligence tab showing health score (0-4), hit rate, LTV, pipeline value, MRR, active/completed jobs, avg monthly jobs, 12-month revenue trend chart (Recharts AreaChart), and health score breakdown; Company-wide report at `/reports/customer-intelligence` ranked by LTV with tier/health filters, sortable table with trend indicators; Health score: +1 revenue growing, +1 active pipeline, +1 active jobs, +1 hit rate >50%; Statuses: Healthy (4), Watch (2-3), At Risk (0-1); Sidebar "Reports" section with Customer Intel link
- **Settings** — Profile view; Admin-only team member role management
- **CEO Command Center (`/ceo`)** — `super_admin`-only dashboard with live KPIs (revenue, pipeline, SA contract revenue, QCR, DSO, backlog, utilization); flexible `DateRangePicker` filter (Quick/Month/Range/Year modes, default "This Month" MTD); all metrics respect `startDate`/`endDate`; dynamic SQL bucketing via `buildBuckets()`; Crew Capacity panel with actual vs scheduled hours, OT rate badge from timesheet data; labor cost 6-month spark chart; top 5 customers by revenue; AI summary generation; Data Upload card auto-detects CSVs; **Team Performance** panel excludes users with `hideFromTeamPerformance = true` and uses per-user `revenueTarget` (fallback: role default)
- **Admin Portal user cards** — Super Admin can set per-user `revenueTarget` (blank = role default) via inline number input and toggle "In team perf." switch (`hideFromTeamPerformance` column) to control CEO dashboard Team Performance visibility
- **Soft-delete users** — `isActive` column; `deleteUser()` sets `isActive = false`; auth middleware rejects inactive users
- **Weekly Report AM Coaching Tool (`/weekly-report`)** — Weekly coaching report for Account Managers; auto-loads current week (Mon–Sun) with back/forward week navigation; 9-card Activity Snapshot (Emails, Calls, Other, Quotes Created, Quotes Sent, Tasks Done, Deals Won, Revenue Closed, Accounts Touched) + Active Proposals + Deals Lost; Revenue Snapshot section with MTD/QTD progress bars vs monthly/quarterly goals + MRR from active BuildOps service agreements; AI Coaching section powered by GPT-4o-mini generating 4 typed coaching items (win/focus/risk/tip) from live data; Customer Health table (all accounts where this AM is assigned — health status, MRR, open quotes, last contact); Proposal Aging table showing open pipeline deals with age-bucket badges (0-14d/15-30d/31-60d/60d+); Weekly Narrative (4 auto-save text areas: BD, Quotes, Jobs, SA); Spotlight pins (win or need-help items with optional value/note); "Mark Ready for Review" button triggers in-app + push notifications to managers/admins; Chat panel (side drawer, polls every 20s) for AM ↔ Manager feedback; status badge (Draft/Ready); DB tables: `weekly_reports`, `weekly_report_spotlights`, `weekly_report_messages`; 10 API endpoints under `/api/weekly-report`
- **Weekly Report Team View (`/weekly-report/team`)** — Manager/admin-only view; week navigation; summary stats (Total/Ready/Draft counts); filter tabs; expandable report cards per AM with narrative sections; inline chat panel per report for leaving manager feedback

## Architecture

- `client/src/pages/` — All page components
- `client/src/components/layout/` — ProtectedLayout (auth gate + sidebar), Sidebar, AppSidebar
- `client/src/pages/estimates-hub.tsx` — Consolidated estimates hub with sub-navigation tabs
- `client/src/pages/calculators.tsx` — Five service-specific estimate calculators
- `client/src/pages/customer-report.tsx` — Company-wide customer intelligence report
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

Tables: `users`, `sessions`, `clients`, `client_contacts`, `client_offices`, `contact_buildings`, `bd_spend_entries`, `leads`, `tasks`, `reminders`, `service_catalog`, `estimates`, `estimate_line_items`, `proposals`, `activity_logs`, `pipeline_stages`, `role_configs`, `role_permissions`, `invites`, `building_portfolios`, `portfolio_buildings`, `portfolio_contacts`, `value_tier_settings`, `meetings`, `meeting_actions`, `buildops_jobs`, `buildops_invoices`, `buildops_agreements`, `buildops_timesheets`

- `value_tier_settings` — stores estimated dollar values for deal tiers (`$`, `$$`, `$$$`, `$$$$`); seeded with defaults ($25k, $75k, $200k, $500k); admin-configurable via Admin → Configuration tab; used in pipeline value calculations and Kanban card sorting
- `users.dashboard_filter` — persists the user's selected dashboard scope (`all`, `mine`, or a specific userId)
- `leads.won_at` — timestamp set when a lead stage transitions to `won`; used for accurate monthly revenue and win rate calculations; backfilled from `updated_at` for pre-existing won leads

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
- Functions: `testConnection`, `getCustomers`, `getCustomerById`, `createCustomer`, `updateCustomer`, `mapClientToCustomer`, `getDepartments`, `createQuote`, `getProperties`, `getServiceAgreements`, `getJobs`, `getInvoices`, `getAllServiceAgreements`
- Credentials stored in `app_settings` as `buildopsClientId` + `buildopsClientSecret` + `buildopsTenantId` + `buildopsDefaultDepartmentId`
- Routes: `POST /api/buildops/test`, `GET /api/buildops/departments`, `POST /api/buildops/sync-pull`, `POST /api/buildops/sync-properties`, `POST /api/buildops/sync-quotes`, `POST /api/buildops/sync-jobs`, `POST /api/buildops/sync-invoices`, `POST /api/buildops/sync-agreements`, `POST /api/buildops/push-client/:id`, `POST /api/buildops/push-all`, `POST /api/buildops/push-estimate/:estimateId`, `GET /api/clients/:id/buildops-agreements` (synced DB + live fallback), `GET /api/clients/:id/buildops-jobs`, `GET /api/clients/:id/buildops-invoices`, `GET /api/buildops/last-sync`, `GET /api/buildops/audit-data`
- `clients.buildopsId` — BuildOps customer UUID; `estimates.buildopsQuoteId` — BuildOps quote UUID (set after push)
- `contact_buildings.buildopsId` — BuildOps property/location UUID; used for property→client matching in quote sync
- `leads.buildopsPropertyId` — BuildOps property UUID; set when a quote's client was resolved via property→client lookup
- `buildops_jobs` table — synced BuildOps jobs with `jobNumber`, `status`, `amountQuoted`, `costAmount`, `billingStatus`, `completedDate`, `customerPropertyName`; FK to `clients` via `clientId`; matched by `buildopsCustomerId`
- `buildops_invoices` table — synced BuildOps invoices with `invoiceNumber`, `status`, `totalAmount`, `subtotal`, `taxAmount`, `jobNumber`, `issuedDate`, `dueDate`, `closedDate`; FK to `clients`
- `buildops_agreements` table — synced BuildOps service agreements with `agreementName`, `agreementNumber`, `advancedSchedulingState`, `startDate`, `endDate`; FK to `clients`; enriched via CSV import with 20 additional fields: `billingCustomerName`, `departmentName`, `billingType`, `annualContractValue`, `serviceAgreementType`, `projectManager`, `accountManager`, `soldBy`, `totalAmount`, `totalCost`, `labourHours`, `numberOfMaintenances`, `numberOfJobs`, etc.
- `buildops_sync_log` table — audit trail of all pull/push operations (`entityType` can be `client`, `estimate`, `property`, `lead`, `job`, `invoice`, or `agreement`)
- **Quote sync matching tiers** (in order): 1) `billingCustomerId` UUID → `clients.buildopsId`, 2) `billTo` text → fuzzy client name match, 3) `propertyId` → `contact_buildings.buildopsId` → `contact_buildings.clientId` (zero API calls, DB lookup only)
- **Auto-trigger**: When pushing an estimate to BuildOps, if the client has no `buildopsId`, the system auto-creates a BuildOps customer first, then pushes the quote. Any associated leads in the relationship track are auto-advanced to `proposal_sent` (deal track).
- Admin → BuildOps tab: Client ID + Client Secret (masked) + Tenant ID; Test Connection; Default Department dropdown (loads after successful test); pull/push sync controls
- Client detail: BuildOpsIcon tooltip badge when synced; "BuildOps Linked" badge (replaced manual push button); BuildOps Service Agreements section on overview tab (loads when client has `buildopsId`); Jobs tab (job#, description, type, status, priority, quoted/cost/margin, property, completed date with totals); Invoices tab (invoice#, status, amount, tax, job#, issued/due/closed dates with total); Agreements tab (agreement#, name, scheduling state, start/end dates)
- Estimate detail: "AI Generate Scope" (GPT-4o), "Push to BuildOps" button (only shown when not yet linked; auto-creates customer if needed); BuildOpsIcon badge when linked
- `client/src/components/BuildOpsIcon.tsx` — reusable orange "B" SVG icon, shown on clients list (table+card), client-detail header, estimate-detail header
- **Estimates Hub → BuildOps Quotes tab** (`/buildops-quotes`) — unified view of all BuildOps quotes; `GET /api/buildops/quotes-list` enriches each quote with CRM client name and linked estimate; filters by status/linked state; "Sync to CRM" button; external link to BuildOps per row
- **Representatives sync note**: `/v1/customers/{id}/representatives` returns 404 for this tenant — this endpoint does not exist in their BuildOps subscription; `getRepresentatives()` silently returns [] on 404

## Branding

- Primary: #BE1916 (red), Accent: #F93262 (hot pink)
- Fonts: Space Grotesk (body), Archivo Black (headings)
- Logo: `/public/logo.webp`
