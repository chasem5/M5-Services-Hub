import { db } from "./db";
import { eq, and, desc, sql, lt, or } from "drizzle-orm";
import {
  users,
  clients,
  clientOffices,
  contactStages,
  clientContacts,
  contactBuildings,
  bdSpendEntries,
  leads,
  tasks,
  taskLabelDefinitions,
  taskColumns,
  reminders,
  serviceCatalog,
  estimates,
  estimateLineItems,
  proposals,
  activityLogs,
  pipelineStages,
  pipelineViews,
  meetings,
  meetingActions,
  invites,
  roleConfigs,
  rolePermissions,
  emailMessages,
  leadNotes,
  announcements,
  announcementReads,
  attachments,
  pushSubscriptions,
  buildingPortfolios,
  portfolioBuildings,
  portfolioContacts,
  dealTags,
  type DealTag,
  type InsertDealTag,
  type BuildingPortfolio,
  type InsertBuildingPortfolio,
  type PortfolioBuilding,
  type PortfolioContact,
  type User,
  type UpsertUser,
  type Client,
  type InsertClient,
  type ClientOffice,
  type InsertClientOffice,
  type ClientContact,
  type InsertClientContact,
  type BdSpendEntry,
  type InsertBdSpendEntry,
  type Lead,
  type InsertLead,
  type Task,
  type InsertTask,
  type Reminder,
  type InsertReminder,
  type ServiceCatalogItem,
  type InsertServiceCatalogItem,
  type Estimate,
  type InsertEstimate,
  type EstimateLineItem,
  type InsertEstimateLineItem,
  type Proposal,
  type InsertProposal,
  type ActivityLog,
  type InsertActivityLog,
  type ContactStage,
  type InsertContactStage,
  type PipelineStage,
  type InsertPipelineStage,
  type ContactBuilding,
  type InsertContactBuilding,
  type PipelineView,
  type InsertPipelineView,
  type TaskLabelDefinition,
  type InsertTaskLabelDefinition,
  type TaskColumn,
  type InsertTaskColumn,
  type Meeting,
  type InsertMeeting,
  type MeetingAction,
  type InsertMeetingAction,
  type Invite,
  type InsertInvite,
  type RoleConfig,
  type RolePermission,
  type EmailMessage,
  type InsertEmailMessage,
  type LeadNote,
  type InsertLeadNote,
  type Announcement,
  type InsertAnnouncement,
  type Attachment,
  type InsertAttachment,
  type PushSubscription,
  type InsertPushSubscription,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  listUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Invites
  createInvite(data: InsertInvite): Promise<Invite>;
  listInvites(): Promise<Invite[]>;
  getInviteByToken(token: string): Promise<Invite | undefined>;
  consumeInvite(token: string, userId: string): Promise<Invite>;
  deleteInvite(id: number): Promise<void>;

  // Clients
  listClients(userId?: string): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;

  // Client Offices
  listClientOffices(clientId: number): Promise<ClientOffice[]>;
  listAllClientOffices(): Promise<ClientOffice[]>;
  createClientOffice(office: InsertClientOffice): Promise<ClientOffice>;
  updateClientOffice(id: number, data: Partial<InsertClientOffice>): Promise<ClientOffice>;
  deleteClientOffice(id: number): Promise<void>;

  // Client Contacts
  listAllClientContacts(): Promise<ClientContact[]>;
  listClientContacts(clientId: number): Promise<ClientContact[]>;
  getClientContact(id: number): Promise<ClientContact | undefined>;
  createClientContact(contact: InsertClientContact): Promise<ClientContact>;
  updateClientContact(id: number, data: Partial<ClientContact>): Promise<ClientContact>;
  deleteClientContact(id: number): Promise<void>;

  // Contact Buildings
  listAllContactBuildings(): Promise<ContactBuilding[]>;
  listContactBuildings(contactId: number): Promise<ContactBuilding[]>;
  createContactBuilding(building: InsertContactBuilding): Promise<ContactBuilding>;
  updateContactBuilding(id: number, data: Partial<InsertContactBuilding>): Promise<ContactBuilding>;
  deleteContactBuilding(id: number): Promise<void>;
  getBuildingActivity(buildingId: number): Promise<{ leads: Lead[]; estimates: Estimate[] }>;

  // Leads
  listLeads(userId?: string): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead>;
  updateLeadStage(id: number, stage: string): Promise<Lead>;
  deleteLead(id: number): Promise<void>;

  // Tasks
  listTasks(userId?: string): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

  // Reminders
  listReminders(userId: string): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  dismissReminder(id: number): Promise<Reminder>;

  // Service Catalog
  listServiceCatalog(): Promise<ServiceCatalogItem[]>;
  getServiceCatalogItem(id: number): Promise<ServiceCatalogItem | undefined>;
  createServiceCatalogItem(item: InsertServiceCatalogItem): Promise<ServiceCatalogItem>;
  updateServiceCatalogItem(id: number, item: Partial<InsertServiceCatalogItem>): Promise<ServiceCatalogItem>;
  deleteServiceCatalogItem(id: number): Promise<void>;

  // Estimates
  listEstimates(userId?: string): Promise<Estimate[]>;
  getEstimate(id: number): Promise<Estimate | undefined>;
  createEstimate(estimate: InsertEstimate): Promise<Estimate>;
  updateEstimate(id: number, estimate: Partial<InsertEstimate>): Promise<Estimate>;
  deleteEstimate(id: number): Promise<void>;

  // Estimate Line Items
  listEstimateLineItems(estimateId: number): Promise<EstimateLineItem[]>;
  createEstimateLineItem(item: InsertEstimateLineItem): Promise<EstimateLineItem>;
  deleteEstimateLineItem(id: number): Promise<void>;

  // Proposals
  listProposals(): Promise<Proposal[]>;
  getProposal(id: number): Promise<Proposal | undefined>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal>;
  deleteProposal(id: number): Promise<void>;

  // Activity Logs
  listActivityLogs(entityType?: string, entityId?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Dashboard
  getDashboardStats(): Promise<any>;
  getTeamPerformanceStats(): Promise<any[]>;

  // Pipeline Stages
  listContactStages(): Promise<ContactStage[]>;
  createContactStage(stage: InsertContactStage): Promise<ContactStage>;
  updateContactStage(id: number, stage: Partial<InsertContactStage>): Promise<ContactStage>;
  deleteContactStage(id: number): Promise<void>;
  reorderContactStages(orderedIds: number[]): Promise<ContactStage[]>;
  seedDefaultContactStages(): Promise<void>;
  listPipelineStages(): Promise<PipelineStage[]>;
  createPipelineStage(stage: InsertPipelineStage): Promise<PipelineStage>;
  updatePipelineStage(id: number, stage: Partial<InsertPipelineStage>): Promise<PipelineStage>;
  deletePipelineStage(id: number): Promise<void>;
  reorderPipelineStages(orderedIds: number[]): Promise<PipelineStage[]>;
  seedDefaultPipelineStages(): Promise<void>;

  // BD Spend
  getSpendByClient(clientId: number): Promise<BdSpendEntry[]>;
  getSpendByContact(contactId: number): Promise<BdSpendEntry[]>;
  createSpendEntry(data: InsertBdSpendEntry): Promise<BdSpendEntry>;
  deleteSpendEntry(id: number): Promise<void>;
  getAllClientSpendTotals(): Promise<{ clientId: number; total: string }[]>;
  getAllContactSpendTotals(): Promise<{ contactId: number; total: string }[]>;

  // Pipeline Views
  listPipelineViews(): Promise<PipelineView[]>;
  createPipelineView(view: InsertPipelineView): Promise<PipelineView>;
  updatePipelineView(id: number, view: Partial<InsertPipelineView>): Promise<PipelineView>;
  deletePipelineView(id: number): Promise<void>;

  // Task Label Definitions
  listTaskLabelDefinitions(): Promise<TaskLabelDefinition[]>;
  createTaskLabelDefinition(label: InsertTaskLabelDefinition): Promise<TaskLabelDefinition>;
  updateTaskLabelDefinition(id: number, data: Partial<InsertTaskLabelDefinition>): Promise<TaskLabelDefinition>;
  deleteTaskLabelDefinition(id: number): Promise<void>;

  // Task Columns
  listTaskColumns(): Promise<TaskColumn[]>;
  createTaskColumn(col: InsertTaskColumn): Promise<TaskColumn>;
  updateTaskColumn(id: number, data: Partial<InsertTaskColumn>): Promise<TaskColumn>;
  deleteTaskColumn(id: number): Promise<void>;
  seedDefaultTaskColumns(): Promise<void>;

  // Meetings
  listMeetings(userId: string): Promise<Meeting[]>;
  getMeeting(id: number): Promise<Meeting | undefined>;
  createMeeting(data: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, data: Partial<InsertMeeting>): Promise<Meeting>;
  deleteMeeting(id: number): Promise<void>;

  // Meeting Actions
  listMeetingActions(meetingId: number): Promise<MeetingAction[]>;
  createMeetingAction(data: InsertMeetingAction): Promise<MeetingAction>;
  updateMeetingAction(id: number, data: Partial<MeetingAction>): Promise<MeetingAction>;

  // Role Configs
  listRoleConfigs(): Promise<RoleConfig[]>;
  updateRoleConfig(roleKey: string, displayName: string): Promise<RoleConfig>;
  createRoleConfig(roleKey: string, displayName: string): Promise<RoleConfig>;
  deleteRoleConfig(roleKey: string): Promise<void>;

  // Role Permissions
  listRolePermissions(): Promise<RolePermission[]>;
  getRolePermission(roleKey: string, module: string): Promise<RolePermission | undefined>;
  upsertRolePermission(roleKey: string, module: string, accessLevel: string): Promise<RolePermission>;
  seedDefaultPermissions(): Promise<void>;
  seedInitialAdmin(email: string): Promise<void>;

  // Gmail Tokens
  updateGmailTokens(userId: string, data: { gmailAccessToken: string; gmailRefreshToken: string | null; gmailTokenExpiry: Date | null; gmailEmail: string | null; gmailConnected: boolean }): Promise<User>;

  // Calendar Tokens
  updateCalendarTokens(userId: string, data: { calendarAccessToken: string; calendarRefreshToken: string | null; calendarTokenExpiry: Date | null; calendarEmail: string | null; calendarConnected: boolean }): Promise<User>;

  // Lead Notes
  listLeadNotes(leadId: number): Promise<LeadNote[]>;
  createLeadNote(data: InsertLeadNote): Promise<LeadNote>;
  deleteLeadNote(id: number): Promise<void>;

  // Email Messages
  listEmailMessages(filters?: { clientId?: number; leadId?: number; userId?: string }): Promise<EmailMessage[]>;
  getEmailMessage(id: number): Promise<EmailMessage | undefined>;
  upsertEmailMessage(data: InsertEmailMessage): Promise<EmailMessage>;
  updateEmailMessage(id: number, data: Partial<InsertEmailMessage>): Promise<EmailMessage>;
  listUnrespondedInboundEmails(olderThanDays: number, userId: string): Promise<EmailMessage[]>;

  // Announcements
  listAnnouncements(userId: string): Promise<Announcement[]>;
  getUnreadAnnouncementCount(userId: string): Promise<number>;
  createAnnouncement(data: InsertAnnouncement): Promise<Announcement>;
  markAnnouncementRead(announcementId: number, userId: string): Promise<void>;
  markAllAnnouncementsRead(userId: string): Promise<void>;

  // Attachments
  createAttachment(data: InsertAttachment): Promise<Attachment>;
  getAttachments(entityType: string, entityId: number): Promise<Attachment[]>;
  getAttachment(id: number): Promise<Attachment | undefined>;
  deleteAttachment(id: number): Promise<void>;

  // Push Subscriptions
  createPushSubscription(data: InsertPushSubscription): Promise<PushSubscription>;
  deletePushSubscription(endpoint: string): Promise<void>;
  listPushSubscriptions(userId?: string): Promise<PushSubscription[]>;

  // Building Portfolios
  listPortfolios(clientId?: number): Promise<BuildingPortfolio[]>;
  getPortfolio(id: number): Promise<(BuildingPortfolio & { buildings: PortfolioBuilding[]; contacts: PortfolioContact[] }) | undefined>;
  createPortfolio(data: InsertBuildingPortfolio): Promise<BuildingPortfolio>;
  updatePortfolio(id: number, data: Partial<InsertBuildingPortfolio>): Promise<BuildingPortfolio>;
  deletePortfolio(id: number): Promise<void>;
  addBuildingToPortfolio(portfolioId: number, buildingId: number): Promise<PortfolioBuilding>;
  removeBuildingFromPortfolio(portfolioId: number, buildingId: number): Promise<void>;
  addContactToPortfolio(portfolioId: number, contactId: number, role?: string | null): Promise<PortfolioContact>;
  removeContactFromPortfolio(portfolioId: number, contactId: number): Promise<void>;

  // Deal Tags
  listDealTags(): Promise<DealTag[]>;
  createDealTag(data: InsertDealTag): Promise<DealTag>;
  deleteDealTag(id: number): Promise<void>;
  ensureDealTag(name: string): Promise<DealTag>;

  // User Profile Self-Edit
  updateUserProfile(id: string, data: { firstName?: string; lastName?: string; phone?: string; profileImageUrl?: string }): Promise<User>;

  // Bulk Operations
  deleteBulkClients(ids: number[]): Promise<void>;
  deleteBulkClientContacts(ids: number[]): Promise<void>;
  bulkUpdateClientContacts(ids: number[], data: Partial<ClientContact>): Promise<void>;
  bulkUpdateClients(ids: number[], data: Partial<Client>): Promise<void>;

  // Activity Summary
  getLeadsActivitySummary(userId?: string): Promise<{ leadId: number; lastActivityAt: Date | null; stageChangedAt: Date | null }[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserRole(id: string, role: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Invites
  async createInvite(data: InsertInvite): Promise<Invite> {
    const [invite] = await db.insert(invites).values(data).returning();
    return invite;
  }

  async listInvites(): Promise<Invite[]> {
    return await db.select().from(invites).orderBy(desc(invites.createdAt));
  }

  async getInviteByToken(token: string): Promise<Invite | undefined> {
    const [invite] = await db.select().from(invites).where(eq(invites.token, token));
    return invite;
  }

  async consumeInvite(token: string, userId: string): Promise<Invite> {
    const [invite] = await db
      .update(invites)
      .set({ usedBy: userId, usedAt: new Date() })
      .where(eq(invites.token, token))
      .returning();
    return invite;
  }

  async deleteInvite(id: number): Promise<void> {
    await db.delete(invites).where(eq(invites.id, id));
  }

  // Clients
  async listClients(userId?: string): Promise<Client[]> {
    if (userId) {
      return await db.select().from(clients).where(eq(clients.createdBy, userId)).orderBy(desc(clients.createdAt));
    }
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: number, updateData: Partial<InsertClient>): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Client Contacts
  async listAllClientContacts(): Promise<ClientContact[]> {
    return await db.select().from(clientContacts);
  }

  // Client Offices
  async listClientOffices(clientId: number): Promise<ClientOffice[]> {
    return await db.select().from(clientOffices).where(eq(clientOffices.clientId, clientId)).orderBy(clientOffices.name);
  }

  async listAllClientOffices(): Promise<ClientOffice[]> {
    return await db.select().from(clientOffices).orderBy(clientOffices.name);
  }

  async createClientOffice(office: InsertClientOffice): Promise<ClientOffice> {
    const [newOffice] = await db.insert(clientOffices).values(office).returning();
    return newOffice;
  }

  async updateClientOffice(id: number, data: Partial<InsertClientOffice>): Promise<ClientOffice> {
    const [updated] = await db.update(clientOffices).set(data).where(eq(clientOffices.id, id)).returning();
    return updated;
  }

  async deleteClientOffice(id: number): Promise<void> {
    await db.update(clientContacts).set({ officeId: null }).where(eq(clientContacts.officeId, id));
    await db.delete(clientOffices).where(eq(clientOffices.id, id));
  }

  async listClientContacts(clientId: number): Promise<ClientContact[]> {
    return await db.select().from(clientContacts).where(eq(clientContacts.clientId, clientId));
  }

  async getClientContact(id: number): Promise<ClientContact | undefined> {
    const [contact] = await db.select().from(clientContacts).where(eq(clientContacts.id, id));
    return contact;
  }

  async createClientContact(insertContact: InsertClientContact): Promise<ClientContact> {
    const [contact] = await db.insert(clientContacts).values(insertContact).returning();
    return contact;
  }

  async updateClientContact(id: number, data: Partial<ClientContact>): Promise<ClientContact> {
    const [contact] = await db.update(clientContacts).set(data).where(eq(clientContacts.id, id)).returning();
    return contact;
  }

  async deleteClientContact(id: number): Promise<void> {
    await db.delete(contactBuildings).where(eq(contactBuildings.contactId, id));
    await db.delete(clientContacts).where(eq(clientContacts.id, id));
  }

  async listAllContactBuildings(): Promise<ContactBuilding[]> {
    return await db.select().from(contactBuildings).orderBy(contactBuildings.name);
  }

  async listContactBuildings(contactId: number): Promise<ContactBuilding[]> {
    return await db.select().from(contactBuildings).where(eq(contactBuildings.contactId, contactId)).orderBy(contactBuildings.name);
  }

  async createContactBuilding(building: InsertContactBuilding): Promise<ContactBuilding> {
    const [b] = await db.insert(contactBuildings).values(building).returning();
    return b;
  }

  async updateContactBuilding(id: number, data: Partial<InsertContactBuilding>): Promise<ContactBuilding> {
    const [b] = await db.update(contactBuildings).set(data).where(eq(contactBuildings.id, id)).returning();
    return b;
  }

  async deleteContactBuilding(id: number): Promise<void> {
    await db.delete(contactBuildings).where(eq(contactBuildings.id, id));
  }

  async getBuildingActivity(buildingId: number): Promise<{ leads: Lead[]; estimates: Estimate[] }> {
    const buildingLeads = await db.select().from(leads).where(eq(leads.buildingId, buildingId)).orderBy(desc(leads.createdAt));
    const buildingEstimates = await db.select().from(estimates).where(eq(estimates.buildingId, buildingId)).orderBy(desc(estimates.createdAt));
    return { leads: buildingLeads, estimates: buildingEstimates };
  }

  // Leads
  async listLeads(userId?: string): Promise<Lead[]> {
    if (userId) {
      return await db.select().from(leads).where(eq(leads.assignedTo, userId)).orderBy(desc(leads.createdAt));
    }
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(insertLead).returning();
    return lead;
  }

  async updateLead(id: number, updateData: Partial<InsertLead>): Promise<Lead> {
    const [lead] = await db
      .update(leads)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  async updateLeadStage(id: number, stage: any): Promise<Lead> {
    const [lead] = await db
      .update(leads)
      .set({ stage, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  async deleteLead(id: number): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  // Tasks
  async listTasks(userId?: string): Promise<Task[]> {
    if (userId) {
      return await db.select().from(tasks).where(eq(tasks.assignedTo, userId)).orderBy(desc(tasks.createdAt));
    }
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: number, updateData: Partial<InsertTask>): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Reminders
  async listReminders(userId: string): Promise<Reminder[]> {
    return await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.userId, userId), eq(reminders.isDismissed, false)))
      .orderBy(desc(reminders.dueAt));
  }

  async createReminder(insertReminder: InsertReminder): Promise<Reminder> {
    const [reminder] = await db.insert(reminders).values(insertReminder).returning();
    return reminder;
  }

  async dismissReminder(id: number): Promise<Reminder> {
    const [reminder] = await db
      .update(reminders)
      .set({ isDismissed: true })
      .where(eq(reminders.id, id))
      .returning();
    return reminder;
  }

  // Service Catalog
  async listServiceCatalog(): Promise<ServiceCatalogItem[]> {
    return await db.select().from(serviceCatalog).where(eq(serviceCatalog.isActive, true));
  }

  async getServiceCatalogItem(id: number): Promise<ServiceCatalogItem | undefined> {
    const [item] = await db.select().from(serviceCatalog).where(eq(serviceCatalog.id, id));
    return item;
  }

  async createServiceCatalogItem(insertItem: InsertServiceCatalogItem): Promise<ServiceCatalogItem> {
    const [item] = await db.insert(serviceCatalog).values(insertItem).returning();
    return item;
  }

  async updateServiceCatalogItem(id: number, updateData: Partial<InsertServiceCatalogItem>): Promise<ServiceCatalogItem> {
    const [item] = await db
      .update(serviceCatalog)
      .set(updateData)
      .where(eq(serviceCatalog.id, id))
      .returning();
    return item;
  }

  async deleteServiceCatalogItem(id: number): Promise<void> {
    await db.update(serviceCatalog).set({ isActive: false }).where(eq(serviceCatalog.id, id));
  }

  // Estimates
  async listEstimates(userId?: string): Promise<Estimate[]> {
    if (userId) {
      return await db.select().from(estimates).where(eq(estimates.createdBy, userId)).orderBy(desc(estimates.createdAt));
    }
    return await db.select().from(estimates).orderBy(desc(estimates.createdAt));
  }

  async getEstimate(id: number): Promise<Estimate | undefined> {
    const [estimate] = await db.select().from(estimates).where(eq(estimates.id, id));
    return estimate;
  }

  async createEstimate(insertEstimate: InsertEstimate): Promise<Estimate> {
    const [estimate] = await db.insert(estimates).values(insertEstimate).returning();
    return estimate;
  }

  async updateEstimate(id: number, updateData: Partial<InsertEstimate>): Promise<Estimate> {
    const [estimate] = await db
      .update(estimates)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(estimates.id, id))
      .returning();
    return estimate;
  }

  async deleteEstimate(id: number): Promise<void> {
    await db.delete(estimates).where(eq(estimates.id, id));
  }

  // Estimate Line Items
  async listEstimateLineItems(estimateId: number): Promise<EstimateLineItem[]> {
    return await db.select().from(estimateLineItems).where(eq(estimateLineItems.estimateId, estimateId));
  }

  async createEstimateLineItem(insertItem: InsertEstimateLineItem): Promise<EstimateLineItem> {
    const [item] = await db.insert(estimateLineItems).values(insertItem).returning();
    return item;
  }

  async deleteEstimateLineItem(id: number): Promise<void> {
    await db.delete(estimateLineItems).where(eq(estimateLineItems.id, id));
  }

  // Proposals
  async listProposals(): Promise<Proposal[]> {
    return await db.select().from(proposals).orderBy(desc(proposals.createdAt));
  }

  async getProposal(id: number): Promise<Proposal | undefined> {
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id));
    return proposal;
  }

  async createProposal(insertProposal: InsertProposal): Promise<Proposal> {
    const [proposal] = await db.insert(proposals).values(insertProposal).returning();
    return proposal;
  }

  async updateProposal(id: number, updateData: Partial<InsertProposal>): Promise<Proposal> {
    const [proposal] = await db
      .update(proposals)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(proposals.id, id))
      .returning();
    return proposal;
  }

  async deleteProposal(id: number): Promise<void> {
    await db.delete(proposals).where(eq(proposals.id, id));
  }

  // Activity Logs
  async listActivityLogs(entityType?: any, entityId?: number): Promise<ActivityLog[]> {
    let query = db.select().from(activityLogs);
    if (entityType && entityId) {
      query = query.where(and(eq(activityLogs.entityType, entityType), eq(activityLogs.entityId, entityId))) as any;
    }
    return await query.orderBy(desc(activityLogs.createdAt));
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db.insert(activityLogs).values(insertLog).returning();
    return log;
  }

  // Dashboard
  async getDashboardStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      activeLeads,
      pipelineValue,
      openTasks,
      tasksDueToday,
      monthlyRevenue,
      leadStageCounts,
      wonLeads,
      lostLeads,
      overdueTasks,
      estimateStatusCounts,
      bdSpendThisMonth,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(leads).where(sql`${leads.stage} NOT IN ('won', 'lost')`),
      db.select({ total: sql<string>`sum(${leads.value})` }).from(leads).where(sql`${leads.stage} NOT IN ('won', 'lost')`),
      db.select({ count: sql<number>`count(*)` }).from(tasks).where(sql`${tasks.status} != 'done'`),
      db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(sql`${tasks.dueDate} >= ${today}`, sql`${tasks.dueDate} < ${tomorrow}`)),
      db.select({ total: sql<string>`sum(${leads.value})` }).from(leads).where(and(eq(leads.stage, 'won'), sql`${leads.updatedAt} >= ${firstDayOfMonth}`)),
      db.select({ stage: leads.stage, count: sql<number>`count(*)` }).from(leads).groupBy(leads.stage),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.stage, 'won')),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.stage, 'lost')),
      db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(sql`${tasks.status} != 'done'`, sql`${tasks.dueDate} < ${today}`, sql`${tasks.dueDate} IS NOT NULL`)),
      db.select({ status: estimates.status, count: sql<number>`count(*)` }).from(estimates).groupBy(estimates.status),
      db.select({ total: sql<string>`sum(${bdSpendEntries.amount})` }).from(bdSpendEntries).where(sql`${bdSpendEntries.date} >= ${firstDayOfMonth}`),
    ]);

    // Win rate
    const won = Number(wonLeads[0].count);
    const lost = Number(lostLeads[0].count);
    const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : null;

    // Revenue by month — last 6 months
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    const revenueRows = await db
      .select({
        month: sql<string>`TO_CHAR(${leads.updatedAt}, 'YYYY-MM')`,
        revenue: sql<string>`sum(${leads.value})`,
      })
      .from(leads)
      .where(and(eq(leads.stage, 'won'), sql`${leads.updatedAt} >= ${sixMonthsAgo}`))
      .groupBy(sql`TO_CHAR(${leads.updatedAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${leads.updatedAt}, 'YYYY-MM')`);

    // Fill in all 6 months (even empty ones)
    const revenueByMonth: { month: string; revenue: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const found = revenueRows.find(r => r.month === key);
      revenueByMonth.push({ month: key, revenue: found?.revenue || "0" });
    }

    // Top 5 clients by open pipeline value
    const topClientsRows = await db
      .select({
        clientId: clients.id,
        name: clients.name,
        pipelineValue: sql<string>`sum(${leads.value})`,
      })
      .from(leads)
      .innerJoin(clients, eq(leads.clientId, clients.id))
      .where(sql`${leads.stage} NOT IN ('won', 'lost') AND ${leads.clientId} IS NOT NULL`)
      .groupBy(clients.id, clients.name)
      .orderBy(sql`sum(${leads.value}) DESC`)
      .limit(5);

    // MRR Calculation
    const recurringLeads = await db.select().from(leads).where(and(
      eq(leads.contractType, "recurring"),
      sql`${leads.stage} NOT IN ('won', 'lost')`
    ));

    const mrr = recurringLeads.reduce((acc, lead) => {
      const value = parseFloat(lead.value || "0");
      let monthlyValue = 0;
      if (lead.recurringFrequency === "monthly") monthlyValue = value;
      else if (lead.recurringFrequency === "quarterly") monthlyValue = value / 3;
      else if (lead.recurringFrequency === "annual") monthlyValue = value / 12;
      return acc + monthlyValue;
    }, 0);

    return {
      activeLeads: activeLeads[0].count,
      pipelineValue: pipelineValue[0].total || "0",
      openTasks: openTasks[0].count,
      tasksDueToday: tasksDueToday[0].count,
      monthlyRevenue: monthlyRevenue[0].total || "0",
      leadStageCounts,
      winRate,
      overdueTasks: overdueTasks[0].count,
      revenueByMonth,
      estimateStatusCounts,
      bdSpendThisMonth: bdSpendThisMonth[0].total || "0",
      topClients: topClientsRows,
      mrr: mrr.toString(),
    };
  }

  async getTeamPerformanceStats(): Promise<any[]> {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const userList = await db.select().from(users);

    const stats = await Promise.all(
      userList.map(async (user) => {
        const [
          leadsAssigned,
          leadsWon,
          pipelineValue,
          wonValueMonth,
          tasksCompletedMonth,
        ] = await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.assignedTo, user.id)),
          db.select({ count: sql<number>`count(*)` }).from(leads).where(and(eq(leads.assignedTo, user.id), eq(leads.stage, "won"))),
          db.select({ total: sql<string>`sum(${leads.value})` }).from(leads).where(and(eq(leads.assignedTo, user.id), sql`${leads.stage} NOT IN ('won', 'lost')`)),
          db.select({ total: sql<string>`sum(${leads.value})` }).from(leads).where(and(eq(leads.assignedTo, user.id), eq(leads.stage, "won"), sql`${leads.updatedAt} >= ${firstOfMonth}`)),
          db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.assignedTo, user.id), eq(tasks.status, "done"), sql`${tasks.createdAt} >= ${firstOfMonth}`)),
        ]);

        const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || null;
        return {
          userId: user.id,
          name: displayName,
          email: user.email,
          leadsAssigned: leadsAssigned[0].count,
          leadsWon: leadsWon[0].count,
          pipelineValue: pipelineValue[0].total || "0",
          wonValueMonth: wonValueMonth[0].total || "0",
          tasksCompletedMonth: tasksCompletedMonth[0].count,
        };
      })
    );

    return stats.sort((a, b) => Number(b.pipelineValue) - Number(a.pipelineValue));
  }

  // Contact Stages
  async listContactStages(): Promise<ContactStage[]> {
    return await db.select().from(contactStages).orderBy(contactStages.sortOrder);
  }

  async createContactStage(stage: InsertContactStage): Promise<ContactStage> {
    const [created] = await db.insert(contactStages).values(stage).returning();
    return created;
  }

  async updateContactStage(id: number, stage: Partial<InsertContactStage>): Promise<ContactStage> {
    const [updated] = await db.update(contactStages).set(stage).where(eq(contactStages.id, id)).returning();
    return updated;
  }

  async deleteContactStage(id: number): Promise<void> {
    await db.update(clientContacts).set({ stageId: null }).where(eq(clientContacts.stageId, id));
    await db.delete(contactStages).where(eq(contactStages.id, id));
  }

  async reorderContactStages(orderedIds: number[]): Promise<ContactStage[]> {
    await Promise.all(
      orderedIds.map((id, index) =>
        db.update(contactStages).set({ sortOrder: index }).where(eq(contactStages.id, id))
      )
    );
    return this.listContactStages();
  }

  async seedDefaultContactStages(): Promise<void> {
    const existing = await db.select().from(contactStages);
    if (existing.length > 0) return;
    const defaults = [
      { label: "New Contact", color: "gray", sortOrder: 0 },
      { label: "Reached Out", color: "blue", sortOrder: 1 },
      { label: "Connected", color: "purple", sortOrder: 2 },
      { label: "Active Relationship", color: "green", sortOrder: 3 },
      { label: "Inactive", color: "amber", sortOrder: 4 },
    ];
    await db.insert(contactStages).values(defaults);
  }

  // Pipeline Stages
  async listPipelineStages(): Promise<PipelineStage[]> {
    return await db.select().from(pipelineStages).orderBy(pipelineStages.sortOrder);
  }

  async createPipelineStage(stage: InsertPipelineStage): Promise<PipelineStage> {
    const [created] = await db.insert(pipelineStages).values(stage).returning();
    return created;
  }

  async updatePipelineStage(id: number, stage: Partial<InsertPipelineStage>): Promise<PipelineStage> {
    const [updated] = await db.update(pipelineStages).set(stage).where(eq(pipelineStages.id, id)).returning();
    return updated;
  }

  async deletePipelineStage(id: number): Promise<void> {
    await db.delete(pipelineStages).where(eq(pipelineStages.id, id));
  }

  async reorderPipelineStages(orderedIds: number[]): Promise<PipelineStage[]> {
    await Promise.all(
      orderedIds.map((id, index) =>
        db.update(pipelineStages).set({ sortOrder: index }).where(eq(pipelineStages.id, id))
      )
    );
    return this.listPipelineStages();
  }

  async seedDefaultPipelineStages(): Promise<void> {
    const existing = await db.select().from(pipelineStages);
    if (existing.length > 0) return;
    const defaults = [
      { label: "New Lead", slug: "new_lead", sortOrder: 0, color: null },
      { label: "Contacted", slug: "contacted", sortOrder: 1, color: null },
      { label: "Qualified", slug: "qualified", sortOrder: 2, color: null },
      { label: "Proposal Sent", slug: "proposal_sent", sortOrder: 3, color: null },
      { label: "Won", slug: "won", sortOrder: 4, color: "green" },
      { label: "Lost", slug: "lost", sortOrder: 5, color: "red" },
    ];
    await db.insert(pipelineStages).values(defaults);
  }

  // BD Spend
  async getSpendByClient(clientId: number): Promise<BdSpendEntry[]> {
    return await db.select().from(bdSpendEntries)
      .where(eq(bdSpendEntries.clientId, clientId))
      .orderBy(desc(bdSpendEntries.date));
  }

  async getSpendByContact(contactId: number): Promise<BdSpendEntry[]> {
    return await db.select().from(bdSpendEntries)
      .where(eq(bdSpendEntries.contactId, contactId))
      .orderBy(desc(bdSpendEntries.date));
  }

  async createSpendEntry(data: InsertBdSpendEntry): Promise<BdSpendEntry> {
    const [entry] = await db.insert(bdSpendEntries).values(data).returning();
    return entry;
  }

  async deleteSpendEntry(id: number): Promise<void> {
    await db.delete(bdSpendEntries).where(eq(bdSpendEntries.id, id));
  }

  async getAllClientSpendTotals(): Promise<{ clientId: number; total: string }[]> {
    const rows = await db
      .select({
        clientId: bdSpendEntries.clientId,
        total: sql<string>`coalesce(sum(${bdSpendEntries.amount}), 0)`,
      })
      .from(bdSpendEntries)
      .groupBy(bdSpendEntries.clientId);
    return rows;
  }

  async getAllContactSpendTotals(): Promise<{ contactId: number; total: string }[]> {
    const rows = await db
      .select({
        contactId: bdSpendEntries.contactId,
        total: sql<string>`coalesce(sum(${bdSpendEntries.amount}), 0)`,
      })
      .from(bdSpendEntries)
      .where(sql`${bdSpendEntries.contactId} is not null`)
      .groupBy(bdSpendEntries.contactId);
    return rows.map(r => ({ contactId: r.contactId as number, total: r.total }));
  }

  // Pipeline Views
  async listPipelineViews(): Promise<PipelineView[]> {
    return await db.select().from(pipelineViews).orderBy(pipelineViews.createdAt);
  }

  async createPipelineView(view: InsertPipelineView): Promise<PipelineView> {
    const [created] = await db.insert(pipelineViews).values(view).returning();
    return created;
  }

  async updatePipelineView(id: number, view: Partial<InsertPipelineView>): Promise<PipelineView> {
    const [updated] = await db.update(pipelineViews).set(view).where(eq(pipelineViews.id, id)).returning();
    return updated;
  }

  async deletePipelineView(id: number): Promise<void> {
    await db.delete(pipelineViews).where(eq(pipelineViews.id, id));
  }

  // Task Label Definitions
  async listTaskLabelDefinitions(): Promise<TaskLabelDefinition[]> {
    return await db.select().from(taskLabelDefinitions).orderBy(taskLabelDefinitions.sortOrder);
  }

  async createTaskLabelDefinition(label: InsertTaskLabelDefinition): Promise<TaskLabelDefinition> {
    const [created] = await db.insert(taskLabelDefinitions).values(label).returning();
    return created;
  }

  async updateTaskLabelDefinition(id: number, data: Partial<InsertTaskLabelDefinition>): Promise<TaskLabelDefinition> {
    const [updated] = await db.update(taskLabelDefinitions).set(data).where(eq(taskLabelDefinitions.id, id)).returning();
    return updated;
  }

  async deleteTaskLabelDefinition(id: number): Promise<void> {
    // Remove this label ID from all tasks
    await db.execute(sql`UPDATE tasks SET labels = array_remove(labels, ${String(id)}) WHERE ${String(id)} = ANY(labels)`);
    await db.delete(taskLabelDefinitions).where(eq(taskLabelDefinitions.id, id));
  }

  // Task Columns
  async listTaskColumns(): Promise<TaskColumn[]> {
    return await db.select().from(taskColumns).orderBy(taskColumns.sortOrder);
  }

  async createTaskColumn(col: InsertTaskColumn): Promise<TaskColumn> {
    const [created] = await db.insert(taskColumns).values(col).returning();
    return created;
  }

  async updateTaskColumn(id: number, data: Partial<InsertTaskColumn>): Promise<TaskColumn> {
    const [updated] = await db.update(taskColumns).set(data).where(eq(taskColumns.id, id)).returning();
    return updated;
  }

  async deleteTaskColumn(id: number): Promise<void> {
    await db.delete(taskColumns).where(eq(taskColumns.id, id));
  }

  async seedDefaultTaskColumns(): Promise<void> {
    const defaults = [
      { name: "To Do", slug: "todo", sortOrder: 0, isDefault: true },
      { name: "In Progress", slug: "in_progress", sortOrder: 1, isDefault: true },
      { name: "Done", slug: "done", sortOrder: 2, isDefault: true },
    ];
    for (const col of defaults) {
      await db.execute(sql`INSERT INTO task_columns (name, slug, sort_order, is_default) VALUES (${col.name}, ${col.slug}, ${col.sortOrder}, ${col.isDefault}) ON CONFLICT (slug) DO NOTHING`);
    }
  }

  // Meetings
  async listMeetings(userId: string): Promise<Meeting[]> {
    return await db.select().from(meetings).where(eq(meetings.createdBy, userId)).orderBy(desc(meetings.date));
  }

  async getMeeting(id: number): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting;
  }

  async createMeeting(data: InsertMeeting): Promise<Meeting> {
    const [meeting] = await db.insert(meetings).values(data).returning();
    return meeting;
  }

  async updateMeeting(id: number, data: Partial<InsertMeeting>): Promise<Meeting> {
    const [meeting] = await db.update(meetings).set(data).where(eq(meetings.id, id)).returning();
    return meeting;
  }

  async deleteMeeting(id: number): Promise<void> {
    await db.delete(meetingActions).where(eq(meetingActions.meetingId, id));
    await db.delete(meetings).where(eq(meetings.id, id));
  }

  // Meeting Actions
  async listMeetingActions(meetingId: number): Promise<MeetingAction[]> {
    return await db.select().from(meetingActions).where(eq(meetingActions.meetingId, meetingId));
  }

  async createMeetingAction(data: InsertMeetingAction): Promise<MeetingAction> {
    const [action] = await db.insert(meetingActions).values(data).returning();
    return action;
  }

  async updateMeetingAction(id: number, data: Partial<MeetingAction>): Promise<MeetingAction> {
    const [action] = await db.update(meetingActions).set(data).where(eq(meetingActions.id, id)).returning();
    return action;
  }

  // Role Configs
  async listRoleConfigs(): Promise<RoleConfig[]> {
    return await db.select().from(roleConfigs);
  }

  async updateRoleConfig(roleKey: string, displayName: string): Promise<RoleConfig> {
    const existing = await db.select().from(roleConfigs).where(eq(roleConfigs.roleKey, roleKey));
    if (existing.length === 0) {
      const [config] = await db.insert(roleConfigs).values({ roleKey, displayName }).returning();
      return config;
    }
    const [config] = await db.update(roleConfigs).set({ displayName }).where(eq(roleConfigs.roleKey, roleKey)).returning();
    return config;
  }

  async createRoleConfig(roleKey: string, displayName: string): Promise<RoleConfig> {
    const [config] = await db.insert(roleConfigs).values({ roleKey, displayName }).returning();
    return config;
  }

  async deleteRoleConfig(roleKey: string): Promise<void> {
    if (roleKey === "admin") throw new Error("Cannot delete the admin role");
    await db.update(users).set({ role: "member" }).where(eq(users.role, roleKey));
    await db.delete(rolePermissions).where(eq(rolePermissions.roleKey, roleKey));
    await db.delete(roleConfigs).where(eq(roleConfigs.roleKey, roleKey));
  }

  // Role Permissions
  async listRolePermissions(): Promise<RolePermission[]> {
    return await db.select().from(rolePermissions);
  }

  async getRolePermission(roleKey: string, module: string): Promise<RolePermission | undefined> {
    const [perm] = await db.select().from(rolePermissions).where(
      and(eq(rolePermissions.roleKey, roleKey), eq(rolePermissions.module, module))
    );
    return perm;
  }

  async upsertRolePermission(roleKey: string, module: string, accessLevel: string): Promise<RolePermission> {
    const existing = await this.getRolePermission(roleKey, module);
    if (existing) {
      const [perm] = await db.update(rolePermissions).set({ accessLevel }).where(eq(rolePermissions.id, existing.id)).returning();
      return perm;
    }
    const [perm] = await db.insert(rolePermissions).values({ roleKey, module, accessLevel }).returning();
    return perm;
  }

  async seedDefaultPermissions(): Promise<void> {
    const defaults: { roleKey: string; module: string; accessLevel: string }[] = [
      { roleKey: "manager", module: "dashboard", accessLevel: "full" },
      { roleKey: "manager", module: "leads", accessLevel: "full" },
      { roleKey: "manager", module: "customers", accessLevel: "full" },
      { roleKey: "manager", module: "tasks", accessLevel: "full" },
      { roleKey: "manager", module: "meetings", accessLevel: "full" },
      { roleKey: "manager", module: "estimates", accessLevel: "full" },
      { roleKey: "manager", module: "service_catalog", accessLevel: "full" },
      { roleKey: "manager", module: "proposals", accessLevel: "full" },
      { roleKey: "manager", module: "email_sync", accessLevel: "full" },
      { roleKey: "manager", module: "announcements", accessLevel: "full" },
      { roleKey: "member", module: "dashboard", accessLevel: "view_all" },
      { roleKey: "member", module: "leads", accessLevel: "own_only" },
      { roleKey: "member", module: "customers", accessLevel: "own_only" },
      { roleKey: "member", module: "tasks", accessLevel: "own_only" },
      { roleKey: "member", module: "meetings", accessLevel: "own_only" },
      { roleKey: "member", module: "estimates", accessLevel: "own_only" },
      { roleKey: "member", module: "service_catalog", accessLevel: "view_all" },
      { roleKey: "member", module: "proposals", accessLevel: "view_all" },
      { roleKey: "member", module: "email_sync", accessLevel: "own_only" },
      { roleKey: "member", module: "announcements", accessLevel: "view_all" },
    ];
    for (const d of defaults) {
      const existing = await this.getRolePermission(d.roleKey, d.module);
      if (!existing) {
        await db.insert(rolePermissions).values(d);
      }
    }

    const roleConfigDefaults = [
      { roleKey: "admin", displayName: "Admin" },
      { roleKey: "manager", displayName: "Manager" },
      { roleKey: "member", displayName: "Member" },
    ];
    for (const r of roleConfigDefaults) {
      const existing = await db.select().from(roleConfigs).where(eq(roleConfigs.roleKey, r.roleKey));
      if (existing.length === 0) {
        await db.insert(roleConfigs).values(r);
      }
    }
  }

  async seedInitialAdmin(email: string): Promise<void> {
    await db.update(users).set({ role: "admin" }).where(eq(users.email, email));
  }

  // Gmail Tokens
  async updateGmailTokens(
    userId: string,
    data: {
      gmailAccessToken: string;
      gmailRefreshToken: string | null;
      gmailTokenExpiry: Date | null;
      gmailEmail: string | null;
      gmailConnected: boolean;
    }
  ): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        gmailAccessToken: data.gmailAccessToken,
        gmailRefreshToken: data.gmailRefreshToken,
        gmailTokenExpiry: data.gmailTokenExpiry,
        gmailEmail: data.gmailEmail,
        gmailConnected: data.gmailConnected,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updateCalendarTokens(
    userId: string,
    data: {
      calendarAccessToken: string;
      calendarRefreshToken: string | null;
      calendarTokenExpiry: Date | null;
      calendarEmail: string | null;
      calendarConnected: boolean;
    }
  ): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        calendarAccessToken: data.calendarAccessToken,
        calendarRefreshToken: data.calendarRefreshToken,
        calendarTokenExpiry: data.calendarTokenExpiry,
        calendarEmail: data.calendarEmail,
        calendarConnected: data.calendarConnected,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  // Email Messages
  async listEmailMessages(filters?: { clientId?: number; leadId?: number; userId?: string }): Promise<EmailMessage[]> {
    let query = db.select().from(emailMessages).orderBy(desc(emailMessages.receivedAt)) as any;
    if (filters?.clientId) {
      query = query.where(eq(emailMessages.clientId, filters.clientId));
    } else if (filters?.leadId) {
      query = query.where(eq(emailMessages.leadId, filters.leadId));
    } else if (filters?.userId) {
      query = query.where(eq(emailMessages.userId, filters.userId));
    }
    return await query;
  }

  async getEmailMessage(id: number): Promise<EmailMessage | undefined> {
    const [msg] = await db.select().from(emailMessages).where(eq(emailMessages.id, id));
    return msg;
  }

  async upsertEmailMessage(data: InsertEmailMessage): Promise<EmailMessage> {
    const existing = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.gmailMessageId, data.gmailMessageId));
    if (existing.length > 0) {
      const [updated] = await db
        .update(emailMessages)
        .set(data)
        .where(eq(emailMessages.gmailMessageId, data.gmailMessageId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(emailMessages).values(data).returning();
    return created;
  }

  async updateEmailMessage(id: number, data: Partial<InsertEmailMessage>): Promise<EmailMessage> {
    const [updated] = await db
      .update(emailMessages)
      .set(data)
      .where(eq(emailMessages.id, id))
      .returning();
    return updated;
  }

  async listUnrespondedInboundEmails(olderThanDays: number, userId: string): Promise<EmailMessage[]> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const inboundNeedingResponse = await db
      .select()
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.userId, userId),
          eq(emailMessages.direction, "inbound"),
          eq(emailMessages.requiresResponse, true),
          eq(emailMessages.followUpReminderCreated, false),
          lt(emailMessages.receivedAt, cutoff)
        )
      );

    const results: EmailMessage[] = [];
    for (const email of inboundNeedingResponse) {
      const outboundInThread = await db
        .select()
        .from(emailMessages)
        .where(
          and(
            eq(emailMessages.gmailThreadId, email.gmailThreadId),
            eq(emailMessages.direction, "outbound")
          )
        );
      if (outboundInThread.length === 0) {
        results.push(email);
      }
    }
    return results;
  }

  // Lead Notes
  async listLeadNotes(leadId: number): Promise<LeadNote[]> {
    return db.select().from(leadNotes).where(eq(leadNotes.leadId, leadId)).orderBy(desc(leadNotes.createdAt));
  }

  async createLeadNote(data: InsertLeadNote): Promise<LeadNote> {
    const [note] = await db.insert(leadNotes).values(data).returning();
    return note;
  }

  async deleteLeadNote(id: number): Promise<void> {
    await db.delete(leadNotes).where(eq(leadNotes.id, id));
  }

  // Announcements
  async listAnnouncements(userId: string): Promise<Announcement[]> {
    const all = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
    return all.filter((a) => !a.targetUserIds || a.targetUserIds.includes(userId));
  }

  async getUnreadAnnouncementCount(userId: string): Promise<number> {
    const visible = await this.listAnnouncements(userId);
    if (visible.length === 0) return 0;
    const reads = await db
      .select()
      .from(announcementReads)
      .where(eq(announcementReads.userId, userId));
    const readIds = new Set(reads.map((r) => r.announcementId));
    return visible.filter((a) => !readIds.has(a.id)).length;
  }

  async createAnnouncement(data: InsertAnnouncement): Promise<Announcement> {
    const [created] = await db.insert(announcements).values(data).returning();
    return created;
  }

  async markAnnouncementRead(announcementId: number, userId: string): Promise<void> {
    const existing = await db
      .select()
      .from(announcementReads)
      .where(and(eq(announcementReads.announcementId, announcementId), eq(announcementReads.userId, userId)));
    if (existing.length === 0) {
      await db.insert(announcementReads).values({ announcementId, userId });
    }
  }

  async markAllAnnouncementsRead(userId: string): Promise<void> {
    const visible = await this.listAnnouncements(userId);
    const reads = await db.select().from(announcementReads).where(eq(announcementReads.userId, userId));
    const readIds = new Set(reads.map((r) => r.announcementId));
    for (const a of visible) {
      if (!readIds.has(a.id)) {
        await db.insert(announcementReads).values({ announcementId: a.id, userId });
      }
    }
  }

  // Attachments
  async createAttachment(data: InsertAttachment): Promise<Attachment> {
    const [attachment] = await db.insert(attachments).values(data).returning();
    return attachment;
  }

  async getAttachments(entityType: string, entityId: number): Promise<Attachment[]> {
    return await db
      .select()
      .from(attachments)
      .where(and(eq(attachments.entityType, entityType), eq(attachments.entityId, entityId)))
      .orderBy(desc(attachments.createdAt));
  }

  async getAttachment(id: number): Promise<Attachment | undefined> {
    const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id));
    return attachment;
  }

  async deleteAttachment(id: number): Promise<void> {
    await db.delete(attachments).where(eq(attachments.id, id));
  }

  // Push Subscriptions
  async createPushSubscription(data: InsertPushSubscription): Promise<PushSubscription> {
    const [sub] = await db.insert(pushSubscriptions).values(data).returning();
    return sub;
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async listPushSubscriptions(userId?: string): Promise<PushSubscription[]> {
    if (userId) {
      return await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    }
    return await db.select().from(pushSubscriptions);
  }

  // Building Portfolios
  async listPortfolios(clientId?: number): Promise<BuildingPortfolio[]> {
    if (clientId !== undefined) {
      return await db.select().from(buildingPortfolios).where(eq(buildingPortfolios.clientId, clientId)).orderBy(buildingPortfolios.name);
    }
    return await db.select().from(buildingPortfolios).orderBy(buildingPortfolios.name);
  }

  async getPortfolio(id: number): Promise<(BuildingPortfolio & { buildings: PortfolioBuilding[]; contacts: PortfolioContact[] }) | undefined> {
    const [portfolio] = await db.select().from(buildingPortfolios).where(eq(buildingPortfolios.id, id));
    if (!portfolio) return undefined;
    const buildings = await db.select().from(portfolioBuildings).where(eq(portfolioBuildings.portfolioId, id));
    const contacts = await db.select().from(portfolioContacts).where(eq(portfolioContacts.portfolioId, id));
    return { ...portfolio, buildings, contacts };
  }

  async createPortfolio(data: InsertBuildingPortfolio): Promise<BuildingPortfolio> {
    const [portfolio] = await db.insert(buildingPortfolios).values(data).returning();
    return portfolio;
  }

  async updatePortfolio(id: number, data: Partial<InsertBuildingPortfolio>): Promise<BuildingPortfolio> {
    const [portfolio] = await db.update(buildingPortfolios).set(data).where(eq(buildingPortfolios.id, id)).returning();
    return portfolio;
  }

  async deletePortfolio(id: number): Promise<void> {
    await db.delete(buildingPortfolios).where(eq(buildingPortfolios.id, id));
  }

  async addBuildingToPortfolio(portfolioId: number, buildingId: number): Promise<PortfolioBuilding> {
    const existing = await db.select().from(portfolioBuildings)
      .where(and(eq(portfolioBuildings.portfolioId, portfolioId), eq(portfolioBuildings.buildingId, buildingId)));
    if (existing.length > 0) return existing[0];
    const [row] = await db.insert(portfolioBuildings).values({ portfolioId, buildingId }).returning();
    return row;
  }

  async removeBuildingFromPortfolio(portfolioId: number, buildingId: number): Promise<void> {
    await db.delete(portfolioBuildings)
      .where(and(eq(portfolioBuildings.portfolioId, portfolioId), eq(portfolioBuildings.buildingId, buildingId)));
  }

  async addContactToPortfolio(portfolioId: number, contactId: number, role?: string | null): Promise<PortfolioContact> {
    const existing = await db.select().from(portfolioContacts)
      .where(and(eq(portfolioContacts.portfolioId, portfolioId), eq(portfolioContacts.contactId, contactId)));
    if (existing.length > 0) {
      if (role !== undefined) {
        const [updated] = await db.update(portfolioContacts).set({ role: role ?? null })
          .where(eq(portfolioContacts.id, existing[0].id)).returning();
        return updated;
      }
      return existing[0];
    }
    const [row] = await db.insert(portfolioContacts).values({ portfolioId, contactId, role: role ?? null }).returning();
    return row;
  }

  async removeContactFromPortfolio(portfolioId: number, contactId: number): Promise<void> {
    await db.delete(portfolioContacts)
      .where(and(eq(portfolioContacts.portfolioId, portfolioId), eq(portfolioContacts.contactId, contactId)));
  }

  // Deal Tags
  async listDealTags(): Promise<DealTag[]> {
    return await db.select().from(dealTags).orderBy(dealTags.name);
  }

  async createDealTag(data: InsertDealTag): Promise<DealTag> {
    const [tag] = await db.insert(dealTags).values(data).returning();
    return tag;
  }

  async deleteDealTag(id: number): Promise<void> {
    await db.delete(dealTags).where(eq(dealTags.id, id));
  }

  async ensureDealTag(name: string): Promise<DealTag> {
    const [existing] = await db.select().from(dealTags).where(eq(dealTags.name, name.toLowerCase().trim()));
    if (existing) return existing;
    const [created] = await db.insert(dealTags).values({ name: name.toLowerCase().trim() }).returning();
    return created;
  }

  // User Profile Self-Edit
  async updateUserProfile(id: string, data: { firstName?: string; lastName?: string; phone?: string; profileImageUrl?: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Bulk Operations
  async deleteBulkClients(ids: number[]): Promise<void> {
    if (!ids.length) return;
    for (const id of ids) {
      await db.delete(clients).where(eq(clients.id, id));
    }
  }

  async deleteBulkClientContacts(ids: number[]): Promise<void> {
    if (!ids.length) return;
    for (const id of ids) {
      await db.delete(clientContacts).where(eq(clientContacts.id, id));
    }
  }

  async bulkUpdateClientContacts(ids: number[], data: Partial<ClientContact>): Promise<void> {
    if (!ids.length) return;
    for (const id of ids) {
      const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      if (Object.keys(clean).length > 0) {
        await db.update(clientContacts).set(clean as any).where(eq(clientContacts.id, id));
      }
    }
  }

  async bulkUpdateClients(ids: number[], data: Partial<Client>): Promise<void> {
    if (!ids.length) return;
    for (const id of ids) {
      const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      if (Object.keys(clean).length > 0) {
        await db.update(clients).set({ ...clean as any, updatedAt: new Date() }).where(eq(clients.id, id));
      }
    }
  }

  async getLeadsActivitySummary(userId?: string): Promise<{ leadId: number; lastActivityAt: Date | null; stageChangedAt: Date | null }[]> {
    const activityLogsSub = db
      .select({
        leadId: activityLogs.entityId,
        maxDate: sql<Date>`max(${activityLogs.createdAt})`.as("max_date"),
      })
      .from(activityLogs)
      .where(eq(activityLogs.entityType, "lead"))
      .groupBy(activityLogs.entityId)
      .as("als");

    const leadNotesSub = db
      .select({
        leadId: leadNotes.leadId,
        maxDate: sql<Date>`max(${leadNotes.createdAt})`.as("max_date"),
      })
      .from(leadNotes)
      .groupBy(leadNotes.leadId)
      .as("lns");

    const stageUpdatedSub = db
      .select({
        leadId: activityLogs.entityId,
        maxDate: sql<Date>`max(${activityLogs.createdAt})`.as("max_date"),
      })
      .from(activityLogs)
      .where(and(eq(activityLogs.entityType, "lead"), eq(activityLogs.action, "stage_updated")))
      .groupBy(activityLogs.entityId)
      .as("sus");

    let leadQuery = db.select({ id: leads.id }).from(leads);
    if (userId) {
      leadQuery = leadQuery.where(eq(leads.assignedTo, userId)) as any;
    }
    const leadList = await leadQuery;
    const leadIds = leadList.map(l => l.id);
    if (leadIds.length === 0) return [];

    const results = await db
      .select({
        leadId: leads.id,
        logActivity: activityLogsSub.maxDate,
        noteActivity: leadNotesSub.maxDate,
        stageChangedAt: stageUpdatedSub.maxDate,
      })
      .from(leads)
      .leftJoin(activityLogsSub, eq(leads.id, activityLogsSub.leadId))
      .leftJoin(leadNotesSub, eq(leads.id, leadNotesSub.leadId))
      .leftJoin(stageUpdatedSub, eq(leads.id, stageUpdatedSub.leadId))
      .where(sql`${leads.id} IN ${leadIds}`);

    return results.map(r => {
      const logDate = r.logActivity ? new Date(r.logActivity) : null;
      const noteDate = r.noteActivity ? new Date(r.noteActivity) : null;
      let lastActivityAt = null;
      if (logDate && noteDate) {
        lastActivityAt = logDate > noteDate ? logDate : noteDate;
      } else {
        lastActivityAt = logDate || noteDate;
      }

      return {
        leadId: r.leadId,
        lastActivityAt,
        stageChangedAt: r.stageChangedAt ? new Date(r.stageChangedAt) : null,
      };
    });
  }
}

export const storage = new DatabaseStorage();
