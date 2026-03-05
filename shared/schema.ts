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
  value: decimal("value", { precision: 12, scale: 2 }).default("0").notNull(),
  confidenceScore: integer("confidence_score").default(50),
  tags: text("tags").array().default([]),
  assignedTo: varchar("assigned_to").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  status: varchar("status", { enum: ["todo", "in_progress", "done"] }).default("todo").notNull(),
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

// Zod Schemas
export const insertPipelineStageSchema = createInsertSchema(pipelineStages).omit({ id: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  annualRevenue: z.coerce.string().optional().nullable(),
});
export const insertBdSpendEntrySchema = createInsertSchema(bdSpendEntries).omit({ id: true, createdAt: true }).extend({
  date: z.coerce.date(),
  amount: z.coerce.string(),
});
export const insertClientOfficeSchema = createInsertSchema(clientOffices).omit({ id: true, createdAt: true }).extend({
  lat: z.coerce.string().optional().nullable(),
  lng: z.coerce.string().optional().nullable(),
});
export const insertClientContactSchema = createInsertSchema(clientContacts).omit({ id: true });
export const insertContactBuildingSchema = createInsertSchema(contactBuildings).omit({ id: true, createdAt: true }).extend({
  lat: z.coerce.string().optional().nullable(),
  lng: z.coerce.string().optional().nullable(),
});
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  buildingId: z.number().optional().nullable(),
  contactId: z.number().optional().nullable(),
  serviceType: z.enum(["building_engineering", "facility_solutions", "janitorial", "special_projects", "property_assessment"]).optional().nullable(),
});
export const insertPipelineViewSchema = createInsertSchema(pipelineViews).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });
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
