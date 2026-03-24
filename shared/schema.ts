import { pgTable, text, serial, integer, timestamp, boolean, varchar, jsonb, decimal, unique } from "drizzle-orm/pg-core";
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
  addressStreet: varchar("address_street"),
  addressCity: varchar("address_city"),
  addressState: varchar("address_state"),
  addressZip: varchar("address_zip"),
  phone: varchar("phone"),
  phoneAlternate: varchar("phone_alternate"),
  email: varchar("email"),
  website: varchar("website"),
  notes: text("notes"),
  serviceNeeds: text("service_needs").array().default([]),
  annualRevenue: decimal("annual_revenue", { precision: 12, scale: 2 }),
  tier: varchar("tier", { length: 10 }),
  logoUrl: varchar("logo_url"),
  buildopsId: varchar("buildops_id"),
  buildopsCustomerType: varchar("buildops_customer_type"),
  buildopsStatus: varchar("buildops_status"),
  buildopsAccountNumber: varchar("buildops_account_number"),
  buildopsCustomerNumber: varchar("buildops_customer_number"),
  buildopsLastSyncedAt: timestamp("buildops_last_synced_at"),
  parentClientId: integer("parent_client_id"),
  accountManagerUserId: varchar("account_manager_user_id").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  healthOverride: varchar("health_override", { length: 20 }), // null | 'healthy' | 'watch' | 'at_risk'
  healthOverrideNote: varchar("health_override_note"),
  customerStatus: varchar("customer_status", { length: 30 }).default("prospect"),
  prospectRevenueTier: varchar("prospect_revenue_tier", { length: 10 }),
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

export const contactStages = pgTable("contact_stages", {
  id: serial("id").primaryKey(),
  label: varchar("label").notNull(),
  color: varchar("color"), // 'gray'|'blue'|'green'|'amber'|'red'|'purple'
  sortOrder: integer("sort_order").notNull().default(0),
});

export const clientContacts = pgTable("client_contacts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  officeId: integer("office_id").references(() => clientOffices.id),
  stageId: integer("stage_id").references(() => contactStages.id),
  ownerId: varchar("owner_id").references(() => users.id),
  buildopsId: varchar("buildops_id"),
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
  receiptUrl: text("receipt_url"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactBuildings = pgTable("contact_buildings", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").references(() => clientContacts.id),
  clientId: integer("client_id").references(() => clients.id),
  buildopsId: varchar("buildops_id").unique(),
  name: varchar("name"),
  address: text("address"),
  propertyType: varchar("property_type"),
  buildopsIsInactive: boolean("buildops_is_inactive").default(false),
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
  track: varchar("track", { length: 20 }).default("relationship"), // 'relationship' | 'deal'
  defaultProbability: integer("default_probability").default(50),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  clientId: integer("client_id").references(() => clients.id),
  contactId: integer("contact_id").references(() => clientContacts.id),
  buildingId: integer("building_id").references(() => contactBuildings.id),
  serviceType: varchar("service_type", { enum: ["building_engineering", "facility_solutions", "janitorial", "special_projects", "property_assessment"] }),
  serviceTypes: text("service_types").array().default([]),
  stage: varchar("stage").default("new_lead").notNull(),
  valueType: varchar("value_type", { length: 10 }).default("fixed").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).default("0").notNull(),
  valueTier: varchar("value_tier", { length: 5 }),
  tier: varchar("tier", { length: 10 }),
  confidenceScore: integer("confidence_score").default(50),
  confidenceStatus: varchar("confidence_status", { length: 30 }),
  tags: text("tags").array().default([]),
  assignedTo: varchar("assigned_to").references(() => users.id),
  notes: text("notes"),
  contractType: text("contract_type").default("one_time").notNull(),
  recurringFrequency: text("recurring_frequency"), // monthly | quarterly | annual
  contractStartDate: timestamp("contract_start_date"),
  renewalDate: timestamp("renewal_date"),
  buildopsId: varchar("buildops_id"),
  buildopsQuoteId: varchar("buildops_quote_id"),
  buildopsQuoteStatus: varchar("buildops_quote_status"),
  buildopsQuoteNumber: varchar("buildops_quote_number"),
  buildopsQuoteTotal: decimal("buildops_quote_total", { precision: 12, scale: 2 }),
  buildopsPropertyId: varchar("buildops_property_id"),
  buildopsExpirationDate: timestamp("buildops_expiration_date"),
  followUpSnoozedUntil: timestamp("follow_up_snoozed_until"),
  wonAt: timestamp("won_at"),
  lostAt: timestamp("lost_at"),
  lossReason: varchar("loss_reason", { enum: ["price", "competition", "timing", "no_response", "other"] }),
  lossNote: text("loss_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const taskBoards = pgTable("task_boards", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  visibility: varchar("visibility", { enum: ["private", "invite", "team"] }).notNull().default("team"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskBoardMembers = pgTable("task_board_members", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").references(() => taskBoards.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { enum: ["owner", "member"] }).notNull().default("member"),
});

export const taskLabelDefinitions = pgTable("task_label_definitions", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  color: varchar("color").notNull().default("blue"), // red|orange|yellow|green|blue|purple
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const taskColumns = pgTable("task_columns", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").references(() => taskBoards.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").references(() => taskBoards.id, { onDelete: "set null" }),
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
  buildopsQuoteId: varchar("buildops_quote_id"),
  followUpSnoozedUntil: timestamp("follow_up_snoozed_until"),
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
  meetingType: varchar("meeting_type").default("standard").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  status: varchar("status").default("recording").notNull(),
  rawTranscript: text("raw_transcript").default(""),
  summary: text("summary"),
  createdBy: varchar("created_by").references(() => users.id),
  calendarEventId: varchar("calendar_event_id"),
  calendarEventLink: varchar("calendar_event_link"),
  leadId: integer("lead_id").references(() => leads.id),
  clientId: integer("client_id").references(() => clients.id),
  attendeeContactIds: integer("attendee_contact_ids").array().default([]).notNull(),
  attendeeUserIds: varchar("attendee_user_ids").array().default([]).notNull(),
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
  ccEmails: text("cc_emails").array().default([]),
  subject: varchar("subject"),
  bodySnippet: varchar("body_snippet"),
  fullBody: text("full_body"),
  receivedAt: timestamp("received_at").notNull(),
  clientId: integer("client_id").references(() => clients.id),
  leadId: integer("lead_id").references(() => leads.id),
  contactId: integer("contact_id").references(() => clientContacts.id),
  aiSummary: text("ai_summary"),
  aiSuggestedTasks: jsonb("ai_suggested_tasks"),
  aiConnectionSuggestions: jsonb("ai_connection_suggestions"),
  aiCreateSuggestions: jsonb("ai_create_suggestions"),
  aiSentiment: varchar("ai_sentiment"),
  aiStageSuggestion: varchar("ai_stage_suggestion"),
  requiresResponse: boolean("requires_response").default(false).notNull(),
  followUpReminderCreated: boolean("follow_up_reminder_created").default(false).notNull(),
  isProcessed: boolean("is_processed").default(false).notNull(),
  isDismissed: boolean("is_dismissed").default(false).notNull(),
  autoLinked: boolean("auto_linked").default(false).notNull(),
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  requestType: varchar("request_type"), // quote_request|support_issue|complaint|general_inquiry|follow_up|other
  isSuppressed: boolean("is_suppressed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailThreadNotes = pgTable("email_thread_notes", {
  id: serial("id").primaryKey(),
  gmailThreadId: varchar("gmail_thread_id").notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmailThreadNoteSchema = createInsertSchema(emailThreadNotes).omit({ id: true, createdAt: true });
export type EmailThreadNote = typeof emailThreadNotes.$inferSelect;
export type InsertEmailThreadNote = z.infer<typeof insertEmailThreadNoteSchema>;

export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { enum: ["lead", "client", "meeting", "task"] }).notNull(),
  entityId: integer("entity_id").notNull(),
  fileName: text("file_name").notNull(),
  objectKey: text("object_key").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({ id: true, createdAt: true });
export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

export const insertEmailMessageSchema = createInsertSchema(emailMessages).omit({ id: true, createdAt: true });
export type EmailMessage = typeof emailMessages.$inferSelect;
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;

export const dismissedSenders = pgTable("dismissed_senders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  emailAddress: varchar("email_address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDismissedSenderSchema = createInsertSchema(dismissedSenders).omit({ id: true, createdAt: true });
export type DismissedSender = typeof dismissedSenders.$inferSelect;
export type InsertDismissedSender = z.infer<typeof insertDismissedSenderSchema>;

export const leadNotes = pgTable("lead_notes", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  activityType: varchar("activity_type"),
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
  type: z.enum(["announcement", "task", "reminder", "release_notes"]).default("announcement"),
});
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type AnnouncementRead = typeof announcementReads.$inferSelect;

export const valueTierSettings = pgTable("value_tier_settings", {
  id: serial("id").primaryKey(),
  tier: varchar("tier", { length: 10 }).notNull().unique(),
  label: varchar("label", { length: 50 }),
  estimatedValue: decimal("estimated_value", { precision: 12, scale: 2 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertValueTierSettingSchema = createInsertSchema(valueTierSettings).omit({ id: true, updatedAt: true });
export type ValueTierSetting = typeof valueTierSettings.$inferSelect;
export type InsertValueTierSetting = z.infer<typeof insertValueTierSettingSchema>;

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

export const insertContactStageSchema = createInsertSchema(contactStages).omit({ id: true });
export const insertPipelineStageSchema = createInsertSchema(pipelineStages).omit({ id: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  annualRevenue: z.coerce.string().optional().nullable(),
  tier: z.enum(["tier_1", "tier_2", "tier_3"]).optional().nullable(),
  parentClientId: z.number().int().positive().optional().nullable(),
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
  contactId: z.number().optional().nullable(),
  clientId: z.number().optional().nullable(),
  name: z.string().optional().nullable(),
  address: z.string().min(1, "Address is required"),
});
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true, wonAt: true, lostAt: true }).extend({
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
  lossReason: z.enum(["price", "competition", "timing", "no_response", "other"]).optional().nullable(),
  lossNote: z.string().optional().nullable(),
});
export const insertPipelineViewSchema = createInsertSchema(pipelineViews).omit({ id: true, createdAt: true });
export const insertTaskBoardSchema = createInsertSchema(taskBoards).omit({ id: true, createdAt: true });
export const insertTaskBoardMemberSchema = createInsertSchema(taskBoardMembers).omit({ id: true });
export const insertTaskLabelDefinitionSchema = createInsertSchema(taskLabelDefinitions).omit({ id: true });
export const insertTaskColumnSchema = createInsertSchema(taskColumns).omit({ id: true }).extend({
  boardId: z.number().optional().nullable(),
});
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true }).extend({
  checklist: z.array(z.object({ id: z.string(), text: z.string(), done: z.boolean() })).optional().default([]),
  labels: z.array(z.string()).optional().default([]),
  sortOrder: z.number().optional().default(0),
  boardId: z.number().optional().nullable(),
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
export type Lead = typeof leads.$inferSelect & { isProposalExpired?: boolean };
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
export type ContactStage = typeof contactStages.$inferSelect;
export type InsertContactStage = z.infer<typeof insertContactStageSchema>;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;
export type PipelineView = typeof pipelineViews.$inferSelect;
export type InsertPipelineView = z.infer<typeof insertPipelineViewSchema>;
export type TaskBoard = typeof taskBoards.$inferSelect;
export type InsertTaskBoard = z.infer<typeof insertTaskBoardSchema>;
export type TaskBoardMember = typeof taskBoardMembers.$inferSelect;
export type InsertTaskBoardMember = z.infer<typeof insertTaskBoardMemberSchema>;
export type TaskLabelDefinition = typeof taskLabelDefinitions.$inferSelect;
export type InsertTaskLabelDefinition = z.infer<typeof insertTaskLabelDefinitionSchema>;
export type TaskColumn = typeof taskColumns.$inferSelect;
export type InsertTaskColumn = z.infer<typeof insertTaskColumnSchema>;

export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true, createdAt: true }).extend({
  date: z.coerce.date().optional(),
  meetingType: z.enum(["standard", "pipeline_review"]).optional().default("standard"),
  leadId: z.number().optional().nullable(),
  clientId: z.number().optional().nullable(),
  attendeeContactIds: z.array(z.number()).optional().default([]),
  attendeeUserIds: z.array(z.string()).optional().default([]),
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

// Building Portfolios
export const buildingPortfolios = pgTable("building_portfolios", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  clientId: integer("client_id").references(() => clients.id),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const portfolioBuildings = pgTable("portfolio_buildings", {
  id: serial("id").primaryKey(),
  portfolioId: integer("portfolio_id").references(() => buildingPortfolios.id, { onDelete: "cascade" }).notNull(),
  buildingId: integer("building_id").references(() => contactBuildings.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const portfolioContacts = pgTable("portfolio_contacts", {
  id: serial("id").primaryKey(),
  portfolioId: integer("portfolio_id").references(() => buildingPortfolios.id, { onDelete: "cascade" }).notNull(),
  contactId: integer("contact_id").references(() => clientContacts.id, { onDelete: "cascade" }).notNull(),
  role: text("role"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const buildingContacts = pgTable("building_contacts", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id").references(() => contactBuildings.id, { onDelete: "cascade" }).notNull(),
  contactId: integer("contact_id").references(() => clientContacts.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertBuildingContactSchema = createInsertSchema(buildingContacts).omit({ id: true, createdAt: true });
export type BuildingContact = typeof buildingContacts.$inferSelect;
export type InsertBuildingContact = z.infer<typeof insertBuildingContactSchema>;

export const insertBuildingPortfolioSchema = createInsertSchema(buildingPortfolios).omit({ id: true, createdAt: true }).extend({
  clientId: z.number().optional().nullable(),
});
export const insertPortfolioBuildingSchema = createInsertSchema(portfolioBuildings).omit({ id: true, createdAt: true });
export const insertPortfolioContactSchema = createInsertSchema(portfolioContacts).omit({ id: true, createdAt: true }).extend({
  role: z.string().optional().nullable(),
});

export type BuildingPortfolio = typeof buildingPortfolios.$inferSelect;
export type InsertBuildingPortfolio = z.infer<typeof insertBuildingPortfolioSchema>;
export type PortfolioBuilding = typeof portfolioBuildings.$inferSelect;
export type PortfolioContact = typeof portfolioContacts.$inferSelect;

// Industry Options (company-wide, admin-managed)
export const industryOptions = pgTable("industry_options", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 100 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertIndustryOptionSchema = createInsertSchema(industryOptions).omit({ id: true, createdAt: true });
export type IndustryOption = typeof industryOptions.$inferSelect;
export type InsertIndustryOption = z.infer<typeof insertIndustryOptionSchema>;

// Deal Tags (company-wide)
export const dealTags = pgTable("deal_tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 30 }).default("gray"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDealTagSchema = createInsertSchema(dealTags).omit({ id: true, createdAt: true });
export type DealTag = typeof dealTags.$inferSelect;
export type InsertDealTag = z.infer<typeof insertDealTagSchema>;

// App Settings (key-value store for company-wide configuration)
export const appSettings = pgTable("app_settings", {
  key: varchar("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type AppSetting = typeof appSettings.$inferSelect;

// AI Feedback (thumbs up/down on AI-generated content)
export const aiFeedback = pgTable("ai_feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  emailId: integer("email_id"),
  feedbackType: varchar("feedback_type", { length: 20 }).notNull(), // "thumbs_up" | "thumbs_down"
  feedbackContext: varchar("feedback_context", { length: 50 }).notNull(), // "summary" | "task" | "connection" | "stage" | "sentiment"
  contentSnippet: text("content_snippet"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertAiFeedbackSchema = createInsertSchema(aiFeedback).omit({ id: true, createdAt: true });
export type InsertAiFeedback = z.infer<typeof insertAiFeedbackSchema>;
export type AiFeedback = typeof aiFeedback.$inferSelect;

// BuildOps Jobs (synced from BuildOps)
export const buildopsJobs = pgTable("buildops_jobs", {
  id: serial("id").primaryKey(),
  buildopsId: varchar("buildops_id").notNull().unique(),
  clientId: integer("client_id").references(() => clients.id),
  jobNumber: varchar("job_number"),
  title: varchar("title"),
  issueDescription: text("issue_description"),
  status: varchar("status"),
  priority: varchar("priority"),
  jobTypeName: varchar("job_type_name"),
  customerName: varchar("customer_name"),
  customerPropertyName: varchar("customer_property_name"),
  amountQuoted: decimal("amount_quoted", { precision: 12, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  costAmount: decimal("cost_amount", { precision: 12, scale: 2 }),
  laborCost: decimal("labor_cost", { precision: 12, scale: 2 }),
  materialCost: decimal("material_cost", { precision: 12, scale: 2 }),
  grossProfit: decimal("gross_profit", { precision: 12, scale: 2 }),
  billingStatus: varchar("billing_status"),
  billingType: varchar("billing_type"),
  isServiceAgreementJob: boolean("is_service_agreement_job").default(false),
  scheduledDate: timestamp("scheduled_date"),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  buildopsCustomerId: varchar("buildops_customer_id"),
  buildopsPropertyId: varchar("buildops_property_id"),
  buildopsQuoteId: varchar("buildops_quote_id"),
  buildopsServiceAgreementId: varchar("buildops_service_agreement_id"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});
export type BuildopsJob = typeof buildopsJobs.$inferSelect;

// BuildOps Invoices (synced from BuildOps)
export const buildopsInvoices = pgTable("buildops_invoices", {
  id: serial("id").primaryKey(),
  buildopsId: varchar("buildops_id").notNull().unique(),
  clientId: integer("client_id").references(() => clients.id),
  invoiceNumber: varchar("invoice_number"),
  status: varchar("status"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }),
  customerName: varchar("customer_name"),
  jobNumber: varchar("job_number"),
  isFinalInvoice: boolean("is_final_invoice").default(false),
  issuedDate: timestamp("issued_date"),
  dueDate: timestamp("due_date"),
  closedDate: timestamp("closed_date"),
  buildopsCustomerId: varchar("buildops_customer_id"),
  buildopsJobId: varchar("buildops_job_id"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});
export type BuildopsInvoice = typeof buildopsInvoices.$inferSelect;

// BuildOps Service Agreements (synced from BuildOps)
export const buildopsAgreements = pgTable("buildops_agreements", {
  id: serial("id").primaryKey(),
  buildopsId: varchar("buildops_id").notNull().unique(),
  clientId: integer("client_id").references(() => clients.id),
  agreementName: varchar("agreement_name"),
  agreementNumber: varchar("agreement_number"),
  customerName: varchar("customer_name"),
  status: varchar("status"),
  contractValue: decimal("contract_value", { precision: 12, scale: 2 }),
  frequency: varchar("frequency"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  advancedSchedulingState: varchar("advanced_scheduling_state"),
  buildopsCustomerId: varchar("buildops_customer_id"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});
export type BuildopsAgreement = typeof buildopsAgreements.$inferSelect;

// BuildOps Employees (M5's own staff synced from BuildOps)
export const buildopsEmployees = pgTable("buildops_employees", {
  id: serial("id").primaryKey(),
  buildopsId: varchar("buildops_id").notNull().unique(),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  title: varchar("title"),
  isActive: boolean("is_active").default(true),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});
export type BuildopsEmployee = typeof buildopsEmployees.$inferSelect;

// Client Onboarding Checklist
export const clientOnboardingChecklist = pgTable("client_onboarding_checklist", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  itemKey: varchar("item_key", { length: 100 }).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({ unq: unique().on(t.clientId, t.itemKey) }));

export const insertClientOnboardingChecklistSchema = createInsertSchema(clientOnboardingChecklist).omit({ id: true, updatedAt: true });
export type ClientOnboardingChecklist = typeof clientOnboardingChecklist.$inferSelect;
export type InsertClientOnboardingChecklist = z.infer<typeof insertClientOnboardingChecklistSchema>;

export const ONBOARDING_ITEM_KEYS = [
  "buildops_customer_linked",
  "service_agreement_created",
  "first_job_scheduled",
  "welcome_email_sent",
  "primary_contact_confirmed",
] as const;
export type OnboardingItemKey = typeof ONBOARDING_ITEM_KEYS[number];
export const ONBOARDING_TOTAL_ITEMS = ONBOARDING_ITEM_KEYS.length;

export const ONBOARDING_ITEM_LABELS: Record<OnboardingItemKey, string> = {
  buildops_customer_linked: "BuildOps customer linked",
  service_agreement_created: "Service agreement created",
  first_job_scheduled: "First job scheduled",
  welcome_email_sent: "Welcome email sent",
  primary_contact_confirmed: "Primary contact confirmed",
};

// BuildOps Sync Log
export const buildopsSyncLog = pgTable("buildops_sync_log", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type").notNull(), // 'client' | 'lead'
  entityId: integer("entity_id"),
  buildopsId: varchar("buildops_id"),
  action: varchar("action").notNull(), // 'pull' | 'push' | 'error'
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type BuildopsSyncLog = typeof buildopsSyncLog.$inferSelect;

// Action Plans (customer-level and company-level)
export const actionPlans = pgTable("action_plans", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 20 }).notNull().$type<"customer" | "company">(), // "customer" | "company"
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }), // null for company-level
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium").$type<"high" | "medium" | "low">(),
  status: varchar("status", { length: 20 }).notNull().default("open").$type<"open" | "done" | "dismissed">(),
  source: varchar("source", { length: 20 }).notNull().default("manual").$type<"ai" | "manual">(),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertActionPlanSchema = createInsertSchema(actionPlans).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  dueDate: z.coerce.date().optional().nullable(),
  clientId: z.number().optional().nullable(),
});
export type ActionPlan = typeof actionPlans.$inferSelect;
export type InsertActionPlan = z.infer<typeof insertActionPlanSchema>;
