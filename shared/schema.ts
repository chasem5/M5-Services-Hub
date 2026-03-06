import { pgTable, text, serial, integer, timestamp, boolean, varchar, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export { sessions, users } from "./models/auth";
export type { UpsertUser, User } from "./models/auth";

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  industry: varchar("industry"),
  address: text("address"),
  phone: varchar("phone"),
  email: varchar("email"),
  website: varchar("website"),
  notes: text("notes"),
  serviceNeeds: text("service_needs").array().default([]),
  annualRevenue: decimal("annual_revenue", { precision: 12, scale: 2 }),
  tier: varchar("tier", { length: 10 }),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clientOffices = pgTable("client_offices", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  name: varchar("name").notNull(),
  address: text("address"),
  phone: varchar("phone"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clientContacts = pgTable("client_contacts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  officeId: integer("office_id").references(() => clientOffices.id),
  name: varchar("name").notNull(),
  title: varchar("title"),
  email: varchar("email"),
  phone: varchar("phone"),
  isPrimary: boolean("is_primary").default(false).notNull(),
  reportsTo: integer("reports_to"),
  serviceNeeds: text("service_needs").array().default([]),
  linkedinUrl: varchar("linkedin_url"),
  profilePictureUrl: varchar("profile_picture_url"),
  employmentStatus: varchar("employment_status"),
  tier: varchar("tier", { length: 10 }),
});

export const bdSpendEntries = pgTable("bd_spend_entries", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  contactId: integer("contact_id").references(() => clientContacts.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category").notNull().default("other"), // meals_entertainment | gifts | travel | events | other
  date: timestamp("date").notNull(),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactBuildings = pgTable("contact_buildings", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").references(() => clientContacts.id).notNull(),
  name: varchar("name").notNull(),
  address: text("address"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pipelineStages = pgTable("pipeline_stages", {
  id: serial("id").primaryKey(),
  label: varchar("label").notNull(),
  slug: varchar("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  color: varchar("color"), // 'green' | 'red' | null (default)
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  clientId: integer("client_id").references(() => clients.id),
  contactId: integer("contact_id").references(() => clientContacts.id),
  buildingId: integer("building_id").references(() => contactBuildings.id),
  serviceType: varchar("service_type", { enum: ["building_engineering", "facility_solutions", "janitorial", "special_projects", "property_assessment"] }),
  stage: varchar("stage").default("new_lead").notNull(),
  valueType: varchar("value_type", { length: 10 }).default("fixed").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).default("0").notNull(),
  valueTier: varchar("value_tier", { length: 5 }),
  tier: varchar("tier", { length: 10 }),
  confidenceScore: integer("confidence_score").default(50),
  tags: text("tags").array().default([]),
  assignedTo: varchar("assigned_to").references(() => users.id),
  notes: text("notes"),
  contractType: text("contract_type").default("one_time").notNull(),
  recurringFrequency: text("recurring_frequency"), // monthly | quarterly | annual
  contractStartDate: timestamp("contract_start_date"),
  renewalDate: timestamp("renewal_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const taskLabelDefinitions = pgTable("task_label_definitions", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  color: varchar("color").notNull().default("blue"), // red|orange|yellow|green|blue|purple
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const taskColumns = pgTable("task_columns", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  relatedLeadId: integer("related_lead_id").references(() => leads.id),
  relatedClientId: integer("related_client_id").references(() => clients.id),
  relatedContactId: integer("related_contact_id").references(() => clientContacts.id),
  dueDate: timestamp("due_date"),
  priority: varchar("priority", { enum: ["low", "medium", "high"] }).default("medium").notNull(),
  status: varchar("status").default("todo").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  checklist: jsonb("checklist").default([]),
  labels: text("labels").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  message: text("message"),
  dueAt: timestamp("due_at").notNull(),
  relatedLeadId: integer("related_lead_id").references(() => leads.id),
  relatedClientId: integer("related_client_id").references(() => clients.id),
  relatedTaskId: integer("related_task_id").references(() => tasks.id),
  isDismissed: boolean("is_dismissed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serviceCatalog = pgTable("service_catalog", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  serviceType: varchar("service_type", { enum: ["building_engineering", "facility_solutions", "janitorial", "special_projects", "property_assessment"] }).notNull(),
  description: text("description"),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  unit: varchar("unit").notNull(), // e.g., 'sqft', 'hour', 'flat'
  isActive: boolean("is_active").default(true).notNull(),
});

export const estimates = pgTable("estimates", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  buildingId: integer("building_id").references(() => contactBuildings.id),
  title: varchar("title").notNull(),
  status: varchar("status", { enum: ["draft", "sent", "accepted", "rejected"] }).default("draft").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  tax: decimal("tax", { precision: 12, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const estimateLineItems = pgTable("estimate_line_items", {
  id: serial("id").primaryKey(),
  estimateId: integer("estimate_id").references(() => estimates.id).notNull(),
  catalogItemId: integer("catalog_item_id").references(() => serviceCatalog.id),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
});

export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  estimateId: integer("estimate_id").references(() => estimates.id).notNull(),
  title: varchar("title").notNull(),
  body: text("body"),
  status: varchar("status", { enum: ["draft", "sent", "signed"] }).default("draft").notNull(),
  pdfUrl: varchar("pdf_url"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pipelineViews = pgTable("pipeline_views", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  filters: jsonb("filters").notNull().default({}),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { enum: ["lead", "client", "task", "estimate", "proposal"] }).notNull(),
  entityId: integer("entity_id").notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: varchar("action").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  status: varchar("status").default("recording").notNull(),
  rawTranscript: text("raw_transcript").default(""),
  summary: text("summary"),
  createdBy: varchar("created_by").references(() => users.id),
  calendarEventId: varchar("calendar_event_id"),
  calendarEventLink: varchar("calendar_event_link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meetingActions = pgTable("meeting_actions", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => meetings.id).notNull(),
  type: varchar("type").notNull(),
  description: text("description").notNull(),
  payload: jsonb("payload").notNull().default({}),
  status: varchar("status").default("pending").notNull(),
  appliedAt: timestamp("applied_at"),
});

export const invites = pgTable("invites", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull(),
  role: varchar("role").notNull().default("member"),
  token: varchar("token").notNull().unique(),
  invitedBy: varchar("invited_by").references(() => users.id),
  usedBy: varchar("used_by").references(() => users.id),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailMessages = pgTable("email_messages", {
  id: serial("id").primaryKey(),
  gmailMessageId: varchar("gmail_message_id").notNull().unique(),
  gmailThreadId: varchar("gmail_thread_id").notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  direction: varchar("direction").notNull().default("inbound"),
  fromEmail: varchar("from_email").notNull(),
  fromName: varchar("from_name"),
  toEmails: text("to_emails").array().default([]),
  subject: varchar("subject"),
  bodySnippet: varchar("body_snippet"),
  fullBody: text("full_body"),
  receivedAt: timestamp("received_at").notNull(),
  clientId: integer("client_id").references(() => clients.id),
  leadId: integer("lead_id").references(() => leads.id),
  contactId: integer("contact_id").references(() => clientContacts.id),
  aiSummary: text("ai_summary"),
  aiSuggestedTasks: jsonb("ai_suggested_tasks"),
  aiSentiment: varchar("ai_sentiment"),
  aiStageSuggestion: varchar("ai_stage_suggestion"),
  requiresResponse: boolean("requires_response").default(false).notNull(),
  followUpReminderCreated: boolean("follow_up_reminder_created").default(false).notNull(),
  isProcessed: boolean("is_processed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmailMessageSchema = createInsertSchema(emailMessages).omit({ id: true, createdAt: true });
export type EmailMessage = typeof emailMessages.$inferSelect;
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;

export const leadNotes = pgTable("lead_notes", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeadNoteSchema = createInsertSchema(leadNotes).omit({ id: true, createdAt: true });
export type LeadNote = typeof leadNotes.$inferSelect;
export type InsertLeadNote = z.infer<typeof insertLeadNoteSchema>;

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),
  type: varchar("type", { length: 20 }).notNull().default("announcement"),
  targetUserIds: text("target_user_ids").array(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const announcementReads = pgTable("announcement_reads", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").references(() => announcements.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  readAt: timestamp("read_at").defaultNow().notNull(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true }).extend({
  targetUserIds: z.array(z.string()).optional().nullable(),
  priority: z.enum(["normal", "urgent"]).default("normal"),
  type: z.enum(["announcement", "task", "reminder"]).default("announcement"),
});
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type AnnouncementRead = typeof announcementReads.$inferSelect;

export const roleConfigs = pgTable("role_configs", {
  roleKey: varchar("role_key").primaryKey(),
  displayName: varchar("display_name").notNull(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleKey: varchar("role_key").notNull(),
  module: varchar("module").notNull(),
  accessLevel: varchar("access_level").notNull().default("own_only"),
});

// Zod Schemas
export const insertRoleConfigSchema = createInsertSchema(roleConfigs);
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ id: true });

export type RoleConfig = typeof roleConfigs.$inferSelect;
export type InsertRoleConfig = z.infer<typeof insertRoleConfigSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export const insertPipelineStageSchema = createInsertSchema(pipelineStages).omit({ id: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  annualRevenue: z.coerce.string().optional().nullable(),
  tier: z.enum(["tier_1", "tier_2", "tier_3"]).optional().nullable(),
});
export const insertBdSpendEntrySchema = createInsertSchema(bdSpendEntries).omit({ id: true, createdAt: true }).extend({
  date: z.coerce.date(),
  amount: z.coerce.string(),
});
export const insertClientOfficeSchema = createInsertSchema(clientOffices).omit({ id: true, createdAt: true }).extend({
  lat: z.coerce.string().optional().nullable(),
  lng: z.coerce.string().optional().nullable(),
});
export const insertClientContactSchema = createInsertSchema(clientContacts).omit({ id: true }).extend({
  tier: z.enum(["tier_1", "tier_2", "tier_3"]).optional().nullable(),
});
export const insertContactBuildingSchema = createInsertSchema(contactBuildings).omit({ id: true, createdAt: true }).extend({
  lat: z.coerce.string().optional().nullable(),
  lng: z.coerce.string().optional().nullable(),
});
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  buildingId: z.number().optional().nullable(),
  contactId: z.number().optional().nullable(),
  serviceType: z.enum(["building_engineering", "facility_solutions", "janitorial", "special_projects", "property_assessment"]).optional().nullable(),
  valueType: z.enum(["fixed", "potential"]).optional().default("fixed"),
  valueTier: z.enum(["$", "$$", "$$$", "$$$$"]).optional().nullable(),
  tier: z.enum(["tier_1", "tier_2", "tier_3"]).optional().nullable(),
  contractType: z.enum(["one_time", "recurring"]).optional().default("one_time"),
  recurringFrequency: z.enum(["monthly", "quarterly", "annual"]).optional().nullable(),
  contractStartDate: z.coerce.date().optional().nullable(),
  renewalDate: z.coerce.date().optional().nullable(),
});
export const insertPipelineViewSchema = createInsertSchema(pipelineViews).omit({ id: true, createdAt: true });
export const insertTaskLabelDefinitionSchema = createInsertSchema(taskLabelDefinitions).omit({ id: true });
export const insertTaskColumnSchema = createInsertSchema(taskColumns).omit({ id: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true }).extend({
  checklist: z.array(z.object({ id: z.string(), text: z.string(), done: z.boolean() })).optional().default([]),
  labels: z.array(z.string()).optional().default([]),
  sortOrder: z.number().optional().default(0),
});
export const insertReminderSchema = createInsertSchema(reminders).omit({ id: true, createdAt: true });
export const insertServiceCatalogSchema = createInsertSchema(serviceCatalog).omit({ id: true });
export const insertEstimateSchema = createInsertSchema(estimates).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  buildingId: z.number().optional().nullable(),
});
export const insertEstimateLineItemSchema = createInsertSchema(estimateLineItems).omit({ id: true });
export const insertProposalSchema = createInsertSchema(proposals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });

// Types
export type BdSpendEntry = typeof bdSpendEntries.$inferSelect;
export type InsertBdSpendEntry = z.infer<typeof insertBdSpendEntrySchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type ClientOffice = typeof clientOffices.$inferSelect;
export type InsertClientOffice = z.infer<typeof insertClientOfficeSchema>;
export type ClientContact = typeof clientContacts.$inferSelect;
export type InsertClientContact = z.infer<typeof insertClientContactSchema>;
export type ContactBuilding = typeof contactBuildings.$inferSelect;
export type InsertContactBuilding = z.infer<typeof insertContactBuildingSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type ServiceCatalogItem = typeof serviceCatalog.$inferSelect;
export type InsertServiceCatalogItem = z.infer<typeof insertServiceCatalogSchema>;
export type Estimate = typeof estimates.$inferSelect;
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type EstimateLineItem = typeof estimateLineItems.$inferSelect;
export type InsertEstimateLineItem = z.infer<typeof insertEstimateLineItemSchema>;
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;
export type PipelineView = typeof pipelineViews.$inferSelect;
export type InsertPipelineView = z.infer<typeof insertPipelineViewSchema>;
export type TaskLabelDefinition = typeof taskLabelDefinitions.$inferSelect;
export type InsertTaskLabelDefinition = z.infer<typeof insertTaskLabelDefinitionSchema>;
export type TaskColumn = typeof taskColumns.$inferSelect;
export type InsertTaskColumn = z.infer<typeof insertTaskColumnSchema>;

export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true, createdAt: true }).extend({
  date: z.coerce.date().optional(),
});
export const insertMeetingActionSchema = createInsertSchema(meetingActions).omit({ id: true, appliedAt: true });

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type MeetingAction = typeof meetingActions.$inferSelect;
export type InsertMeetingAction = z.infer<typeof insertMeetingActionSchema>;

export const insertInviteSchema = createInsertSchema(invites).omit({ id: true, createdAt: true, usedAt: true, usedBy: true }).extend({
  role: z.string().default("member"),
  expiresAt: z.coerce.date(),
});
export type Invite = typeof invites.$inferSelect;
export type InsertInvite = z.infer<typeof insertInviteSchema>;
