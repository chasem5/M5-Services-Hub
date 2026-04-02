import { db } from "./db";
import { eq, and, desc, sql, lt, or, inArray } from "drizzle-orm";
import { computeHealthScoreV2, computeVelocityDirection, computeInvoiceTrend } from "./health-utils";
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
  taskBoards,
  taskBoardMembers,
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
  emailThreadNotes,
  dismissedSenders,
  leadNotes,
  announcements,
  announcementReads,
  attachments,
  pushSubscriptions,
  buildingPortfolios,
  portfolioBuildings,
  portfolioContacts,
  buildingContacts,
  dealTags,
  industryOptions,
  valueTierSettings,
  appSettings,
  buildopsSyncLog,
  buildopsEmployees,
  buildopsAgreements,
  buildopsInvoices,
  buildopsJobs,
  clientOnboardingChecklist,
  ONBOARDING_TOTAL_ITEMS,
  aiFeedback,
  actionPlans,
  type ActionPlan,
  type InsertActionPlan,
  type BuildopsSyncLog,
  type AiFeedback,
  type InsertAiFeedback,
  type DealTag,
  type InsertDealTag,
  type IndustryOption,
  type InsertIndustryOption,
  type ValueTierSetting,
  type BuildingPortfolio,
  type InsertBuildingPortfolio,
  type PortfolioBuilding,
  type PortfolioContact,
  type BuildingContact,
  type DismissedSender,
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
  type TaskBoard,
  type InsertTaskBoard,
  type TaskBoardMember,
  type InsertTaskBoardMember,
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
  type EmailThreadNote,
  type InsertEmailThreadNote,
  type LeadNote,
  type InsertLeadNote,
  type Announcement,
  type InsertAnnouncement,
  type Attachment,
  type InsertAttachment,
  type PushSubscription,
  type InsertPushSubscription,
  type ClientOnboardingChecklist,
  type InsertClientOnboardingChecklist,
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
  listClientChildren(parentId: number, userId?: string): Promise<Client[]>;
  getClientGroupRollup(parentId: number, childIds: number[], children: Client[]): Promise<{
    combinedLtv: number;
    combinedActiveJobs: number;
    combinedTotalJobs: number;
    combinedAnnualRevenue: number;
  }>;
  migrateParentClientColumn(): Promise<void>;

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
  updateLeadStage(id: number, stage: string, lossReason?: string, lossNote?: string): Promise<Lead>;
  deleteLead(id: number): Promise<void>;

  // Tasks
  listTasks(userId?: string, boardId?: number): Promise<Task[]>;
  listVisibleTasks(requestingUserId: string, scopedUserId?: string): Promise<Task[]>;
  listNonPrivateTasks(requestingUserId?: string): Promise<Task[]>;
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
  getDashboardStats(filterUserId?: string): Promise<any>;
  getTeamPerformanceStats(): Promise<any[]>;

  // Value Tier Settings
  getValueTierSettings(): Promise<ValueTierSetting[]>;
  updateValueTierSetting(tier: string, estimatedValue: number): Promise<ValueTierSetting>;

  // Pipeline Stages
  listContactStages(): Promise<ContactStage[]>;
  createContactStage(stage: InsertContactStage): Promise<ContactStage>;
  updateContactStage(id: number, stage: Partial<InsertContactStage>): Promise<ContactStage>;
  deleteContactStage(id: number): Promise<void>;
  reorderContactStages(orderedIds: number[]): Promise<ContactStage[]>;
  seedDefaultContactStages(): Promise<void>;
  migrateContactStages(): Promise<void>;
  migrateLeadServiceTypes(): Promise<void>;
  migrateIndustryOptions(): Promise<void>;
  migrateDashboardFilter(): Promise<void>;
  migrateEmailNotificationPreferences(): Promise<void>;
  migrateBuildopsClientColumns(): Promise<void>;
  migrateBuildopsPropertyColumns(): Promise<void>;
  migrateBuildopsVisitsAndExtendedFields(): Promise<void>;
  migrateBuildopsTimesheets(): Promise<void>;
  migrateAgreementCsvColumns(): Promise<void>;
  migrateJobMarginAndGenericCsvTables(): Promise<void>;
  migrateTaskBoards(): Promise<void>;

  // Industry Options
  listIndustryOptions(): Promise<IndustryOption[]>;
  createIndustryOption(data: InsertIndustryOption): Promise<IndustryOption>;
  deleteIndustryOption(id: number): Promise<void>;
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

  // Task Boards
  listTaskBoards(userId: string): Promise<(TaskBoard & { memberCount: number; myRole: string })[]>;
  getTaskBoard(id: number): Promise<TaskBoard | undefined>;
  createTaskBoard(data: InsertTaskBoard): Promise<TaskBoard>;
  updateTaskBoard(id: number, data: Partial<InsertTaskBoard>): Promise<TaskBoard>;
  deleteTaskBoard(id: number): Promise<void>;
  canUserAccessBoard(boardId: number, userId: string): Promise<boolean>;
  getTaskBoardMembers(boardId: number): Promise<(TaskBoardMember & { user: { id: string; firstName: string | null; lastName: string | null; email: string | null; profileImageUrl: string | null } })[]>;
  addTaskBoardMember(boardId: number, userId: string, role?: "owner" | "member"): Promise<TaskBoardMember>;
  removeTaskBoardMember(boardId: number, userId: string): Promise<void>;
  getDefaultBoardId(): Promise<number | undefined>;
  seedDefaultTaskBoard(): Promise<void>;

  // Task Columns
  listTaskColumns(boardId?: number): Promise<TaskColumn[]>;
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
  seedTestEmails(): Promise<void>;
  migrateAdminToSuperAdmin(): Promise<void>;
  migrateLeadLossColumns(): Promise<void>;

  // Gmail Tokens
  updateGmailTokens(userId: string, data: { gmailAccessToken: string; gmailRefreshToken: string | null; gmailTokenExpiry: Date | null; gmailEmail: string | null; gmailConnected: boolean }): Promise<User>;

  // Calendar Tokens
  updateCalendarTokens(userId: string, data: { calendarAccessToken: string; calendarRefreshToken: string | null; calendarTokenExpiry: Date | null; calendarEmail: string | null; calendarConnected: boolean }): Promise<User>;

  // App Settings
  getAppSetting(key: string): Promise<string | null>;
  setAppSetting(key: string, value: string): Promise<void>;

  // Lead Notes
  listLeadNotes(leadId: number): Promise<LeadNote[]>;
  createLeadNote(data: InsertLeadNote): Promise<LeadNote>;
  deleteLeadNote(id: number): Promise<void>;

  // Email Messages
  listEmailMessages(filters?: { clientId?: number; leadId?: number; userId?: string; includeDismissed?: boolean }): Promise<EmailMessage[]>;
  getEmailMessage(id: number): Promise<EmailMessage | undefined>;
  upsertEmailMessage(data: InsertEmailMessage): Promise<EmailMessage>;
  updateEmailMessage(id: number, data: Partial<InsertEmailMessage>): Promise<EmailMessage>;
  listUnrespondedInboundEmails(olderThanDays: number, userId: string): Promise<EmailMessage[]>;
  bulkAssignEmailThreads(gmailThreadIds: string[], assignedUserId: string): Promise<void>;
  migrateEmailMessageColumns(): Promise<void>;
  migrateMeetingTypeColumn(): Promise<void>;

  // Email Thread Notes
  listEmailThreadNotes(gmailThreadId: string): Promise<(EmailThreadNote & { userName: string })[]>;
  createEmailThreadNote(data: InsertEmailThreadNote): Promise<EmailThreadNote>;
  getEmailThreadNote(id: number): Promise<EmailThreadNote | undefined>;
  deleteEmailThreadNote(id: number): Promise<void>;

  // Dismissed Senders
  getDismissedSenders(userId: string): Promise<DismissedSender[]>;
  addDismissedSender(userId: string, emailAddress: string): Promise<DismissedSender>;
  removeDismissedSender(userId: string, emailAddress: string): Promise<void>;
  isDismissedSender(userId: string, emailAddress: string): Promise<boolean>;

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

  // Building Contacts (multiple contacts per building)
  getBuildingContacts(buildingId: number): Promise<BuildingContact[]>;
  addContactToBuilding(buildingId: number, contactId: number): Promise<BuildingContact>;
  removeContactFromBuilding(buildingId: number, contactId: number): Promise<void>;

  // Deal Tags
  listDealTags(): Promise<DealTag[]>;
  createDealTag(data: InsertDealTag): Promise<DealTag>;
  deleteDealTag(id: number): Promise<void>;
  ensureDealTag(name: string): Promise<DealTag>;

  // User Profile Self-Edit
  updateUserProfile(id: string, data: { firstName?: string; lastName?: string; phone?: string; profileImageUrl?: string; dashboardFilter?: string; emailNotifyTaskAssigned?: boolean; emailNotifyTaskDue?: boolean; emailNotifyAnnouncement?: boolean; emailNotifyReminder?: boolean }): Promise<User>;

  // BuildOps Rep Matching
  getBuildOpsRepsForMatching(): Promise<{ buildopsId: string; name: string; email: string | null }[]>;
  upsertBuildOpsEmployees(employees: { buildopsId: string; name: string; email: string | null; phone: string | null; title: string | null; isActive: boolean }[]): Promise<{ created: number; updated: number }>;
  updateUserBuildopsRep(userId: string, buildopsRepId: string | null): Promise<User>;
  getAllBuildOpsEmployees(): Promise<BuildopsEmployee[]>;
  updateBuildOpsEmployeeType(id: number, employmentType: string): Promise<BuildopsEmployee>;

  // Bulk Operations
  deleteBulkClients(ids: number[]): Promise<void>;
  deleteBulkClientContacts(ids: number[]): Promise<void>;
  bulkUpdateClientContacts(ids: number[], data: Partial<ClientContact>): Promise<void>;
  bulkUpdateClients(ids: number[], data: Partial<Client>): Promise<void>;
  bulkUpdateLeads(ids: number[], data: { stagePerLead?: Map<number, string>; assignedTo?: string | null }): Promise<number>;

  // Activity Summary
  getLeadsActivitySummary(userId?: string): Promise<{ leadId: number; lastActivityAt: Date | null; stageChangedAt: Date | null }[]>;

  // AI Feedback
  createAiFeedback(data: InsertAiFeedback): Promise<AiFeedback>;

  // BuildOps Sync Log
  createBuildopsSyncLog(data: { entityType: string; entityId?: number | null; buildopsId?: string | null; action: string; message?: string | null }): Promise<BuildopsSyncLog>;
  listBuildopsSyncLogs(limit?: number): Promise<BuildopsSyncLog[]>;
  getLastBuildopsSync(): Promise<BuildopsSyncLog | null>;

  // Client Onboarding Checklist
  migrateClientOnboardingChecklist(): Promise<void>;
  getClientOnboardingChecklist(clientId: number): Promise<ClientOnboardingChecklist[]>;
  upsertClientOnboardingItem(clientId: number, itemKey: string, isCompleted: boolean): Promise<ClientOnboardingChecklist>;
  getOnboardingCompletionMap(clientIds: number[], applicableClientIds?: number[]): Promise<Map<number, { completed: number; total: number }>>;

  // Email Response Rate
  getClientEmailResponseRate(clientId: number): Promise<{ outboundEmails: number; emailsWithReply: number; responseRate: number | null }>;

  // Client Service Segments
  getClientServiceSegments(scopedUserId?: string): Promise<Record<number, string>>;

  // Monthly Business Review
  getMonthlyBusinessReview(year: number, month: number): Promise<any>;

  // Action Plans
  listActionPlans(filters?: { type?: "customer" | "company"; clientId?: number | null; includeCompleted?: boolean }): Promise<ActionPlan[]>;
  getActionPlan(id: number): Promise<ActionPlan | undefined>;
  createActionPlan(data: InsertActionPlan): Promise<ActionPlan>;
  updateActionPlan(id: number, data: Partial<InsertActionPlan>): Promise<ActionPlan>;
  deleteActionPlan(id: number): Promise<void>;
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
    const { sql: rawSql } = await import("drizzle-orm");
    await db.execute(rawSql.raw(`UPDATE "tasks" SET related_client_id = NULL WHERE related_client_id = ${id}`));
    await db.execute(rawSql.raw(`UPDATE "reminders" SET related_client_id = NULL WHERE related_client_id = ${id}`));
    await db.execute(rawSql.raw(`DELETE FROM "email_messages" WHERE client_id = ${id}`));
    await db.execute(rawSql.raw(`DELETE FROM "meetings" WHERE client_id = ${id}`));
    await db.execute(rawSql.raw(`DELETE FROM "proposals" WHERE client_id = ${id}`));
    await db.execute(rawSql.raw(`DELETE FROM "estimates" WHERE client_id = ${id}`));
    await db.execute(rawSql.raw(`DELETE FROM "leads" WHERE client_id = ${id}`));
    await db.execute(rawSql.raw(`DELETE FROM "bd_spend_entries" WHERE client_id = ${id}`));
    await db.execute(rawSql.raw(`DELETE FROM "contact_buildings" WHERE client_id = ${id}`));
    await db.execute(rawSql.raw(`DELETE FROM "building_portfolios" WHERE client_id = ${id}`));
    await db.execute(rawSql.raw(`DELETE FROM "client_contacts" WHERE client_id = ${id}`));
    await db.execute(rawSql.raw(`DELETE FROM "client_offices" WHERE client_id = ${id}`));
    await db.delete(clients).where(eq(clients.id, id));
  }

  async listClientChildren(parentId: number, userId?: string): Promise<Client[]> {
    if (userId) {
      return await db.select().from(clients)
        .where(and(eq(clients.parentClientId, parentId), eq(clients.createdBy, userId)))
        .orderBy(clients.name);
    }
    return await db.select().from(clients).where(eq(clients.parentClientId, parentId)).orderBy(clients.name);
  }

  async getClientGroupRollup(parentId: number, childIds: number[], children: Client[]): Promise<{
    combinedLtv: number;
    combinedActiveJobs: number;
    combinedTotalJobs: number;
    combinedAnnualRevenue: number;
  }> {
    const allIds = [parentId, ...childIds];

    const [ltvRow] = await db
      .select({ total: sql<string>`COALESCE(SUM(CAST(total_amount AS numeric)), 0)` })
      .from(buildopsInvoices)
      .where(inArray(buildopsInvoices.clientId, allIds));
    const combinedLtv = Number(ltvRow?.total ?? 0);

    const [jobRow] = await db
      .select({
        active: sql<string>`COUNT(*) FILTER (WHERE LOWER(status) NOT IN ('closed', 'complete', 'completed', 'canceled', 'cancelled'))`,
        total: sql<string>`COUNT(*)`,
      })
      .from(buildopsJobs)
      .where(inArray(buildopsJobs.clientId, allIds));
    const combinedActiveJobs = Number(jobRow?.active ?? 0);
    const combinedTotalJobs = Number(jobRow?.total ?? 0);

    const parentClient = await this.getClient(parentId);
    const allClients = [parentClient, ...children].filter(Boolean) as Client[];
    const combinedAnnualRevenue = allClients.reduce(
      (sum, c) => sum + (c.annualRevenue ? parseFloat(c.annualRevenue) : 0),
      0
    );

    return { combinedLtv, combinedActiveJobs, combinedTotalJobs, combinedAnnualRevenue };
  }

  async migrateParentClientColumn(): Promise<void> {
    // Step 1: Add column if it doesn't exist (without FK to avoid conflict if column exists)
    try {
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS parent_client_id integer`);
    } catch (e) {
      console.error("migrateParentClientColumn: add column error:", e);
    }
    // Step 2: Always attempt to add FK constraint if not present
    try {
      await db.execute(sql`DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'clients_parent_client_id_fkey'
          AND table_name = 'clients'
        ) THEN
          ALTER TABLE clients ADD CONSTRAINT clients_parent_client_id_fkey
            FOREIGN KEY (parent_client_id) REFERENCES clients(id) ON DELETE SET NULL;
        END IF;
      END $$`);
    } catch (e) {
      console.error("migrateParentClientColumn: FK constraint error:", e);
    }
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
    const setData: Partial<Lead> & { updatedAt: Date } = { ...updateData, updatedAt: new Date() };
    if (updateData.stage === "won") {
      // Only set won_at on actual transition; preserve existing won_at if already set
      const [existing] = await db.select({ stage: leads.stage, wonAt: leads.wonAt }).from(leads).where(eq(leads.id, id));
      if (existing && existing.stage !== "won" && !existing.wonAt) {
        setData.wonAt = new Date();
      }
    }
    const [lead] = await db
      .update(leads)
      .set(setData)
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  async updateLeadStage(id: number, stage: string, lossReason?: string, lossNote?: string): Promise<Lead> {
    const setData: Partial<Lead> & { updatedAt: Date } = { stage, updatedAt: new Date() };
    if (stage === "won") {
      // Only set won_at on transition to won; preserve existing won_at if already set
      const [existing] = await db.select({ stage: leads.stage, wonAt: leads.wonAt }).from(leads).where(eq(leads.id, id));
      if (existing && existing.stage !== "won" && !existing.wonAt) {
        setData.wonAt = new Date();
      }
    }
    if (stage === "lost") {
      // Only set lostAt on transition to lost — don't overwrite if editing reason on an already-lost lead
      const [existing] = await db.select({ stage: leads.stage, lostAt: leads.lostAt }).from(leads).where(eq(leads.id, id));
      if (existing && existing.stage !== "lost") {
        setData.lostAt = new Date();
      }
      // Always update reason/note fields
      setData.lossReason = (lossReason ?? null) as Lead["lossReason"];
      setData.lossNote = lossNote ?? null;
    }
    const [lead] = await db
      .update(leads)
      .set(setData)
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  async deleteLead(id: number): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  // Tasks
  async listTasks(userId?: string, boardId?: number): Promise<Task[]> {
    const conditions = [];
    if (userId) conditions.push(eq(tasks.assignedTo, userId));
    if (boardId !== undefined) conditions.push(eq(tasks.boardId, boardId));
    if (conditions.length > 0) {
      return await db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));
    }
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async listVisibleTasks(requestingUserId: string, scopedUserId?: string): Promise<Task[]> {
    // Get all boards and determine which the requesting user can access
    const allBoards = await db.select().from(taskBoards);
    const memberRows = await db.select().from(taskBoardMembers).where(eq(taskBoardMembers.userId, requestingUserId));
    const memberBoardIds = new Set(memberRows.map(m => m.boardId));

    const accessibleBoardIds = allBoards
      .filter(b => {
        if (b.visibility === "team") return true;
        if (b.visibility === "private") return b.createdBy === requestingUserId;
        // invite-only: owner or explicit member
        return b.createdBy === requestingUserId || memberBoardIds.has(b.id);
      })
      .map(b => b.id);

    if (accessibleBoardIds.length === 0) return [];

    const conditions: ReturnType<typeof eq>[] = [];
    if (scopedUserId) conditions.push(eq(tasks.assignedTo, scopedUserId));

    // NULL-boardId tasks are treated as belonging to the General board (legacy/migration safety)
    // After full migration, all tasks will have a boardId
    const boardFilter = or(
      sql`${tasks.boardId} IS NULL`,
      sql`${tasks.boardId} IN (${sql.join(accessibleBoardIds.map(id => sql`${id}`), sql`, `)})`
    );

    const where = conditions.length > 0 ? and(boardFilter, ...conditions) : boardFilter;
    return await db.select().from(tasks).where(where).orderBy(desc(tasks.createdAt));
  }

  async listNonPrivateTasks(requestingUserId?: string): Promise<Task[]> {
    // For AI: exclude private boards; for invite-only, only include if user is a member
    // NULL-boardId tasks are treated as pre-migration legacy (team-visible)
    const allBoards = await db.select().from(taskBoards);

    let accessibleBoardIds: number[];
    if (requestingUserId) {
      const memberRows = await db.select().from(taskBoardMembers).where(eq(taskBoardMembers.userId, requestingUserId));
      const memberBoardIds = new Set(memberRows.map(m => m.boardId));
      accessibleBoardIds = allBoards
        .filter(b => {
          if (b.visibility === "team") return true;
          if (b.visibility === "private") return false; // always exclude private from AI
          // invite-only: only if owner or member
          return b.createdBy === requestingUserId || memberBoardIds.has(b.id);
        })
        .map(b => b.id);
    } else {
      // No user context: only include team boards
      accessibleBoardIds = allBoards.filter(b => b.visibility === "team").map(b => b.id);
    }

    if (accessibleBoardIds.length === 0) {
      // No accessible boards: only return legacy NULL-boardId tasks
      return await db.select().from(tasks).where(sql`${tasks.boardId} IS NULL`).orderBy(desc(tasks.createdAt));
    }
    return await db.select().from(tasks).where(
      or(
        sql`${tasks.boardId} IS NULL`,
        sql`${tasks.boardId} IN (${sql.join(accessibleBoardIds.map(id => sql`${id}`), sql`, `)})`
      )
    ).orderBy(desc(tasks.createdAt));
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
    await db.delete(estimateLineItems).where(eq(estimateLineItems.estimateId, id));
    await db.delete(proposals).where(eq(proposals.estimateId, id));
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
  async getDashboardStats(filterUserId?: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

    // Load tier settings for pipeline value calculation
    const tierSettings = await this.getValueTierSettings();
    const tierMap: Record<string, number> = {};
    for (const ts of tierSettings) {
      tierMap[ts.tier] = parseFloat(ts.estimatedValue);
    }

    const getLeadValue = (lead: { value: string | null; valueType: string | null; valueTier: string | null }) => {
      if (lead.valueType === "potential" && lead.valueTier) {
        return tierMap[lead.valueTier] ?? 0;
      }
      return parseFloat(lead.value || "0");
    };

    const userFilter = filterUserId ? eq(leads.assignedTo, filterUserId) : undefined;
    const taskUserFilter = filterUserId ? eq(tasks.assignedTo, filterUserId) : undefined;

    // Build client-ID set for account manager scoping (used for BuildOps invoice/job data)
    let managedClientIds: Set<number> | null = null;
    if (filterUserId) {
      const managed = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.accountManagerUserId, filterUserId));
      managedClientIds = new Set(managed.map(c => c.id));
    }

    const activeleadsWhere = userFilter
      ? and(sql`${leads.stage} NOT IN ('won', 'lost')`, userFilter)
      : sql`${leads.stage} NOT IN ('won', 'lost')`;

    // Win rate: last 12 months only
    const wonLeadsWhere = userFilter
      ? and(eq(leads.stage, 'won'), sql`COALESCE(${leads.wonAt}, ${leads.updatedAt}) >= ${twelveMonthsAgo}`, userFilter)
      : and(eq(leads.stage, 'won'), sql`COALESCE(${leads.wonAt}, ${leads.updatedAt}) >= ${twelveMonthsAgo}`);
    const lostLeadsWhere = userFilter
      ? and(eq(leads.stage, 'lost'), sql`${leads.updatedAt} >= ${twelveMonthsAgo}`, userFilter)
      : and(eq(leads.stage, 'lost'), sql`${leads.updatedAt} >= ${twelveMonthsAgo}`);

    const openTasksWhere = taskUserFilter
      ? and(sql`${tasks.status} != 'done'`, taskUserFilter)
      : sql`${tasks.status} != 'done'`;
    const dueTodayWhere = taskUserFilter
      ? and(sql`${tasks.dueDate} >= ${today}`, sql`${tasks.dueDate} < ${tomorrow}`, taskUserFilter)
      : and(sql`${tasks.dueDate} >= ${today}`, sql`${tasks.dueDate} < ${tomorrow}`);
    const overdueWhere = taskUserFilter
      ? and(sql`${tasks.status} != 'done'`, sql`${tasks.dueDate} < ${today}`, sql`${tasks.dueDate} IS NOT NULL`, taskUserFilter)
      : and(sql`${tasks.status} != 'done'`, sql`${tasks.dueDate} < ${today}`, sql`${tasks.dueDate} IS NOT NULL`);

    const [
      activeLeadRows,
      openTasks,
      tasksDueToday,
      leadStageCounts,
      wonLeads,
      lostLeads,
      overdueTasks,
      estimateStatusCounts,
      bdSpendThisMonth,
      buildopsActiveAgreements,
    ] = await Promise.all([
      db.select({
        id: leads.id,
        value: leads.value,
        valueType: leads.valueType,
        valueTier: leads.valueTier,
        stage: leads.stage,
        updatedAt: leads.updatedAt,
        contractType: leads.contractType,
        recurringFrequency: leads.recurringFrequency,
        clientId: leads.clientId,
        buildopsQuoteId: leads.buildopsQuoteId,
        buildopsQuoteTotal: leads.buildopsQuoteTotal,
      }).from(leads).where(activeleadsWhere),
      db.select({ count: sql<number>`count(*)` }).from(tasks).where(openTasksWhere),
      db.select({ count: sql<number>`count(*)` }).from(tasks).where(dueTodayWhere),
      db.select({ stage: leads.stage, count: sql<number>`count(*)` }).from(leads).where(userFilter ? and(sql`1=1`, userFilter) : sql`1=1`).groupBy(leads.stage),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(wonLeadsWhere),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(lostLeadsWhere),
      db.select({ count: sql<number>`count(*)` }).from(tasks).where(overdueWhere),
      db.select({ status: estimates.status, count: sql<number>`count(*)` }).from(estimates).groupBy(estimates.status),
      db.select({ total: sql<string>`sum(${bdSpendEntries.amount})` }).from(bdSpendEntries).where(sql`${bdSpendEntries.date} >= ${firstDayOfMonth}`),
      db.select({
        contractValue: buildopsAgreements.contractValue,
        frequency: buildopsAgreements.frequency,
        startDate: buildopsAgreements.startDate,
        endDate: buildopsAgreements.endDate,
      }).from(buildopsAgreements).where(sql`LOWER(${buildopsAgreements.status}) = 'active'`),
    ]);

    // Active leads: split into CRM (no buildopsQuoteId) and BuildOps (has buildopsQuoteId)
    const crmActiveLeads = activeLeadRows.filter(l => !l.buildopsQuoteId);
    const buildopsActiveLeads = activeLeadRows.filter(l => !!l.buildopsQuoteId);

    // Pipeline value — CRM leads use tier-aware value; BuildOps leads prefer buildopsQuoteTotal
    const pipelineValueCRM = crmActiveLeads.reduce((sum, lead) => sum + getLeadValue(lead), 0);
    const pipelineValueBO = buildopsActiveLeads.reduce((sum, lead) => {
      return sum + (lead.buildopsQuoteTotal ? parseFloat(lead.buildopsQuoteTotal) : getLeadValue(lead));
    }, 0);
    const pipelineValue = pipelineValueCRM + pipelineValueBO;

    // Monthly revenue — BuildOps invoices only (CRM won_at dates are unreliable: all stamped at import time)
    const invoiceBaseWhere = managedClientIds
      ? and(
          sql`${buildopsInvoices.issuedDate} >= ${firstDayOfMonth}`,
          sql`${buildopsInvoices.status} NOT IN ('void', 'cancelled')`,
          sql`${buildopsInvoices.clientId} = ANY(ARRAY[${sql.raw(managedClientIds.size > 0 ? [...managedClientIds].join(',') : '0')}]::int[])`
        )
      : and(
          sql`${buildopsInvoices.issuedDate} >= ${firstDayOfMonth}`,
          sql`${buildopsInvoices.status} NOT IN ('void', 'cancelled')`
        );
    const buildopsInvoiceRows = await db.select({ totalAmount: buildopsInvoices.totalAmount })
      .from(buildopsInvoices)
      .where(invoiceBaseWhere);
    const monthlyRevenue = buildopsInvoiceRows.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || "0"), 0);

    // Win rate: last 12 months, include BuildOps quote wins/losses
    const won = Number(wonLeads[0].count);
    const lost = Number(lostLeads[0].count);

    // BuildOps-only quote wins/losses in last 12 months (exclude leads already counted in CRM won/lost)
    // A lead counted in CRM won/lost has stage='won' or stage='lost'; exclude those to avoid double-counting
    const buildopsWonLostRows = await db.select({
      buildopsQuoteStatus: leads.buildopsQuoteStatus,
      count: sql<number>`count(*)`,
    }).from(leads)
      .where(and(
        sql`${leads.buildopsQuoteId} IS NOT NULL`,
        sql`${leads.buildopsQuoteStatus} IN ('won', 'lost')`,
        sql`${leads.stage} NOT IN ('won', 'lost')`,
        sql`${leads.updatedAt} >= ${twelveMonthsAgo}`,
        userFilter ?? sql`1=1`
      ))
      .groupBy(leads.buildopsQuoteStatus);

    const boWon = buildopsWonLostRows.find(r => r.buildopsQuoteStatus === 'won');
    const boLost = buildopsWonLostRows.find(r => r.buildopsQuoteStatus === 'lost');
    const totalWon = won + Number(boWon?.count ?? 0);
    const totalLost = lost + Number(boLost?.count ?? 0);
    const winRate = (totalWon + totalLost) > 0 ? Math.round((totalWon / (totalWon + totalLost)) * 100) : null;

    // Revenue by month — last 12 months, invoice-only (CRM won_at dates unreliable)
    const invoiceLast12BaseWhere = managedClientIds
      ? and(
          sql`${buildopsInvoices.issuedDate} >= ${twelveMonthsAgo}`,
          sql`${buildopsInvoices.status} NOT IN ('void', 'cancelled')`,
          sql`${buildopsInvoices.clientId} = ANY(ARRAY[${sql.raw(managedClientIds.size > 0 ? [...managedClientIds].join(',') : '0')}]::int[])`
        )
      : and(
          sql`${buildopsInvoices.issuedDate} >= ${twelveMonthsAgo}`,
          sql`${buildopsInvoices.status} NOT IN ('void', 'cancelled')`
        );
    const boInvoiceRevenueRows = await db
      .select({
        month: sql<string>`TO_CHAR(${buildopsInvoices.issuedDate}, 'YYYY-MM')`,
        revenue: sql<string>`sum(${buildopsInvoices.totalAmount})`,
      })
      .from(buildopsInvoices)
      .where(invoiceLast12BaseWhere)
      .groupBy(sql`TO_CHAR(${buildopsInvoices.issuedDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${buildopsInvoices.issuedDate}, 'YYYY-MM')`);

    const revenueByMonth: { month: string; revenue: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const foundBO = boInvoiceRevenueRows.find(r => r.month === key);
      revenueByMonth.push({ month: key, revenue: foundBO?.revenue ?? "0" });
    }

    // Top 5 clients by open pipeline value (tier-aware)
    // When account-manager filter is active, scope by client ownership (managedClientIds), not lead assignee
    const managedIdsClause = managedClientIds && managedClientIds.size > 0
      ? sql`${leads.clientId} = ANY(ARRAY[${sql.raw([...managedClientIds].join(','))}]::int[])`
      : managedClientIds && managedClientIds.size === 0
        ? sql`1=0`
        : null;
    const allActiveLeadsWithClient = await db
      .select({ clientId: leads.clientId, value: leads.value, valueType: leads.valueType, valueTier: leads.valueTier })
      .from(leads)
      .where(managedClientIds
        ? and(sql`${leads.stage} NOT IN ('won', 'lost')`, sql`${leads.clientId} IS NOT NULL`, managedIdsClause!)
        : and(sql`${leads.stage} NOT IN ('won', 'lost')`, sql`${leads.clientId} IS NOT NULL`));

    const clientValueMap: Record<number, number> = {};
    for (const lead of allActiveLeadsWithClient) {
      if (lead.clientId == null) continue;
      clientValueMap[lead.clientId] = (clientValueMap[lead.clientId] || 0) + getLeadValue(lead);
    }
    const allClients = await db.select({ id: clients.id, name: clients.name, parentClientId: clients.parentClientId, accountManagerUserId: clients.accountManagerUserId }).from(clients);

    // Build parent lookup
    const clientParentMap = new Map<number, number>(); // childId → parentId
    for (const c of allClients) {
      if (c.parentClientId != null) clientParentMap.set(c.id, c.parentClientId);
    }

    // Roll up pipeline values: merge child values into parent
    const rolledPipelineMap: Record<number, number> = {};
    for (const [clientIdStr, value] of Object.entries(clientValueMap)) {
      const cid = Number(clientIdStr);
      const effectiveId = clientParentMap.get(cid) ?? cid;
      rolledPipelineMap[effectiveId] = (rolledPipelineMap[effectiveId] ?? 0) + value;
    }
    const topClientsRows = Object.entries(rolledPipelineMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([clientId, value]) => {
        const client = allClients.find(c => c.id === Number(clientId));
        return { clientId: Number(clientId), name: client?.name ?? "Unknown", pipelineValue: value.toString() };
      });

    // Avg Monthly Revenue — rolling 12-month invoice total divided by the number of
    // months that actually had invoices (avoids deflating quarterly or new contracts)
    const [mrrRow] = await db
      .select({
        totalInvoiced: sql<string>`COALESCE(SUM(CAST(${buildopsInvoices.totalAmount} AS numeric)), 0)`,
        monthsWithData: sql<string>`COUNT(DISTINCT TO_CHAR(${buildopsInvoices.issuedDate}, 'YYYY-MM'))`,
      })
      .from(buildopsInvoices)
      .where(invoiceLast12BaseWhere);
    const mrrTotal = parseFloat(mrrRow?.totalInvoiced ?? "0");
    const mrrMonths = Math.max(Number(mrrRow?.monthsWithData ?? 0), 1);
    const mrr = mrrTotal / mrrMonths;

    // Estimate pipeline: include leads with buildopsQuoteId as extra "buildops_quote" entries
    const boQuoteLeads = await db.select({
      id: leads.id,
      clientId: leads.clientId,
      title: leads.title,
      buildopsQuoteId: leads.buildopsQuoteId,
      buildopsQuoteStatus: leads.buildopsQuoteStatus,
      buildopsQuoteTotal: leads.buildopsQuoteTotal,
    }).from(leads)
      .where(and(
        sql`${leads.buildopsQuoteId} IS NOT NULL`,
        sql`${leads.buildopsQuoteStatus} IN ('draft', 'sent')`,
        sql`${leads.stage} NOT IN ('won', 'lost')`,
        userFilter ?? sql`1=1`
      ));

    // Get estimate IDs linked to buildops quotes to avoid double-counting
    const linkedEstimates = await db.select({ buildopsQuoteId: estimates.buildopsQuoteId })
      .from(estimates)
      .where(sql`${estimates.buildopsQuoteId} IS NOT NULL`);
    const linkedBOQuoteIds = new Set(linkedEstimates.map(e => e.buildopsQuoteId).filter(Boolean));

    const unlinkedBOLeads = boQuoteLeads.filter(l => !linkedBOQuoteIds.has(l.buildopsQuoteId));

    // Add buildops quote counts to estimate status counts (mutable copy with number counts)
    const estimateStatusCountsWithBO: { status: string; count: number }[] = estimateStatusCounts.map(e => ({
      status: e.status,
      count: Number(e.count),
    }));
    for (const lead of unlinkedBOLeads) {
      const status = lead.buildopsQuoteStatus === "draft" ? "draft" : "sent";
      const existing = estimateStatusCountsWithBO.find(e => e.status === status);
      if (existing) {
        existing.count = existing.count + 1;
      } else {
        estimateStatusCountsWithBO.push({ status, count: 1 });
      }
    }

    // Won deals by client — fetch all, then roll up children into parent, take top 8
    // When account-manager filter is active, scope by client ownership (managedClientIds)
    const wonDealsByClientRows = await db
      .select({
        clientId: leads.clientId,
        totalValue: sql<string>`SUM(CAST(${leads.value} AS numeric))`,
        dealCount: sql<string>`COUNT(*)`,
      })
      .from(leads)
      .where(and(
        eq(leads.stage, 'won'),
        sql`${leads.clientId} IS NOT NULL`,
        managedClientIds
          ? (managedClientIds.size > 0
              ? sql`${leads.clientId} = ANY(ARRAY[${sql.raw([...managedClientIds].join(','))}]::int[])`
              : sql`1=0`)
          : sql`1=1`
      ))
      .groupBy(leads.clientId)
      .orderBy(sql`SUM(CAST(${leads.value} AS numeric)) DESC`);

    // Roll up child won-deal totals into parent
    const wonByParentMap = new Map<number, { name: string; totalValue: number; dealCount: number }>();
    for (const r of wonDealsByClientRows) {
      const cid = Number(r.clientId);
      const effectiveId = clientParentMap.get(cid) ?? cid;
      const clientRecord = allClients.find(c => c.id === effectiveId);
      const effectiveName = clientRecord?.name ?? "Unknown";
      const existing = wonByParentMap.get(effectiveId);
      if (existing) {
        existing.totalValue += parseFloat(r.totalValue ?? "0");
        existing.dealCount += Number(r.dealCount ?? 0);
      } else {
        wonByParentMap.set(effectiveId, {
          name: effectiveName,
          totalValue: parseFloat(r.totalValue ?? "0"),
          dealCount: Number(r.dealCount ?? 0),
        });
      }
    }
    const wonDealsByClient = Array.from(wonByParentMap.entries())
      .map(([clientId, data]) => ({ clientId, name: data.name, totalValue: data.totalValue.toFixed(2), dealCount: data.dealCount }))
      .sort((a, b) => parseFloat(b.totalValue) - parseFloat(a.totalValue))
      .slice(0, 8);

    return {
      activeLeads: activeLeadRows.length,
      activeLeadsCRM: crmActiveLeads.length,
      activeLeadsBuildOps: buildopsActiveLeads.length,
      pipelineValue: pipelineValue.toString(),
      pipelineValueCRM: pipelineValueCRM.toString(),
      pipelineValueBuildOps: pipelineValueBO.toString(),
      openTasks: openTasks[0].count,
      tasksDueToday: tasksDueToday[0].count,
      monthlyRevenue: monthlyRevenue.toString(),
      leadStageCounts,
      winRate,
      overdueTasks: overdueTasks[0].count,
      revenueByMonth,
      estimateStatusCounts: estimateStatusCountsWithBO,
      bdSpendThisMonth: bdSpendThisMonth[0].total || "0",
      topClients: topClientsRows,
      mrr: mrr.toString(),
      wonDealsByClient,
    };
  }

  async getValueTierSettings(): Promise<ValueTierSetting[]> {
    const existing = await db.select().from(valueTierSettings).orderBy(valueTierSettings.id);
    if (existing.length === 0) {
      const defaults = [
        { tier: "$", label: "Low", estimatedValue: "25000" },
        { tier: "$$", label: "Medium", estimatedValue: "75000" },
        { tier: "$$$", label: "High", estimatedValue: "200000" },
        { tier: "$$$$", label: "Very High", estimatedValue: "500000" },
      ];
      const seeded = await db.insert(valueTierSettings).values(defaults).returning();
      return seeded;
    }
    return existing;
  }

  async updateValueTierSetting(tier: string, estimatedValue: number): Promise<ValueTierSetting> {
    const existing = await db.select().from(valueTierSettings).where(eq(valueTierSettings.tier, tier));
    if (existing.length === 0) {
      const [created] = await db.insert(valueTierSettings).values({ tier, estimatedValue: estimatedValue.toString(), updatedAt: new Date() }).returning();
      return created;
    }
    const [updated] = await db.update(valueTierSettings)
      .set({ estimatedValue: estimatedValue.toString(), updatedAt: new Date() })
      .where(eq(valueTierSettings.tier, tier))
      .returning();
    return updated;
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
      { label: "Prospect", color: "blue", sortOrder: 0 },
      { label: "Customer", color: "green", sortOrder: 1 },
      { label: "Not Interested", color: "red", sortOrder: 2 },
      { label: "Networking Contact", color: "purple", sortOrder: 3 },
    ];
    await db.insert(contactStages).values(defaults);
  }

  async migrateContactStages(): Promise<void> {
    try {
      const newStages = [
        { label: "Prospect", color: "blue", sortOrder: 0 },
        { label: "Customer", color: "green", sortOrder: 1 },
        { label: "Not Interested", color: "red", sortOrder: 2 },
        { label: "Networking Contact", color: "purple", sortOrder: 3 },
      ];
      const existing = await db.select().from(contactStages);
      const existingLabels = existing.map(s => s.label);
      const alreadyMigrated = newStages.every(ns => existingLabels.includes(ns.label));
      if (alreadyMigrated) return;
      await db.delete(contactStages);
      await db.insert(contactStages).values(newStages);
    } catch (e) {
      console.error("migrateContactStages error:", e);
    }
  }

  async migrateLeadServiceTypes(): Promise<void> {
    try {
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS service_types text[] DEFAULT '{}'`);
      await db.execute(sql`UPDATE leads SET service_types = ARRAY[service_type::text] WHERE service_type IS NOT NULL AND (service_types IS NULL OR service_types = '{}')`);
    } catch (e) {
      console.error("migrateLeadServiceTypes error:", e);
    }
  }

  async migrateIndustryOptions(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS industry_options (
          id SERIAL PRIMARY KEY,
          label VARCHAR(100) NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      const existing = await db.select().from(industryOptions);
      if (existing.length === 0) {
        const defaults = [
          "Property Management",
          "Facility Management",
          "Commercial Real Estate",
          "Healthcare",
          "Retail",
          "Education",
          "Hospitality",
          "Government / Public Sector",
          "Technology",
          "Manufacturing",
          "Financial Services",
          "Construction / Development",
          "Non-Profit",
          "Industrial / Logistics",
        ];
        await db.insert(industryOptions).values(
          defaults.map((label, i) => ({ label, sortOrder: i }))
        );
      }
    } catch (e) {
      console.error("migrateIndustryOptions error:", e);
    }
  }

  async migrateDashboardFilter(): Promise<void> {
    try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_filter varchar DEFAULT 'all'`);
    } catch (e) {
      console.error("migrateDashboardFilter error:", e);
    }
  }

  async migrateEmailNotificationPreferences(): Promise<void> {
    try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_task_assigned boolean NOT NULL DEFAULT true`);
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_task_due boolean NOT NULL DEFAULT true`);
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_announcement boolean NOT NULL DEFAULT true`);
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_reminder boolean NOT NULL DEFAULT true`);
    } catch (e) {
      console.error("migrateEmailNotificationPreferences error:", e);
    }
  }

  async migrateBuildopsClientColumns(): Promise<void> {
    try {
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS buildops_status varchar`);
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS buildops_customer_type varchar`);
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS buildops_account_number varchar`);
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS buildops_customer_number varchar`);
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS buildops_last_synced_at timestamp`);
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_alternate varchar`);
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_street varchar`);
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_city varchar`);
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_state varchar`);
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_zip varchar`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS buildops_expiration_date timestamp`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS buildops_property_id varchar`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS buildops_quote_total decimal(12,2)`);
    } catch (e) {
      console.error("migrateBuildopsClientColumns error:", e);
    }
  }

  async migrateBuildopsVisitsAndExtendedFields(): Promise<void> {
    // New job fields (Task #99)
    try {
      await db.execute(sql`ALTER TABLE buildops_jobs ADD COLUMN IF NOT EXISTS account_manager varchar`);
      await db.execute(sql`ALTER TABLE buildops_jobs ADD COLUMN IF NOT EXISTS project_manager varchar`);
      await db.execute(sql`ALTER TABLE buildops_jobs ADD COLUMN IF NOT EXISTS sold_by varchar`);
      await db.execute(sql`ALTER TABLE buildops_jobs ADD COLUMN IF NOT EXISTS review_status varchar`);
      await db.execute(sql`ALTER TABLE buildops_jobs ADD COLUMN IF NOT EXISTS procurement_status varchar`);
      await db.execute(sql`ALTER TABLE buildops_jobs ADD COLUMN IF NOT EXISTS total_budgeted_hours decimal(10,2)`);
      await db.execute(sql`ALTER TABLE buildops_jobs ADD COLUMN IF NOT EXISTS department varchar`);
    } catch (e) {
      console.error("migrateBuildopsVisitsAndExtendedFields: job columns error:", e);
    }
    // New invoice fields (Task #99)
    try {
      await db.execute(sql`ALTER TABLE buildops_invoices ADD COLUMN IF NOT EXISTS department_name varchar`);
      await db.execute(sql`ALTER TABLE buildops_invoices ADD COLUMN IF NOT EXISTS days_past_due integer`);
      await db.execute(sql`ALTER TABLE buildops_invoices ADD COLUMN IF NOT EXISTS payment_term_name varchar`);
      await db.execute(sql`ALTER TABLE buildops_invoices ADD COLUMN IF NOT EXISTS service_agreement_number varchar`);
    } catch (e) {
      console.error("migrateBuildopsVisitsAndExtendedFields: invoice columns error:", e);
    }
    // Payment data columns (Task #106)
    try {
      await db.execute(sql`ALTER TABLE buildops_invoices ADD COLUMN IF NOT EXISTS total_amount_paid numeric(12,2)`);
      await db.execute(sql`ALTER TABLE buildops_invoices ADD COLUMN IF NOT EXISTS adjustment_amount numeric(12,2)`);
      await db.execute(sql`ALTER TABLE buildops_invoices ADD COLUMN IF NOT EXISTS outstanding_balance numeric(12,2)`);
      await db.execute(sql`ALTER TABLE buildops_invoices ADD COLUMN IF NOT EXISTS last_payment_date timestamp`);
    } catch (e) {
      console.error("migrateBuildopsVisitsAndExtendedFields: invoice payment columns error:", e);
    }
    // Data lineage columns (Task #107)
    try {
      await db.execute(sql`ALTER TABLE buildops_invoices ADD COLUMN IF NOT EXISTS last_api_sync timestamp`);
      await db.execute(sql`ALTER TABLE buildops_invoices ADD COLUMN IF NOT EXISTS last_csv_sync timestamp`);
      await db.execute(sql`ALTER TABLE buildops_jobs ADD COLUMN IF NOT EXISTS last_api_sync timestamp`);
      await db.execute(sql`ALTER TABLE buildops_jobs ADD COLUMN IF NOT EXISTS last_csv_sync timestamp`);
    } catch (e) {
      console.error("migrateBuildopsVisitsAndExtendedFields: data lineage columns error:", e);
    }
    // Merge conflicts + import audit tables (Task #107)
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS merge_conflicts (
          id serial PRIMARY KEY,
          entity_type varchar NOT NULL,
          entity_key varchar NOT NULL,
          source_a varchar NOT NULL,
          source_b varchar NOT NULL,
          conflict_field varchar NOT NULL,
          value_a text,
          value_b text,
          status varchar NOT NULL DEFAULT 'pending',
          created_at timestamp DEFAULT NOW() NOT NULL,
          resolved_at timestamp
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS data_import_log (
          id serial PRIMARY KEY,
          import_source varchar NOT NULL,
          entity_type varchar NOT NULL,
          entity_key varchar,
          fields_written text,
          fields_skipped text,
          conflict_count integer DEFAULT 0,
          records_processed integer DEFAULT 0,
          records_inserted integer DEFAULT 0,
          records_updated integer DEFAULT 0,
          created_at timestamp DEFAULT NOW() NOT NULL
        )
      `);
    } catch (e) {
      console.error("migrateBuildopsVisitsAndExtendedFields: merge/audit tables error:", e);
    }
    // buildops_visits table (Task #99)
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS buildops_visits (
          id serial PRIMARY KEY,
          buildops_id varchar NOT NULL UNIQUE,
          client_id integer REFERENCES clients(id),
          visit_number integer,
          job_number varchar,
          buildops_job_id varchar,
          job_type varchar,
          status varchar,
          review_status varchar,
          primary_tech_name varchar,
          submitted_by varchar,
          minimum_duration_mins integer,
          actual_duration_mins integer,
          scheduled_for timestamp,
          start_time timestamp,
          end_time timestamp,
          submitted_time timestamp,
          on_hold boolean DEFAULT false,
          on_hold_reason text,
          department_name varchar,
          billing_customer_name varchar,
          customer_name varchar,
          property_name varchar,
          address_line1 varchar,
          city varchar,
          state varchar,
          zipcode varchar,
          description text,
          buildops_customer_id varchar,
          synced_at timestamp DEFAULT now() NOT NULL
        )
      `);
    } catch (e) {
      console.error("migrateBuildopsVisitsAndExtendedFields: buildops_visits table error:", e);
    }
  }

  async migrateBuildopsTimesheets(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS buildops_timesheets (
          id serial PRIMARY KEY,
          work_date timestamp,
          employee_name varchar NOT NULL,
          visit_id varchar,
          job_number varchar,
          visit_number integer,
          event_status varchar,
          scheduled_duration_mins decimal(10,2),
          labor_rate_group varchar,
          labor_type_name varchar,
          department_name varchar,
          customer_name varchar,
          billing_customer_name varchar,
          property_name varchar,
          approval_status varchar,
          billable boolean DEFAULT true,
          service_agreement_number varchar,
          total_duration_mins decimal(10,2),
          cost_per_hour decimal(10,4),
          total_cost decimal(12,4),
          imported_at timestamp DEFAULT now() NOT NULL,
          UNIQUE (visit_id, employee_name, labor_rate_group)
        )
      `);
    } catch (e) {
      console.error("migrateBuildopsTimesheets error:", e);
    }
  }

  async migrateAgreementCsvColumns(): Promise<void> {
    try {
      const cols: [string, string][] = [
        ["billing_customer_name", "varchar"],
        ["department_name", "varchar"],
        ["first_bill_date", "timestamp"],
        ["next_bill_date", "timestamp"],
        ["billing_type", "varchar"],
        ["annual_contract_value", "decimal(12,2)"],
        ["renewal_date", "timestamp"],
        ["sold_by", "varchar"],
        ["created_timestamp", "timestamp"],
        ["created_by", "varchar"],
        ["service_agreement_type", "varchar"],
        ["project_manager", "varchar"],
        ["account_manager", "varchar"],
        ["total_amount", "decimal(14,4)"],
        ["adjustment_amount", "decimal(14,4)"],
        ["total_cost", "decimal(14,4)"],
        ["material_cost", "decimal(14,4)"],
        ["labour_cost", "decimal(14,4)"],
        ["labour_hours", "decimal(10,2)"],
        ["total_budgeted_hours", "decimal(10,2)"],
        ["total_budgeted_amount", "decimal(14,4)"],
        ["number_of_maintenances", "integer"],
        ["number_of_maintenances_completed", "integer"],
        ["number_of_jobs", "integer"],
        ["number_of_jobs_completed", "integer"],
        ["csv_imported_at", "timestamp"],
      ];
      for (const [col, type] of cols) {
        await db.execute(sql.raw(`ALTER TABLE buildops_agreements ADD COLUMN IF NOT EXISTS ${col} ${type}`));
      }
    } catch (e) {
      console.error("migrateAgreementCsvColumns error:", e);
    }
  }

  async migrateJobMarginAndGenericCsvTables(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS buildops_job_margin (
          id serial PRIMARY KEY,
          job_number varchar NOT NULL UNIQUE,
          job_title varchar,
          customer_name varchar,
          department varchar,
          job_type varchar,
          status varchar,
          total_revenue decimal(14,2),
          total_cost decimal(14,2),
          gross_profit decimal(14,2),
          margin_pct decimal(7,2),
          labor_revenue decimal(14,2),
          labor_cost decimal(14,2),
          material_revenue decimal(14,2),
          material_cost decimal(14,2),
          completed_date timestamp,
          csv_imported_at timestamp DEFAULT now()
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS buildops_csv_uploads (
          id serial PRIMARY KEY,
          filename varchar NOT NULL,
          detected_headers text,
          row_count integer,
          uploaded_at timestamp DEFAULT now()
        )
      `);
      // Add pay-type breakdown columns to timesheets if not present
      await db.execute(sql`ALTER TABLE buildops_timesheets ADD COLUMN IF NOT EXISTS regular_mins numeric`);
      await db.execute(sql`ALTER TABLE buildops_timesheets ADD COLUMN IF NOT EXISTS overtime_mins numeric`);
      await db.execute(sql`ALTER TABLE buildops_timesheets ADD COLUMN IF NOT EXISTS double_time_mins numeric`);
      await db.execute(sql`ALTER TABLE buildops_timesheets ADD COLUMN IF NOT EXISTS other_mins numeric`);
      await db.execute(sql`ALTER TABLE buildops_timesheets ADD COLUMN IF NOT EXISTS regular_cost numeric`);
      await db.execute(sql`ALTER TABLE buildops_timesheets ADD COLUMN IF NOT EXISTS overtime_cost numeric`);
      await db.execute(sql`ALTER TABLE buildops_timesheets ADD COLUMN IF NOT EXISTS double_time_cost numeric`);
    } catch (e) {
      console.error("migrateJobMarginAndGenericCsvTables error:", e);
    }
  }

  async migrateBuildopsPropertyColumns(): Promise<void> {
    try {
      await db.execute(sql`ALTER TABLE contact_buildings ADD COLUMN IF NOT EXISTS property_type varchar`);
      await db.execute(sql`ALTER TABLE contact_buildings ADD COLUMN IF NOT EXISTS buildops_is_inactive boolean DEFAULT false`);
      await db.execute(sql`ALTER TABLE client_contacts ADD COLUMN IF NOT EXISTS buildops_id varchar`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS building_id integer`);
      // Add won_at timestamp column for accurate revenue date tracking
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_at timestamp`);
      // Backfill won_at for existing won leads using updated_at as fallback
      await db.execute(sql`UPDATE leads SET won_at = updated_at WHERE stage = 'won' AND won_at IS NULL`);
      // Employment type for techs — used to exclude part-time contracted staff from capacity calculations
      await db.execute(sql`ALTER TABLE buildops_employees ADD COLUMN IF NOT EXISTS employment_type varchar NOT NULL DEFAULT 'full_time'`);
    } catch (e) {
      console.error("migrateBuildopsPropertyColumns error:", e);
    }
  }

  async migrateTaskBoards(): Promise<void> {
    // 1. Create task_boards table if it doesn't exist
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS task_boards (
          id serial PRIMARY KEY,
          name varchar NOT NULL,
          description text,
          visibility varchar NOT NULL DEFAULT 'team',
          created_by varchar NOT NULL,
          created_at timestamp DEFAULT now()
        )
      `);
    } catch (e) {
      console.error("migrateTaskBoards: create task_boards error:", e);
    }

    // 2. Create task_board_members table if it doesn't exist
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS task_board_members (
          id serial PRIMARY KEY,
          board_id integer NOT NULL REFERENCES task_boards(id) ON DELETE CASCADE,
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role varchar NOT NULL DEFAULT 'member'
        )
      `);
    } catch (e) {
      console.error("migrateTaskBoards: create task_board_members error:", e);
    }

    // 3. Add board_id column to task_columns if it doesn't exist
    try {
      await db.execute(sql`ALTER TABLE task_columns ADD COLUMN IF NOT EXISTS board_id integer REFERENCES task_boards(id) ON DELETE CASCADE`);
    } catch (e) {
      console.error("migrateTaskBoards: add board_id to task_columns error:", e);
    }

    // 4. Add board_id column to tasks if it doesn't exist
    try {
      await db.execute(sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS board_id integer REFERENCES task_boards(id) ON DELETE SET NULL`);
    } catch (e) {
      console.error("migrateTaskBoards: add board_id to tasks error:", e);
    }

    // 5. Drop the global unique constraint on task_columns.slug (if it exists) to allow per-board duplicate slugs
    try {
      await db.execute(sql`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'task_columns_slug_unique'
            AND table_name = 'task_columns'
          ) THEN
            ALTER TABLE task_columns DROP CONSTRAINT task_columns_slug_unique;
          END IF;
        END $$
      `);
    } catch (e) {
      console.error("migrateTaskBoards: drop slug unique constraint error:", e);
    }

    // 6. Seed default board and migrate existing data
    try {
      await this.seedDefaultTaskBoard();
    } catch (e) {
      console.error("migrateTaskBoards: seedDefaultTaskBoard error:", e);
    }
  }

  async listIndustryOptions(): Promise<IndustryOption[]> {
    return db.select().from(industryOptions).orderBy(industryOptions.sortOrder, industryOptions.createdAt);
  }

  async createIndustryOption(data: InsertIndustryOption): Promise<IndustryOption> {
    const [created] = await db.insert(industryOptions).values(data).returning();
    return created;
  }

  async deleteIndustryOption(id: number): Promise<void> {
    await db.delete(industryOptions).where(eq(industryOptions.id, id));
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
    await db.execute(sql`ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS track VARCHAR(20) DEFAULT 'relationship'`);
    const existing = await db.select().from(pipelineStages);
    if (existing.length > 0) {
      await this.migratePipelineStageTracks();
      await this.seedStageProbabilities();
      return;
    }
    const defaults = [
      { label: "Met / Introduced", slug: "met_introduced", sortOrder: 0, color: null, track: "relationship" },
      { label: "Reached Out", slug: "new_lead", sortOrder: 1, color: null, track: "relationship" },
      { label: "In Conversation", slug: "in_conversation", sortOrder: 2, color: null, track: "relationship" },
      { label: "Ready for Proposal", slug: "qualified", sortOrder: 3, color: null, track: "relationship" },
      { label: "Proposal Sent", slug: "proposal_sent", sortOrder: 4, color: null, track: "deal" },
      { label: "Won", slug: "won", sortOrder: 5, color: "green", track: "deal" },
      { label: "Expired", slug: "expired", sortOrder: 6, color: "orange", track: "deal" },
      { label: "Lost", slug: "lost", sortOrder: 7, color: "red", track: "deal" },
      { label: "Canceled", slug: "canceled", sortOrder: 8, color: "grey", track: "deal" },
    ];
    await db.insert(pipelineStages).values(defaults);
  }

  async migratePipelineStageTracks(): Promise<void> {
    await db.execute(sql`ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS track VARCHAR(20) DEFAULT 'relationship'`);
    const existing = await db.select().from(pipelineStages);
    const dealSlugs = ["proposal_sent", "won", "lost", "expired", "canceled", "draft"];
    const allDealStagesCorrect = existing
      .filter(s => dealSlugs.includes(s.slug))
      .every(s => s.track === "deal");
    const allOtherStagesCorrect = existing
      .filter(s => !dealSlugs.includes(s.slug))
      .every(s => s.track === "relationship");
    const hasRequiredStages = existing.some(s => s.slug === "met_introduced") && existing.some(s => s.slug === "in_conversation");
    const hasNoLegacyContacted = !existing.some(s => s.slug === "contacted");
    if (allDealStagesCorrect && allOtherStagesCorrect && hasRequiredStages && hasNoLegacyContacted) return;

    const relationshipSlugs = ["new_lead", "contacted", "qualified", "met_introduced", "in_conversation"];

    for (const stage of existing) {
      if (dealSlugs.includes(stage.slug)) {
        await db.update(pipelineStages).set({ track: "deal" }).where(eq(pipelineStages.id, stage.id));
      } else {
        await db.update(pipelineStages).set({ track: "relationship" }).where(eq(pipelineStages.id, stage.id));
      }
    }

    const existingSlugs = existing.map(s => s.slug);
    const maxOrder = Math.max(...existing.map(s => s.sortOrder), -1);

    if (!existingSlugs.includes("met_introduced")) {
      await db.insert(pipelineStages).values({
        label: "Met / Introduced",
        slug: "met_introduced",
        sortOrder: 0,
        color: null,
        track: "relationship",
      });
      for (const stage of existing) {
        if (relationshipSlugs.includes(stage.slug) || !dealSlugs.includes(stage.slug)) {
          await db.update(pipelineStages).set({ sortOrder: stage.sortOrder + 1 }).where(eq(pipelineStages.id, stage.id));
        }
      }
    }

    if (!existingSlugs.includes("in_conversation")) {
      const contactedStage = existing.find(s => s.slug === "contacted");
      const insertOrder = contactedStage ? contactedStage.sortOrder + 1 : 2;
      await db.insert(pipelineStages).values({
        label: "In Conversation",
        slug: "in_conversation",
        sortOrder: insertOrder,
        color: null,
        track: "relationship",
      });
    }

    if (existingSlugs.includes("new_lead")) {
      await db.update(pipelineStages).set({ label: "Reached Out" }).where(eq(pipelineStages.slug, "new_lead"));
    }

    if (existingSlugs.includes("contacted") && existingSlugs.includes("new_lead")) {
      await db.execute(sql`UPDATE leads SET stage = 'new_lead' WHERE stage = 'contacted'`);
      await db.delete(pipelineStages).where(eq(pipelineStages.slug, "contacted"));
    } else if (existingSlugs.includes("contacted") && !existingSlugs.includes("new_lead")) {
      await db.update(pipelineStages).set({ slug: "new_lead", label: "Reached Out" }).where(eq(pipelineStages.slug, "contacted"));
      await db.execute(sql`UPDATE leads SET stage = 'new_lead' WHERE stage = 'contacted'`);
    }

    if (existingSlugs.includes("qualified")) {
      await db.update(pipelineStages).set({ label: "Ready for Proposal" }).where(eq(pipelineStages.slug, "qualified"));
    }

    // Migrate: add "Expired" stage to deal track if missing
    const freshStages2 = await db.select().from(pipelineStages);
    if (!freshStages2.some(s => s.slug === "expired")) {
      const lostStage = freshStages2.find(s => s.slug === "lost");
      const wonStage = freshStages2.find(s => s.slug === "won");
      const insertOrder = lostStage ? lostStage.sortOrder : (wonStage ? wonStage.sortOrder + 1 : 10);
      // Push lost (and anything >= insertOrder in deal track) up
      if (lostStage) {
        await db.update(pipelineStages).set({ sortOrder: lostStage.sortOrder + 1 }).where(eq(pipelineStages.id, lostStage.id));
      }
      await db.insert(pipelineStages).values({
        label: "Expired",
        slug: "expired",
        sortOrder: insertOrder,
        color: "orange",
        track: "deal",
      });
    } else {
      // Ensure existing "Expired" stage is on deal track with correct color
      const expiredStage = freshStages2.find(s => s.slug === "expired");
      if (expiredStage && (expiredStage.track !== "deal" || expiredStage.color !== "orange")) {
        await db.update(pipelineStages).set({ track: "deal", color: "orange" }).where(eq(pipelineStages.id, expiredStage.id));
      }
    }

    // Migrate: add "Canceled" stage to deal track if missing (for BuildOps cancelled quotes)
    const freshStages3 = await db.select().from(pipelineStages);
    if (!freshStages3.some(s => s.slug === "canceled")) {
      const lostStage = freshStages3.find(s => s.slug === "lost");
      const insertOrder = lostStage ? lostStage.sortOrder + 1 : 99;
      await db.insert(pipelineStages).values({
        label: "Canceled",
        slug: "canceled",
        sortOrder: insertOrder,
        color: "grey",
        track: "deal",
      });
    }

    const canonicalRelOrder = ["met_introduced", "new_lead", "in_conversation", "qualified"];
    const canonicalDealOrder = ["proposal_sent", "won", "lost"];
    const allStages = await db.select().from(pipelineStages);
    const relStages = allStages
      .filter(s => s.track === "relationship")
      .sort((a, b) => {
        const ai = canonicalRelOrder.indexOf(a.slug);
        const bi = canonicalRelOrder.indexOf(b.slug);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.sortOrder - b.sortOrder;
      });
    const dlStages = allStages
      .filter(s => s.track === "deal")
      .sort((a, b) => {
        const ai = canonicalDealOrder.indexOf(a.slug);
        const bi = canonicalDealOrder.indexOf(b.slug);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.sortOrder - b.sortOrder;
      });
    const sorted = [...relStages, ...dlStages];
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].sortOrder !== i) {
        await db.update(pipelineStages).set({ sortOrder: i }).where(eq(pipelineStages.id, sorted[i].id));
      }
    }

    // Seed defaultProbability for known stage slugs (only if still at 50 — the schema default)
    await this.seedStageProbabilities();
  }

  async seedStageProbabilities(): Promise<void> {
    await db.execute(sql`ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS default_probability INTEGER DEFAULT 50`);
    const probabilityMap: Record<string, number> = {
      met_introduced: 5,
      new_lead: 5,
      in_conversation: 10,
      qualified: 20,
      draft: 5,
      proposal_sent: 30,
      expired: 0,
      canceled: 0,
      cancelled: 0,
      won: 100,
      lost: 0,
    };
    const allStages = await db.select().from(pipelineStages);
    for (const stage of allStages) {
      const canonical = probabilityMap[stage.slug];
      if (canonical !== undefined && (stage.defaultProbability === null || stage.defaultProbability === 50)) {
        await db.update(pipelineStages).set({ defaultProbability: canonical }).where(eq(pipelineStages.id, stage.id));
      }
    }
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
  async listTaskColumns(boardId?: number): Promise<TaskColumn[]> {
    if (boardId !== undefined) {
      return await db.select().from(taskColumns).where(eq(taskColumns.boardId, boardId)).orderBy(taskColumns.sortOrder);
    }
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
    // Seed default task board first
    await this.seedDefaultTaskBoard();
  }

  // Task Boards
  async getDefaultBoardId(): Promise<number | undefined> {
    // Look for the canonical "General" team board first, then fall back to any team board
    const [generalBoard] = await db.select().from(taskBoards)
      .where(and(eq(taskBoards.name, "General"), eq(taskBoards.visibility, "team")))
      .limit(1);
    if (generalBoard) return generalBoard.id;
    // Fallback: any team board (supports renamed installs)
    const [anyTeamBoard] = await db.select().from(taskBoards)
      .where(eq(taskBoards.visibility, "team"))
      .limit(1);
    return anyTeamBoard?.id;
  }

  async seedDefaultTaskBoard(): Promise<void> {
    // Get any user to be the owner (first user found)
    const [firstUser] = await db.select().from(users).limit(1);
    if (!firstUser) return;

    // Step 1: Backfill NULL board_id rows FIRST, before inserting any new columns.
    // This prevents duplicate slugs when pre-existing unscoped columns are later migrated.
    // Find the canonical General board if it already exists.
    let board: TaskBoard | undefined;
    const [existingGeneral] = await db.select().from(taskBoards)
      .where(and(eq(taskBoards.name, "General"), eq(taskBoards.visibility, "team")))
      .limit(1);
    if (existingGeneral) {
      board = existingGeneral;
    } else {
      // Try any existing team board
      const [anyTeam] = await db.select().from(taskBoards)
        .where(eq(taskBoards.visibility, "team"))
        .limit(1);
      if (anyTeam) board = anyTeam;
    }

    // If a board already exists, immediately backfill nulls onto it (covers partial deploy states)
    if (board) {
      await db.execute(sql`UPDATE task_columns SET board_id = ${board.id} WHERE board_id IS NULL`);
      await db.execute(sql`UPDATE tasks SET board_id = ${board.id} WHERE board_id IS NULL`);
      return;
    }

    // Step 2: No boards at all — create General board first, then backfill (no slug conflict possible)
    const [created] = await db.insert(taskBoards).values({
      name: "General",
      description: "Default shared team board",
      visibility: "team",
      createdBy: firstUser.id,
    }).returning();
    board = created;

    // Backfill before inserting new columns to avoid slug duplicates from pre-existing rows
    await db.execute(sql`UPDATE task_columns SET board_id = ${board.id} WHERE board_id IS NULL`);
    await db.execute(sql`UPDATE tasks SET board_id = ${board.id} WHERE board_id IS NULL`);

    // Insert missing default columns only if they don't already exist for this board
    const slugsToEnsure = [
      { name: "To Do", slug: "todo", sortOrder: 0 },
      { name: "In Progress", slug: "in_progress", sortOrder: 1 },
      { name: "Done", slug: "done", sortOrder: 2 },
    ];
    const existingCols = await db.select({ slug: taskColumns.slug })
      .from(taskColumns)
      .where(eq(taskColumns.boardId, board.id));
    const existingSlugs = new Set(existingCols.map(c => c.slug));
    for (const col of slugsToEnsure) {
      if (!existingSlugs.has(col.slug)) {
        await db.insert(taskColumns).values({ ...col, isDefault: true, boardId: board.id });
      }
    }
  }

  async listTaskBoards(userId: string): Promise<(TaskBoard & { memberCount: number; myRole: string })[]> {
    const allBoards = await db.select().from(taskBoards);
    const allMembers = await db.select().from(taskBoardMembers);

    const result: (TaskBoard & { memberCount: number; myRole: string })[] = [];

    for (const board of allBoards) {
      const members = allMembers.filter(m => m.boardId === board.id);
      const myMembership = members.find(m => m.userId === userId);

      if (board.visibility === "team") {
        const myRole = myMembership?.role ?? (board.createdBy === userId ? "owner" : "member");
        result.push({ ...board, memberCount: members.length, myRole });
      } else if (board.visibility === "private") {
        if (board.createdBy === userId) {
          result.push({ ...board, memberCount: members.length, myRole: "owner" });
        }
      } else if (board.visibility === "invite") {
        if (board.createdBy === userId || myMembership) {
          const myRole = myMembership?.role ?? (board.createdBy === userId ? "owner" : "member");
          result.push({ ...board, memberCount: members.length, myRole });
        }
      }
    }

    return result;
  }

  async getTaskBoard(id: number): Promise<TaskBoard | undefined> {
    const [board] = await db.select().from(taskBoards).where(eq(taskBoards.id, id));
    return board;
  }

  async createTaskBoard(data: InsertTaskBoard): Promise<TaskBoard> {
    const [board] = await db.insert(taskBoards).values(data).returning();
    // Add creator as owner in board members
    await db.insert(taskBoardMembers).values({ boardId: board.id, userId: data.createdBy, role: "owner" });
    // Create default columns using canonical slugs (boards are now independently scoped)
    const defaults = [
      { name: "To Do", slug: "todo", sortOrder: 0, isDefault: true, boardId: board.id },
      { name: "In Progress", slug: "in_progress", sortOrder: 1, isDefault: true, boardId: board.id },
      { name: "Done", slug: "done", sortOrder: 2, isDefault: true, boardId: board.id },
    ];
    for (const col of defaults) {
      await db.insert(taskColumns).values(col);
    }
    return board;
  }

  async updateTaskBoard(id: number, data: Partial<InsertTaskBoard>): Promise<TaskBoard> {
    const [board] = await db.update(taskBoards).set(data).where(eq(taskBoards.id, id)).returning();
    return board;
  }

  async deleteTaskBoard(id: number): Promise<void> {
    const [board] = await db.select().from(taskBoards).where(eq(taskBoards.id, id));
    if (!board) return;

    if (board.visibility === "private") {
      // Delete tasks on private boards — they should not be visible to anyone after deletion
      await db.delete(tasks).where(eq(tasks.boardId, id));
    } else {
      // Rehome tasks to General team board so they're not orphaned with NULL boardId
      const generalBoard = await this.getDefaultBoardId();
      const targetBoardId = generalBoard && generalBoard !== id ? generalBoard : null;
      if (targetBoardId) {
        await db.execute(sql`UPDATE tasks SET board_id = ${targetBoardId} WHERE board_id = ${id}`);
      } else {
        // No other board: delete tasks to avoid NULL-board orphans
        await db.delete(tasks).where(eq(tasks.boardId, id));
      }
    }

    // Columns cascade via FK (ON DELETE CASCADE on taskColumns.boardId)
    // Members cascade via FK (ON DELETE CASCADE on taskBoardMembers.boardId)
    await db.delete(taskBoards).where(eq(taskBoards.id, id));
  }

  async canUserAccessBoard(boardId: number, userId: string): Promise<boolean> {
    const [board] = await db.select().from(taskBoards).where(eq(taskBoards.id, boardId));
    if (!board) return false;
    if (board.visibility === "team") return true;
    if (board.visibility === "private") return board.createdBy === userId;
    // invite
    if (board.createdBy === userId) return true;
    const [member] = await db.select().from(taskBoardMembers).where(
      and(eq(taskBoardMembers.boardId, boardId), eq(taskBoardMembers.userId, userId))
    );
    return !!member;
  }

  async getTaskBoardMembers(boardId: number): Promise<(TaskBoardMember & { user: { id: string; firstName: string | null; lastName: string | null; email: string | null; profileImageUrl: string | null } })[]> {
    const members = await db.select().from(taskBoardMembers).where(eq(taskBoardMembers.boardId, boardId));
    const result = [];
    for (const member of members) {
      const [user] = await db.select().from(users).where(eq(users.id, member.userId));
      if (user) {
        result.push({
          ...member,
          user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, profileImageUrl: user.profileImageUrl },
        });
      }
    }
    return result;
  }

  async addTaskBoardMember(boardId: number, userId: string, role: "owner" | "member" = "member"): Promise<TaskBoardMember> {
    // Upsert: delete existing then insert
    await db.delete(taskBoardMembers).where(
      and(eq(taskBoardMembers.boardId, boardId), eq(taskBoardMembers.userId, userId))
    );
    const [member] = await db.insert(taskBoardMembers).values({ boardId, userId, role }).returning();
    return member;
  }

  async removeTaskBoardMember(boardId: number, userId: string): Promise<void> {
    await db.delete(taskBoardMembers).where(
      and(eq(taskBoardMembers.boardId, boardId), eq(taskBoardMembers.userId, userId))
    );
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
    const MODULES = ["dashboard", "leads", "customers", "tasks", "meetings", "estimates", "service_catalog", "proposals", "email_sync", "announcements"];
    const defaults: { roleKey: string; module: string; accessLevel: string }[] = [
      // admin: full CRM access, no system settings (those are super_admin only)
      ...MODULES.map(m => ({ roleKey: "admin", module: m, accessLevel: "full" })),
      // manager: full CRM access
      ...MODULES.map(m => ({ roleKey: "manager", module: m, accessLevel: "full" })),
      // member: limited access
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
      { roleKey: "super_admin", displayName: "Super Admin" },
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
    await db.update(users).set({ role: "super_admin" }).where(eq(users.email, email));
  }

  async seedTestEmails(): Promise<void> {
    const existing = await db.select({ id: emailMessages.id }).from(emailMessages).where(eq(emailMessages.gmailMessageId, "seed_msg_101"));
    if (existing.length > 0) return;

    const allUsers = await db.select({ id: users.id }).from(users).limit(1);
    if (allUsers.length === 0) return;
    const userId = allUsers[0].id;
    const now = Date.now();
    const h = (hours: number) => new Date(now - hours * 3600000);

    const seeds: InsertEmailMessage[] = [
      { gmailMessageId: "seed_msg_101", gmailThreadId: "seed_thr_101", userId, direction: "inbound", fromEmail: "john.green@m5svcs.com", fromName: "John Green", toEmails: ["chase@m5svcs.com"], subject: "Re: 2 Man Site — Staffing Confirmation Needed", bodySnippet: "Chase, we need to confirm the two-person staffing plan for the Pleasanton site by Friday. Can you send over the updated labor breakdown?", fullBody: "Chase,\n\nWe need to confirm the two-person staffing plan for the Pleasanton site by Friday. The client is asking for a final headcount before we mobilize.\n\nCan you send over the updated labor breakdown and shift schedule?\n\nThanks,\nJohn Green\nOperations Manager\nM5 Services", receivedAt: h(52), clientId: 2, leadId: 1, aiSummary: "John Green is requesting an updated labor breakdown and shift schedule for the 2 Man site in Pleasanton. Needs confirmation by Friday before mobilization.", aiSuggestedTasks: [{ title: "Send updated labor breakdown for Pleasanton", priority: "high", dueInDays: 2 }, { title: "Confirm shift schedule with operations", priority: "medium", dueInDays: 3 }], aiSentiment: "neutral", requiresResponse: true, isProcessed: true, autoLinked: true },
      { gmailMessageId: "seed_msg_102", gmailThreadId: "seed_thr_101", userId, direction: "outbound", fromEmail: "chase@m5svcs.com", fromName: "Chase", toEmails: ["john.green@m5svcs.com"], subject: "Re: 2 Man Site — Staffing Confirmation Needed", bodySnippet: "John, I will have the labor breakdown over to you by end of day tomorrow. Working on the shift schedule now.", fullBody: "John,\n\nI will have the labor breakdown over to you by end of day tomorrow. Working on the shift schedule now — just need to finalize the overnight coverage piece.\n\nWill loop you in once it is ready.\n\nBest,\nChase", receivedAt: h(46), clientId: 2, leadId: 1, aiSummary: "Chase confirmed he will send the labor breakdown by end of next day and is finalizing the overnight coverage shift schedule.", aiSentiment: "positive", isProcessed: true, autoLinked: true },
      { gmailMessageId: "seed_msg_103", gmailThreadId: "seed_thr_102", userId, direction: "inbound", fromEmail: "lisa.chen@testcompany.com", fromName: "Lisa Chen", toEmails: ["chase@m5svcs.com"], subject: "Night Janitorial Quote — Any Updates?", bodySnippet: "Hi Chase, just checking in on the night janitorial quote we discussed last week. Our board meeting is coming up and I need pricing to present.", fullBody: "Hi Chase,\n\nJust checking in on the night janitorial quote we discussed last week. Our board meeting is coming up on the 15th and I need the pricing to present to the facilities committee.\n\nCould you also include an option for weekend coverage?\n\nThanks,\nLisa Chen\nFacilities Director\nTest Company", receivedAt: h(78), clientId: 1, leadId: 2, aiSummary: "Lisa Chen from Test Company is following up on night janitorial pricing. Board meeting on the 15th — needs quote with optional weekend coverage add-on.", aiSuggestedTasks: [{ title: "Finalize night janitorial quote with weekend option", priority: "high", dueInDays: 3 }, { title: "Send pricing to Lisa Chen before board meeting", priority: "high", dueInDays: 5 }], aiSentiment: "neutral", aiStageSuggestion: "proposal", requiresResponse: true, isProcessed: true, autoLinked: true },
      { gmailMessageId: "seed_msg_104", gmailThreadId: "seed_thr_102", userId, direction: "outbound", fromEmail: "chase@m5svcs.com", fromName: "Chase", toEmails: ["lisa.chen@testcompany.com"], subject: "Re: Night Janitorial Quote — Any Updates?", bodySnippet: "Lisa, great news — I have the base quote ready and am adding the weekend option now. Will have everything to you by Wednesday.", fullBody: "Lisa,\n\nGreat news — I have the base quote ready and am adding the weekend coverage option now. Will have everything to you by Wednesday so you have plenty of time before your board meeting.\n\nThe base scope covers 5 nights/week with a 3-person crew. Weekend option adds Saturday night coverage.\n\nBest,\nChase\nM5 Services", receivedAt: h(66), clientId: 1, leadId: 2, aiSummary: "Chase confirmed the base janitorial quote is ready (5 nights, 3-person crew). Adding weekend coverage option. Will deliver by Wednesday ahead of board meeting.", aiSentiment: "positive", isProcessed: true, autoLinked: true },
      { gmailMessageId: "seed_msg_105", gmailThreadId: "seed_thr_103", userId, direction: "inbound", fromEmail: "sarah.kim@beaconcap.com", fromName: "Sarah Kim", toEmails: ["chase@m5svcs.com"], ccEmails: ["facilities@beaconcap.com"], subject: "Beacon HQ — Need Day Porter Added to Scope", bodySnippet: "Chase, we need to add a day porter to the HQ cleaning contract. Can you revise the estimate to include that?", fullBody: "Chase,\n\nWe had an internal discussion and need to add a full-time day porter to the HQ cleaning contract. The lobby and conference rooms need coverage from 7AM to 3PM.\n\nCan you revise the estimate to include that? If possible, I would like to see the updated numbers by next week.\n\nThanks,\nSarah Kim\nSenior Property Manager\nBeacon Capital Group", receivedAt: h(32), clientId: 4, leadId: 4, aiSummary: "Sarah Kim requesting day porter addition to Beacon HQ cleaning scope. Needs lobby and conference room coverage 7AM-3PM. Wants revised estimate by next week.", aiSuggestedTasks: [{ title: "Revise Beacon HQ estimate to add day porter", priority: "high", dueInDays: 5 }], aiSentiment: "neutral", requiresResponse: true, isProcessed: true, autoLinked: true },
      { gmailMessageId: "seed_msg_106", gmailThreadId: "seed_thr_104", userId, direction: "inbound", fromEmail: "tom.bradley@abm.com", fromName: "Tom Bradley", toEmails: ["chase@m5svcs.com"], subject: "ABM Office Park RFP — Scope Clarification Questions", bodySnippet: "Chase, a few questions on the janitorial RFP scope: (1) Do you cover exterior window washing? (2) What is your emergency response time? (3) Can you provide references?", fullBody: "Chase,\n\nA few questions on the janitorial RFP scope before we can move forward:\n\n1. Does your proposal cover exterior window washing, or is that a separate line item?\n2. What is your emergency response time for after-hours incidents?\n3. Can you provide 2-3 references for similar-size properties (100K+ sqft office parks)?\n\nWe are reviewing bids next Thursday so timing is tight.\n\nRegards,\nTom Bradley\nVP Facilities\nABM Industries", receivedAt: h(98), clientId: 6, leadId: 6, aiSummary: "Tom Bradley from ABM has 3 clarification questions on the janitorial RFP: exterior windows, emergency response time, and references for 100K+ sqft properties. Bids reviewed next Thursday.", aiSuggestedTasks: [{ title: "Answer ABM RFP scope questions", priority: "high", dueInDays: 3 }, { title: "Gather 2-3 property references for ABM", priority: "medium", dueInDays: 3 }], aiSentiment: "neutral", requiresResponse: true, isProcessed: true, autoLinked: true },
      { gmailMessageId: "seed_msg_107", gmailThreadId: "seed_thr_104", userId, direction: "outbound", fromEmail: "chase@m5svcs.com", fromName: "Chase", toEmails: ["tom.bradley@abm.com"], subject: "Re: ABM Office Park RFP — Scope Clarification Questions", bodySnippet: "Tom, great questions. (1) Exterior windows are a separate add-on. (2) 2-hour emergency response SLA. (3) Sending references tomorrow.", fullBody: "Tom,\n\nGreat questions — here are the answers:\n\n1. Exterior window washing is a separate add-on service. I will include the pricing as a line item in the revised proposal.\n2. Our standard emergency response SLA is 2 hours for after-hours incidents.\n3. I will send over 2-3 references for similar-size properties by tomorrow.\n\nLet me know if you need anything else before Thursday.\n\nBest,\nChase\nM5 Services", receivedAt: h(86), clientId: 6, leadId: 6, aiSummary: "Chase answered ABM scope questions: exterior windows as add-on with pricing, 2-hour emergency SLA, references coming tomorrow.", aiSentiment: "positive", isProcessed: true, autoLinked: true },
      { gmailMessageId: "seed_msg_108", gmailThreadId: "seed_thr_105", userId, direction: "inbound", fromEmail: "lisa.chen@testcompany.com", fromName: "Lisa Chen", toEmails: ["chase@m5svcs.com"], subject: "Special Project — Lobby Renovation Clean-Up", bodySnippet: "Chase, we are renovating the main lobby next month. Need a post-construction deep clean crew. Can M5 handle this?", fullBody: "Chase,\n\nWe are renovating the main lobby next month and will need a post-construction deep clean once the contractors finish. This would include carpet extraction, window cleaning, and dust removal from all surfaces.\n\nCan M5 handle this type of project? If so, can you send an estimate?\n\nThanks,\nLisa Chen\nFacilities Director\nTest Company", receivedAt: h(123), clientId: 1, leadId: 11, aiSummary: "Lisa Chen requesting post-construction deep clean for lobby renovation. Scope includes carpet extraction, windows, and surface dust removal. Needs estimate.", aiSentiment: "positive", aiStageSuggestion: "proposal", requiresResponse: true, isProcessed: true, autoLinked: true },
      { gmailMessageId: "seed_msg_109", gmailThreadId: "seed_thr_106", userId, direction: "outbound", fromEmail: "chase@m5svcs.com", fromName: "Chase", toEmails: ["marcus.reed@cbre.com"], subject: "Re: CBRE Facility Assessment — Site Walk Schedule", bodySnippet: "Marcus, following up on our call. I have availability for the site walk next Tuesday or Thursday.", fullBody: "Marcus,\n\nFollowing up on our call about the facility assessment for the downtown portfolio. I have availability for the site walk next Tuesday or Thursday afternoon.\n\nI will bring our assessment checklist and can have preliminary findings to you within a week after the walk.\n\nLet me know which day works.\n\nBest,\nChase\nM5 Services", receivedAt: h(12), clientId: 3, leadId: 7, aiSummary: "Chase following up with Marcus Reed at CBRE to schedule a site walk for the facility assessment. Available Tuesday or Thursday.", aiSentiment: "positive", isProcessed: true, autoLinked: true },
      { gmailMessageId: "seed_msg_110", gmailThreadId: "seed_thr_107", userId, direction: "outbound", fromEmail: "chase@m5svcs.com", fromName: "Chase", toEmails: ["david.park@jll.com"], subject: "Re: Downtown Tower — Updated Maintenance Proposal", bodySnippet: "David, attached is the updated maintenance proposal with the quarterly pricing you requested.", fullBody: "David,\n\nAttached is the updated maintenance proposal with the quarterly pricing breakdown you requested. Key changes:\n\n- Quarterly scheduled maintenance visits\n- Emergency call coverage included at no additional cost\n- 10% discount for annual commitment\n\nLet me know if you want to schedule a walkthrough of the facility to review the scope in person.\n\nBest,\nChase\nM5 Services", receivedAt: h(6), clientId: 5, leadId: 5, aiSummary: "Chase sent updated maintenance proposal to David Park at JLL with quarterly pricing, emergency call coverage, and 10% annual commitment discount.", aiSentiment: "positive", aiStageSuggestion: "negotiation", isProcessed: true, autoLinked: true },
      { gmailMessageId: "seed_msg_111", gmailThreadId: "seed_thr_108", userId, direction: "inbound", fromEmail: "sarah.kim@beaconcap.com", fromName: "Sarah Kim", toEmails: ["chase@m5svcs.com"], subject: "Quote BO-2024-1001 — Approval Pending", bodySnippet: "Chase, the quote you sent via BuildOps is under review. Our CFO wants to compare it against last year rates.", fullBody: "Chase,\n\nThe quote you sent via BuildOps (BO-2024-1001) is currently under review with our finance team. Our CFO wants to compare the proposed rates against what we paid last year.\n\nCould you put together a quick year-over-year rate comparison?\n\nThanks,\nSarah Kim\nSenior Property Manager\nBeacon Capital Group", receivedAt: h(38), clientId: 4, leadId: 8, aiSummary: "Sarah Kim says BuildOps quote BO-2024-1001 is under CFO review. Needs year-over-year rate comparison to speed up approval.", aiSuggestedTasks: [{ title: "Create YoY rate comparison for Beacon Capital quote", priority: "high", dueInDays: 2 }], aiSentiment: "neutral", aiStageSuggestion: "negotiation", requiresResponse: true, isProcessed: true, autoLinked: true },
      { gmailMessageId: "seed_msg_112", gmailThreadId: "seed_thr_109", userId, direction: "inbound", fromEmail: "notifications@linkedin.com", fromName: "LinkedIn", toEmails: ["chase@m5svcs.com"], subject: "Marcus Reed commented on your post", bodySnippet: "Marcus Reed commented on your post: \"Great insights on facility maintenance trends...\"", receivedAt: h(8), isProcessed: true },
      { gmailMessageId: "seed_msg_113", gmailThreadId: "seed_thr_110", userId, direction: "inbound", fromEmail: "newsletter@facilitiesmag.com", fromName: "Facilities Magazine", toEmails: ["chase@m5svcs.com"], subject: "Weekly Digest: Top Facility Management Trends for 2026", bodySnippet: "This week in facilities: AI-powered predictive maintenance is reshaping how commercial properties handle equipment failures...", receivedAt: h(16), isProcessed: true },
      { gmailMessageId: "seed_msg_114", gmailThreadId: "seed_thr_111", userId, direction: "inbound", fromEmail: "rachel.nguyen@bayareaprops.com", fromName: "Rachel Nguyen", toEmails: ["chase@m5svcs.com"], subject: "Inquiry: Janitorial Services for New Property", bodySnippet: "Hi, I found M5 Services online. We are looking for janitorial services for a new 50,000 sqft office building in San Ramon.", fullBody: "Hi,\n\nI found M5 Services online and was impressed by your portfolio. We are looking for janitorial services for a new 50,000 sqft office building in San Ramon that opens in June.\n\nAre you taking new clients?\n\nBest regards,\nRachel Nguyen\nProperty Manager\nBay Area Properties", receivedAt: h(10), aiSummary: "New business inquiry from Rachel Nguyen at Bay Area Properties. Looking for janitorial services for a 50K sqft office in San Ramon opening in June.", aiSuggestedTasks: [{ title: "Respond to Bay Area Properties inquiry", priority: "high", dueInDays: 1 }, { title: "Research Bay Area Properties and add to CRM", priority: "medium", dueInDays: 2 }], aiSentiment: "positive", requiresResponse: true, isProcessed: true },
    ];

    for (const seed of seeds) {
      try {
        await db.insert(emailMessages).values(seed).onConflictDoNothing();
      } catch (e) {
        // skip on conflict
      }
    }
  }

  async migrateAdminToSuperAdmin(): Promise<void> {
    const existing = await db.select().from(users).where(eq(users.role, "super_admin"));
    if (existing.length === 0) {
      await db.update(users).set({ role: "super_admin" }).where(eq(users.role, "admin"));
    }
  }

  async migrateLeadLossColumns(): Promise<void> {
    try {
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_at timestamp`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS loss_reason varchar`);
      await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS loss_note text`);
    } catch (e) {
      console.error("migrateLeadLossColumns error:", e);
    }
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
  async listEmailMessages(filters?: { clientId?: number; leadId?: number; userId?: string; includeDismissed?: boolean }): Promise<EmailMessage[]> {
    const conditions: any[] = [];
    if (filters?.clientId) {
      conditions.push(eq(emailMessages.clientId, filters.clientId));
    } else if (filters?.leadId) {
      conditions.push(eq(emailMessages.leadId, filters.leadId));
    } else if (filters?.userId) {
      conditions.push(eq(emailMessages.userId, filters.userId));
    }
    if (!filters?.includeDismissed) {
      conditions.push(eq(emailMessages.isDismissed, false));
    }
    // Always exclude suppressed (auto-filtered noise)
    conditions.push(eq(emailMessages.isSuppressed, false));
    let query = db.select().from(emailMessages).orderBy(desc(emailMessages.receivedAt)) as any;
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
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
      // Preserve isDismissed — never let a sync reset a user-dismissed email
      const { isDismissed: _preserve, ...updateData } = data as any;
      const [updated] = await db
        .update(emailMessages)
        .set(updateData)
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

  async bulkAssignEmailThreads(gmailThreadIds: string[], assignedUserId: string): Promise<void> {
    if (gmailThreadIds.length === 0) return;
    await db.update(emailMessages)
      .set({ assignedUserId })
      .where(inArray(emailMessages.gmailThreadId, gmailThreadIds));
  }

  async migrateEmailMessageColumns(): Promise<void> {
    try {
      await db.execute(sql`ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS assigned_user_id varchar REFERENCES users(id)`);
      await db.execute(sql`ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS request_type varchar`);
      await db.execute(sql`ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS is_suppressed boolean NOT NULL DEFAULT false`);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS email_thread_notes (
          id serial PRIMARY KEY,
          gmail_thread_id varchar NOT NULL,
          user_id varchar REFERENCES users(id) NOT NULL,
          content text NOT NULL,
          created_at timestamp DEFAULT now() NOT NULL
        )
      `);
    } catch (e: any) {
      console.log("[migration] email_message columns/email_thread_notes:", e.message);
    }
  }

  async migrateMeetingTypeColumn(): Promise<void> {
    try {
      await db.execute(sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_type varchar NOT NULL DEFAULT 'standard'`);
    } catch (e: any) {
      console.log("[migration] meetings.meeting_type:", e.message);
    }
  }

  // Email Thread Notes
  async listEmailThreadNotes(gmailThreadId: string): Promise<(EmailThreadNote & { userName: string })[]> {
    const notes = await db.select().from(emailThreadNotes)
      .where(eq(emailThreadNotes.gmailThreadId, gmailThreadId))
      .orderBy(emailThreadNotes.createdAt);
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map(u => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u.id]));
    return notes.map(n => ({ ...n, userName: userMap.get(n.userId) ?? n.userId }));
  }

  async createEmailThreadNote(data: InsertEmailThreadNote): Promise<EmailThreadNote> {
    const [note] = await db.insert(emailThreadNotes).values(data).returning();
    return note;
  }

  async getEmailThreadNote(id: number): Promise<EmailThreadNote | undefined> {
    const [note] = await db.select().from(emailThreadNotes).where(eq(emailThreadNotes.id, id));
    return note;
  }

  async deleteEmailThreadNote(id: number): Promise<void> {
    await db.delete(emailThreadNotes).where(eq(emailThreadNotes.id, id));
  }

  // Dismissed Senders
  async getDismissedSenders(userId: string): Promise<DismissedSender[]> {
    return db.select().from(dismissedSenders).where(eq(dismissedSenders.userId, userId)).orderBy(desc(dismissedSenders.createdAt));
  }

  async addDismissedSender(userId: string, emailAddress: string): Promise<DismissedSender> {
    const lower = emailAddress.toLowerCase().trim();
    const existing = await db.select().from(dismissedSenders).where(and(eq(dismissedSenders.userId, userId), eq(dismissedSenders.emailAddress, lower)));
    if (existing.length > 0) return existing[0];
    const [created] = await db.insert(dismissedSenders).values({ userId, emailAddress: lower }).returning();

    if (lower.startsWith("@")) {
      // Domain-level: dismiss all existing emails from this domain
      const domain = lower.slice(1);
      const allUserEmails = await db.select().from(emailMessages).where(eq(emailMessages.userId, userId));
      const toUpdate = allUserEmails.filter(e => e.fromEmail.toLowerCase().endsWith(`@${domain}`)).map(e => e.id);
      if (toUpdate.length > 0) {
        await db.update(emailMessages).set({ isDismissed: true }).where(and(eq(emailMessages.userId, userId), inArray(emailMessages.id, toUpdate)));
      }
    } else {
      // Individual sender: dismiss all emails from this address
      await db.update(emailMessages).set({ isDismissed: true }).where(and(eq(emailMessages.userId, userId), eq(emailMessages.fromEmail, lower)));
    }

    return created;
  }

  async removeDismissedSender(userId: string, emailAddress: string): Promise<void> {
    await db.delete(dismissedSenders).where(and(eq(dismissedSenders.userId, userId), eq(dismissedSenders.emailAddress, emailAddress.toLowerCase())));
  }

  async isDismissedSender(userId: string, emailAddress: string): Promise<boolean> {
    const lower = emailAddress.toLowerCase();
    const domain = lower.includes("@") ? "@" + lower.split("@")[1] : "";
    const checks = [lower, domain].filter(Boolean);
    for (const check of checks) {
      const rows = await db.select().from(dismissedSenders).where(and(eq(dismissedSenders.userId, userId), eq(dismissedSenders.emailAddress, check)));
      if (rows.length > 0) return true;
    }
    return false;
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
  async listPortfolios(clientId?: number): Promise<(BuildingPortfolio & { buildings: PortfolioBuilding[]; contacts: PortfolioContact[] })[]> {
    const portfolioRows = clientId !== undefined
      ? await db.select().from(buildingPortfolios).where(eq(buildingPortfolios.clientId, clientId)).orderBy(buildingPortfolios.name)
      : await db.select().from(buildingPortfolios).orderBy(buildingPortfolios.name);

    if (portfolioRows.length === 0) return [];

    const ids = portfolioRows.map(p => p.id);
    const allBuildingRows = await db.select().from(portfolioBuildings).where(inArray(portfolioBuildings.portfolioId, ids));
    const allContactRows = await db.select().from(portfolioContacts).where(inArray(portfolioContacts.portfolioId, ids));

    return portfolioRows.map(p => ({
      ...p,
      buildings: allBuildingRows.filter(b => b.portfolioId === p.id),
      contacts: allContactRows.filter(c => c.portfolioId === p.id),
    }));
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

  // Building Contacts (multiple contacts per building)
  async getBuildingContacts(buildingId: number): Promise<BuildingContact[]> {
    return await db.select().from(buildingContacts).where(eq(buildingContacts.buildingId, buildingId));
  }

  async addContactToBuilding(buildingId: number, contactId: number): Promise<BuildingContact> {
    const existing = await db.select().from(buildingContacts)
      .where(and(eq(buildingContacts.buildingId, buildingId), eq(buildingContacts.contactId, contactId)));
    if (existing.length > 0) return existing[0];
    const [row] = await db.insert(buildingContacts).values({ buildingId, contactId }).returning();
    return row;
  }

  async removeContactFromBuilding(buildingId: number, contactId: number): Promise<void> {
    await db.delete(buildingContacts)
      .where(and(eq(buildingContacts.buildingId, buildingId), eq(buildingContacts.contactId, contactId)));
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
  async updateUserProfile(id: string, data: { firstName?: string; lastName?: string; phone?: string; profileImageUrl?: string; dashboardFilter?: string; emailNotifyTaskAssigned?: boolean; emailNotifyTaskDue?: boolean; emailNotifyAnnouncement?: boolean; emailNotifyReminder?: boolean }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // BuildOps Rep Matching
  async getBuildOpsRepsForMatching(): Promise<{ buildopsId: string; name: string; email: string | null }[]> {
    const rows = await db
      .select({ buildopsId: buildopsEmployees.buildopsId, name: buildopsEmployees.name, email: buildopsEmployees.email })
      .from(buildopsEmployees)
      .orderBy(buildopsEmployees.name);
    return rows.map(r => ({ buildopsId: r.buildopsId, name: r.name, email: r.email ?? null }));
  }

  async upsertBuildOpsEmployees(employees: { buildopsId: string; name: string; email: string | null; phone: string | null; title: string | null; isActive: boolean }[]): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    for (const emp of employees) {
      const existing = await db.select().from(buildopsEmployees).where(eq(buildopsEmployees.buildopsId, emp.buildopsId)).limit(1);
      if (existing.length > 0) {
        await db.update(buildopsEmployees)
          .set({ name: emp.name, email: emp.email, phone: emp.phone, title: emp.title, isActive: emp.isActive, syncedAt: new Date() })
          .where(eq(buildopsEmployees.buildopsId, emp.buildopsId));
        updated++;
      } else {
        await db.insert(buildopsEmployees).values({ buildopsId: emp.buildopsId, name: emp.name, email: emp.email, phone: emp.phone, title: emp.title, isActive: emp.isActive ?? true, syncedAt: new Date() });
        created++;
      }
    }
    return { created, updated };
  }

  async updateUserBuildopsRep(userId: string, buildopsRepId: string | null): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ buildopsRepId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllBuildOpsEmployees(): Promise<BuildopsEmployee[]> {
    return db.select().from(buildopsEmployees).orderBy(buildopsEmployees.name);
  }

  async updateBuildOpsEmployeeType(id: number, employmentType: string): Promise<BuildopsEmployee> {
    const [emp] = await db
      .update(buildopsEmployees)
      .set({ employmentType })
      .where(eq(buildopsEmployees.id, id))
      .returning();
    return emp;
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

  async bulkUpdateLeads(ids: number[], data: { stagePerLead?: Map<number, string>; assignedTo?: string | null }): Promise<number> {
    if (!ids.length) return 0;
    const now = new Date();
    return await db.transaction(async (tx) => {
      // Validate all requested IDs exist — fetch existing rows inside the transaction
      const existingLeads = await tx.select({ id: leads.id, stage: leads.stage, wonAt: leads.wonAt }).from(leads).where(inArray(leads.id, ids));
      if (existingLeads.length !== ids.length) {
        throw new Error(`One or more leads not found`);
      }
      if (data.stagePerLead !== undefined) {
        // Group leads by resolved target stage and apply wonAt logic per-group
        const stageGroups = new Map<string, { id: number; needsWonAt: boolean }[]>();
        for (const lead of existingLeads) {
          const targetStage = data.stagePerLead.get(lead.id)!;
          const needsWonAt = targetStage === "won" && lead.stage !== "won" && !lead.wonAt;
          const group = stageGroups.get(targetStage) ?? [];
          group.push({ id: lead.id, needsWonAt });
          stageGroups.set(targetStage, group);
        }
        for (const [targetStage, group] of stageGroups) {
          const wonIds = group.filter(g => g.needsWonAt).map(g => g.id);
          const nonWonIds = group.filter(g => !g.needsWonAt).map(g => g.id);
          if (wonIds.length > 0) {
            await tx.update(leads).set({ stage: targetStage, wonAt: now, updatedAt: now }).where(inArray(leads.id, wonIds));
          }
          if (nonWonIds.length > 0) {
            await tx.update(leads).set({ stage: targetStage, updatedAt: now }).where(inArray(leads.id, nonWonIds));
          }
        }
      } else {
        const clean: Record<string, unknown> = { updatedAt: now };
        if ("assignedTo" in data) clean.assignedTo = data.assignedTo;
        await tx.update(leads).set(clean).where(inArray(leads.id, ids));
      }
      return existingLeads.length;
    });
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
        logActivity: sql<Date>`als.max_date`,
        noteActivity: sql<Date>`lns.max_date`,
        stageChangedAt: sql<Date>`sus.max_date`,
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
  async getAppSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return row?.value ?? null;
  }

  async setAppSetting(key: string, value: string): Promise<void> {
    await db
      .insert(appSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  }

  async createAiFeedback(data: InsertAiFeedback): Promise<AiFeedback> {
    const [row] = await db.insert(aiFeedback).values(data).returning();
    return row;
  }

  async createBuildopsSyncLog(data: { entityType: string; entityId?: number | null; buildopsId?: string | null; action: string; message?: string | null }): Promise<BuildopsSyncLog> {
    const [row] = await db.insert(buildopsSyncLog).values(data).returning();
    return row;
  }

  async listBuildopsSyncLogs(limit = 50): Promise<BuildopsSyncLog[]> {
    return db.select().from(buildopsSyncLog).orderBy(desc(buildopsSyncLog.createdAt)).limit(limit);
  }

  async getLastBuildopsSync(): Promise<BuildopsSyncLog | null> {
    const [row] = await db.select().from(buildopsSyncLog).orderBy(desc(buildopsSyncLog.createdAt)).limit(1);
    return row ?? null;
  }

  async migrateClientOnboardingChecklist(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS client_onboarding_checklist (
          id serial PRIMARY KEY,
          client_id integer NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          item_key varchar(100) NOT NULL,
          is_completed boolean NOT NULL DEFAULT false,
          completed_at timestamp,
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
    } catch (e) {
      console.error("migrateClientOnboardingChecklist: create table error:", e);
    }
    try {
      await db.execute(sql`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'client_onboarding_checklist_client_id_item_key_unique'
            AND table_name = 'client_onboarding_checklist'
          ) THEN
            ALTER TABLE client_onboarding_checklist
              ADD CONSTRAINT client_onboarding_checklist_client_id_item_key_unique
              UNIQUE (client_id, item_key);
          END IF;
        END $$
      `);
    } catch (e) {
      console.error("migrateClientOnboardingChecklist: unique constraint error:", e);
    }
  }

  async getClientOnboardingChecklist(clientId: number): Promise<ClientOnboardingChecklist[]> {
    return db.select().from(clientOnboardingChecklist).where(eq(clientOnboardingChecklist.clientId, clientId));
  }

  async upsertClientOnboardingItem(clientId: number, itemKey: string, isCompleted: boolean): Promise<ClientOnboardingChecklist> {
    const [row] = await db
      .insert(clientOnboardingChecklist)
      .values({
        clientId,
        itemKey,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [clientOnboardingChecklist.clientId, clientOnboardingChecklist.itemKey],
        set: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  async getOnboardingCompletionMap(clientIds: number[], applicableClientIds?: number[]): Promise<Map<number, { completed: number; total: number }>> {
    const TOTAL_ITEMS = ONBOARDING_TOTAL_ITEMS;
    const map = new Map<number, { completed: number; total: number }>();
    if (clientIds.length === 0) return map;
    const rows = await db.select().from(clientOnboardingChecklist).where(inArray(clientOnboardingChecklist.clientId, clientIds));
    const completedByClient = new Map<number, number>();
    for (const row of rows) {
      if (row.isCompleted) {
        completedByClient.set(row.clientId, (completedByClient.get(row.clientId) ?? 0) + 1);
      }
    }
    const applicable = applicableClientIds ?? Array.from(completedByClient.keys());
    for (const clientId of applicable) {
      if (clientIds.includes(clientId)) {
        map.set(clientId, { completed: completedByClient.get(clientId) ?? 0, total: TOTAL_ITEMS });
      }
    }
    return map;
  }

  async getClientEmailResponseRate(clientId: number): Promise<{ outboundEmails: number; emailsWithReply: number; responseRate: number | null }> {
    // Fetch all outbound email messages for this client
    const outboundEmails = await db
      .select({ id: emailMessages.id, gmailThreadId: emailMessages.gmailThreadId })
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.clientId, clientId),
          eq(emailMessages.direction, "outbound")
        )
      );

    const outboundCount = outboundEmails.length;

    if (outboundCount === 0) {
      return { outboundEmails: 0, emailsWithReply: 0, responseRate: null };
    }

    // Get all unique thread IDs from outbound emails
    const outboundThreadIds = [...new Set(outboundEmails.map(e => e.gmailThreadId))];

    // Find which threads have at least one inbound reply
    const inboundReplies = await db
      .select({ gmailThreadId: emailMessages.gmailThreadId })
      .from(emailMessages)
      .where(
        and(
          inArray(emailMessages.gmailThreadId, outboundThreadIds),
          eq(emailMessages.direction, "inbound")
        )
      );

    // Thread IDs that got a reply
    const repliedThreadIds = new Set(inboundReplies.map(e => e.gmailThreadId));

    // Count outbound emails whose thread received a reply
    const emailsWithReply = outboundEmails.filter(e => repliedThreadIds.has(e.gmailThreadId)).length;
    const responseRate = Math.round((emailsWithReply / outboundCount) * 100);

    return { outboundEmails: outboundCount, emailsWithReply, responseRate };
  }

  async getMonthlyBusinessReview(year: number, month: number): Promise<any> {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    // 1. New revenue collected (BuildOps invoices issued in the month)
    const invoiceRows = await db
      .select({
        totalAmount: buildopsInvoices.totalAmount,
        clientId: buildopsInvoices.clientId,
        customerName: buildopsInvoices.customerName,
      })
      .from(buildopsInvoices)
      .where(
        and(
          sql`${buildopsInvoices.issuedDate} >= ${monthStart}`,
          sql`${buildopsInvoices.issuedDate} < ${monthEnd}`,
          sql`${buildopsInvoices.status} NOT IN ('void', 'cancelled')`
        )
      );
    const newRevenue = invoiceRows.reduce((s, r) => s + parseFloat(r.totalAmount || "0"), 0);

    // 2. New deals won (leads moved to "won" during the month)
    const wonLeads = await db
      .select({
        id: leads.id,
        title: leads.title,
        value: leads.value,
        valueType: leads.valueType,
        valueTier: leads.valueTier,
        buildopsQuoteTotal: leads.buildopsQuoteTotal,
        buildopsQuoteId: leads.buildopsQuoteId,
        clientId: leads.clientId,
        wonAt: leads.wonAt,
        updatedAt: leads.updatedAt,
      })
      .from(leads)
      .where(
        and(
          eq(leads.stage, "won"),
          sql`COALESCE(${leads.wonAt}, ${leads.updatedAt}) >= ${monthStart}`,
          sql`COALESCE(${leads.wonAt}, ${leads.updatedAt}) < ${monthEnd}`
        )
      );

    const tierSettings = await this.getValueTierSettings();
    const tierMap: Record<string, number> = {};
    for (const ts of tierSettings) {
      tierMap[ts.tier] = parseFloat(ts.estimatedValue);
    }
    const getLeadValue = (lead: { value: string | null; valueType: string | null; valueTier: string | null }) => {
      if (lead.valueType === "potential" && lead.valueTier) return tierMap[lead.valueTier] ?? 0;
      return parseFloat(lead.value || "0");
    };

    const wonDealsCount = wonLeads.length;
    // Prefer buildopsQuoteTotal (actual quote amount from BuildOps) over manually-entered CRM value
    const wonDealsValue = wonLeads.reduce((s, l) => {
      const boTotal = l.buildopsQuoteTotal ? parseFloat(l.buildopsQuoteTotal) : null;
      return s + (boTotal !== null && boTotal > 0 ? boTotal : parseFloat(l.value || "0"));
    }, 0);

    // 3. Pipeline value added (new leads created in the month that are active)
    const newPipelineLeads = await db
      .select({
        id: leads.id,
        value: leads.value,
        valueType: leads.valueType,
        valueTier: leads.valueTier,
        stage: leads.stage,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(
        and(
          sql`${leads.createdAt} >= ${monthStart}`,
          sql`${leads.createdAt} < ${monthEnd}`,
          sql`${leads.stage} NOT IN ('won', 'lost')`
        )
      );
    const pipelineAdded = newPipelineLeads.reduce((s, l) => s + getLeadValue(l), 0);

    // 4. Proposals / quotes sent vs won vs lost
    // Three sources are combined, deduplicating by source to avoid double-counting:
    //   A) CRM-native proposals (proposals table)
    //   B) CRM-native estimates (estimates table)
    //   C) BuildOps-linked leads (classified by buildopsQuoteStatus)
    //   D) CRM-only leads (no buildopsQuoteId, classified by stage)
    const _toRowsWL = (r: any): any[] => Array.isArray(r) ? r : r?.rows ?? [];

    // A) CRM proposals
    const proposalRows = await db
      .select({ status: proposals.status, count: sql<number>`count(*)` })
      .from(proposals)
      .where(
        and(
          sql`${proposals.createdAt} >= ${monthStart}`,
          sql`${proposals.createdAt} < ${monthEnd}`,
          sql`${proposals.status} IN ('sent', 'signed')`
        )
      )
      .groupBy(proposals.status);

    // B) CRM estimates
    const estimateRows = await db
      .select({ status: estimates.status, count: sql<number>`count(*)` })
      .from(estimates)
      .where(
        and(
          sql`${estimates.createdAt} >= ${monthStart}`,
          sql`${estimates.createdAt} < ${monthEnd}`,
          sql`${estimates.status} IN ('sent', 'accepted', 'rejected')`
        )
      )
      .groupBy(estimates.status);

    // C) BuildOps-linked leads — use buildopsQuoteStatus for classification
    // Win states: approved, accepted, jobadded, converted, projectadded
    // Loss states: rejected, declined, expired, cancelled
    // Draft states (not sent yet): draft, new, open
    // Sent = everything else (pending, submitted, etc.) or won/lost states that updated in the month
    const boQuoteSentResult = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM leads
      WHERE buildops_quote_id IS NOT NULL
        AND LOWER(COALESCE(buildops_quote_status, '')) NOT IN ('draft', 'new', 'open', '')
        AND updated_at >= ${monthStart}
        AND updated_at < ${monthEnd}
    `);
    const boQuoteWonResult = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM leads
      WHERE buildops_quote_id IS NOT NULL
        AND LOWER(buildops_quote_status) IN ('approved', 'accepted', 'jobadded', 'converted', 'projectadded')
        AND COALESCE(won_at, updated_at) >= ${monthStart}
        AND COALESCE(won_at, updated_at) < ${monthEnd}
    `);
    const boQuoteLostResult = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM leads
      WHERE buildops_quote_id IS NOT NULL
        AND LOWER(buildops_quote_status) IN ('rejected', 'declined', 'expired', 'cancelled')
        AND COALESCE(lost_at, updated_at) >= ${monthStart}
        AND COALESCE(lost_at, updated_at) < ${monthEnd}
    `);

    // D) CRM-only leads (no BuildOps quote attached) classified by stage
    const crmOnlyWonResult = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM leads
      WHERE buildops_quote_id IS NULL
        AND stage = 'won'
        AND COALESCE(won_at, updated_at) >= ${monthStart}
        AND COALESCE(won_at, updated_at) < ${monthEnd}
    `);
    const crmOnlyLostResult = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM leads
      WHERE buildops_quote_id IS NULL
        AND stage = 'lost'
        AND COALESCE(lost_at, updated_at) >= ${monthStart}
        AND COALESCE(lost_at, updated_at) < ${monthEnd}
    `);
    const crmOnlySentResult = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM leads
      WHERE buildops_quote_id IS NULL
        AND stage = 'proposal_sent'
        AND updated_at >= ${monthStart}
        AND updated_at < ${monthEnd}
    `);

    const proposalSent = Number(proposalRows.find(r => r.status === "sent")?.count ?? 0);
    const proposalSigned = Number(proposalRows.find(r => r.status === "signed")?.count ?? 0);
    const estimateSent = Number(estimateRows.find(r => r.status === "sent")?.count ?? 0);
    const estimateAccepted = Number(estimateRows.find(r => r.status === "accepted")?.count ?? 0);
    const estimateRejected = Number(estimateRows.find(r => r.status === "rejected")?.count ?? 0);
    const boSent = Number(_toRowsWL(boQuoteSentResult)[0]?.count ?? 0);
    const boWon = Number(_toRowsWL(boQuoteWonResult)[0]?.count ?? 0);
    const boLost = Number(_toRowsWL(boQuoteLostResult)[0]?.count ?? 0);
    const crmWon = Number(_toRowsWL(crmOnlyWonResult)[0]?.count ?? 0);
    const crmLost = Number(_toRowsWL(crmOnlyLostResult)[0]?.count ?? 0);
    const crmSent = Number(_toRowsWL(crmOnlySentResult)[0]?.count ?? 0);

    // Total sent = all quotes/proposals that left draft state this month (won/lost also count as "sent")
    const totalSent = proposalSent + proposalSigned + estimateSent + estimateAccepted + estimateRejected + boSent + crmSent;
    const totalWon = proposalSigned + estimateAccepted + boWon + crmWon;
    const totalLost = estimateRejected + boLost + crmLost;

    // 5. Active clients this month (distinct clients with ≥1 invoice in the period)
    const activeClientResult = await db.execute(sql`
      SELECT COUNT(DISTINCT client_id) AS count
      FROM buildops_invoices
      WHERE issued_date >= ${monthStart}
        AND issued_date < ${monthEnd}
        AND client_id IS NOT NULL
        AND status NOT IN ('void', 'cancelled')
    `);
    const _toRows = (r: any): any[] => Array.isArray(r) ? r : r?.rows ?? [];
    const activeClientsCount = Number((_toRows(activeClientResult)[0] as any)?.count ?? 0);

    // 6. Client health score distribution — all current clients, using same computeHealthScoreV2 as Customer Intelligence
    const allClientsForHealth = await db
      .select({ id: clients.id, name: clients.name, healthOverride: clients.healthOverride })
      .from(clients);

    const toJobRows = (r: any): any[] => Array.isArray(r) ? r : r?.rows ?? [];

    // Date anchors for all health signals
    const ninetyDaysAgo = new Date(monthEnd.getTime() - 90 * 24 * 60 * 60 * 1000);
    const priorNinetyStart = new Date(ninetyDaysAgo.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(monthEnd.getTime() - 180 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(monthEnd.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Job velocity using completed_date (same as Customer Intelligence)
    // + COALESCE(completed_date, scheduled_date) for 6m/12m recency windows
    const jobVelocityResult = await db.execute(sql`
      SELECT
        client_id,
        COUNT(*) FILTER (WHERE completed_date >= ${ninetyDaysAgo} AND completed_date < ${monthEnd}) AS last90,
        COUNT(*) FILTER (WHERE completed_date >= ${priorNinetyStart} AND completed_date < ${ninetyDaysAgo}) AS prior90,
        COUNT(*) FILTER (WHERE COALESCE(completed_date, scheduled_date) >= ${sixMonthsAgo} AND COALESCE(completed_date, scheduled_date) < ${monthEnd}) AS last_6m,
        COUNT(*) FILTER (WHERE COALESCE(completed_date, scheduled_date) >= ${twelveMonthsAgo} AND COALESCE(completed_date, scheduled_date) < ${monthEnd}) AS last_12m
      FROM buildops_jobs
      WHERE client_id IS NOT NULL
        AND (
          completed_date >= ${priorNinetyStart}
          OR COALESCE(completed_date, scheduled_date) >= ${twelveMonthsAgo}
        )
      GROUP BY client_id
    `);
    const jobMap = new Map<number, { last90: number; prior90: number; last6m: number; last12m: number }>();
    for (const r of toJobRows(jobVelocityResult) as any[]) {
      if (!r.client_id) continue;
      jobMap.set(r.client_id, {
        last90: Number(r.last90 ?? 0),
        prior90: Number(r.prior90 ?? 0),
        last6m: Number(r.last_6m ?? 0),
        last12m: Number(r.last_12m ?? 0),
      });
    }

    // Per-client monthly invoice series (last 6 months) — used with computeInvoiceTrend utility
    // Uses COALESCE(issued_date, due_date, synced_at) same as Customer Intelligence
    const invoiceMonthlyResult = await db.execute(sql`
      SELECT
        client_id,
        TO_CHAR(DATE_TRUNC('month', COALESCE(issued_date, due_date, synced_at)), 'YYYY-MM') AS month,
        COALESCE(SUM(CAST(total_amount AS numeric)), 0) AS total
      FROM buildops_invoices
      WHERE COALESCE(issued_date, due_date, synced_at) >= ${sixMonthsAgo}
        AND COALESCE(issued_date, due_date, synced_at) < ${monthEnd}
        AND client_id IS NOT NULL
        AND status NOT IN ('void', 'cancelled')
      GROUP BY 1, 2
    `);
    // Build per-client monthly arrays for computeInvoiceTrend
    const invoiceMonthlyMap = new Map<number, { month: string; total: number }[]>();
    for (const r of toJobRows(invoiceMonthlyResult) as any[]) {
      if (!r.client_id) continue;
      const arr = invoiceMonthlyMap.get(r.client_id) ?? [];
      arr.push({ month: r.month as string, total: Number(r.total ?? 0) });
      invoiceMonthlyMap.set(r.client_id, arr);
    }

    // LTV: all-time invoice sum per client (fallback: won-deal values for unsynced invoices)
    const invoiceLtvResult = await db.execute(sql`
      SELECT client_id, COALESCE(SUM(CAST(total_amount AS numeric)), 0) AS ltv
      FROM buildops_invoices
      WHERE client_id IS NOT NULL
        AND status NOT IN ('void', 'cancelled')
      GROUP BY client_id
    `);
    const wonDealLtvResult = await db.execute(sql`
      SELECT client_id, COALESCE(SUM(CAST(value AS numeric)), 0) AS won_ltv
      FROM leads
      WHERE client_id IS NOT NULL AND stage = 'won'
      GROUP BY client_id
    `);
    const invoiceLtvMap = new Map<number, number>();
    const wonDealLtvMap = new Map<number, number>();
    for (const r of toJobRows(invoiceLtvResult) as any[]) {
      if (r.client_id) invoiceLtvMap.set(r.client_id, Number(r.ltv ?? 0));
    }
    for (const r of toJobRows(wonDealLtvResult) as any[]) {
      if (r.client_id) wonDealLtvMap.set(r.client_id, Number(r.won_ltv ?? 0));
    }

    // Active service agreements per client — aligned with Customer Intelligence:
    // active = end_date is null or in future, and not cancelled via advanced_scheduling_state
    const saResult = await db.execute(sql`
      SELECT DISTINCT client_id
      FROM buildops_agreements
      WHERE client_id IS NOT NULL
        AND (end_date IS NULL OR end_date > ${monthEnd})
        AND (advanced_scheduling_state IS NULL
             OR LOWER(advanced_scheduling_state) NOT IN ('canceled', 'cancelled'))
    `);
    const saSet = new Set<number>();
    for (const r of toJobRows(saResult) as any[]) {
      if (r.client_id) saSet.add(r.client_id);
    }

    // Open deals per client — exact same stage filter as Customer Intelligence health scoring
    const openDealsResult = await db.execute(sql`
      SELECT client_id, COUNT(*) AS count
      FROM leads
      WHERE client_id IS NOT NULL
        AND stage NOT IN ('won', 'lost', 'canceled')
      GROUP BY client_id
    `);
    const openDealsMap = new Map<number, number>();
    for (const r of toJobRows(openDealsResult) as any[]) {
      if (r.client_id) openDealsMap.set(r.client_id, Number(r.count ?? 0));
    }

    let healthyCount = 0;
    let watchCount = 0;
    let atRiskCount = 0;

    for (const c of allClientsForHealth) {
      const jobs = jobMap.get(c.id) ?? { last90: 0, prior90: 0, last6m: 0, last12m: 0 };
      const invoiceLtv = invoiceLtvMap.get(c.id) ?? 0;
      const wonLtv = wonDealLtvMap.get(c.id) ?? 0;
      const ltv = Math.max(invoiceLtv, wonLtv);
      const hasActiveSA = saSet.has(c.id);
      const openDeals = openDealsMap.get(c.id) ?? 0;

      const velocityDirection = computeVelocityDirection(jobs.last90, jobs.prior90);
      const monthlyAmounts = invoiceMonthlyMap.get(c.id) ?? [];
      const { invoiceTrend } = computeInvoiceTrend(monthlyAmounts, monthEnd);

      const { healthStatus } = computeHealthScoreV2(
        velocityDirection,
        openDeals,
        hasActiveSA,
        ltv,
        invoiceTrend,
        null,
        c.healthOverride,
        jobs.last6m,
        jobs.last12m,
      );

      if (healthStatus === "healthy") healthyCount++;
      else if (healthStatus === "watch") watchCount++;
      else atRiskCount++;
    }

    // 7. Top 5 clients by revenue in the month (BuildOps invoices)
    const clientRevenueMap = new Map<number, { name: string; revenue: number }>();
    for (const inv of invoiceRows) {
      if (!inv.clientId) continue;
      const existing = clientRevenueMap.get(inv.clientId);
      if (existing) {
        existing.revenue += parseFloat(inv.totalAmount || "0");
      } else {
        clientRevenueMap.set(inv.clientId, {
          name: inv.customerName ?? "Unknown",
          revenue: parseFloat(inv.totalAmount || "0"),
        });
      }
    }
    // Fetch client names from DB to prefer CRM names over BuildOps customer names
    const clientIdsForRevenue = [...clientRevenueMap.keys()];
    let crmClientNames = new Map<number, string>();
    if (clientIdsForRevenue.length > 0) {
      const crmRows = await db
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .where(inArray(clients.id, clientIdsForRevenue));
      for (const r of crmRows) crmClientNames.set(r.id, r.name);
    }
    const top5Clients = [...clientRevenueMap.entries()]
      .map(([clientId, data]) => ({
        clientId,
        name: crmClientNames.get(clientId) ?? data.name,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      year,
      month,
      newRevenue,
      wonDealsCount,
      wonDealsValue,
      pipelineAdded,
      proposals: {
        sent: totalSent,
        won: totalWon,
        lost: totalLost,
        total: totalSent,
      },
      activeClientsCount,
      clientHealth: {
        healthy: healthyCount,
        watch: watchCount,
        atRisk: atRiskCount,
      },
      top5Clients,
    };
  }

  async getClientServiceSegments(scopedUserId?: string): Promise<Record<number, string>> {
    // Map BuildOps job type names to our service categories using keyword matching
    function mapJobTypeToCategory(jobTypeName: string | null | undefined): string | null {
      if (!jobTypeName) return null;
      const name = jobTypeName.toLowerCase();
      if (name.includes("janitor") || name.includes("cleaning") || name.includes("janitorial")) return "janitorial";
      if (name.includes("engineer") || name.includes("mechanical") || name.includes("hvac") || name.includes("building engineer")) return "building_engineering";
      if (name.includes("special project") || name.includes("construction") || name.includes("renovation")) return "special_projects";
      if (name.includes("facility") || name.includes("maintenance") || name.includes("repair")) return "facility_solutions";
      if (name.includes("assessment") || name.includes("inspection") || name.includes("survey") || name.includes("audit")) return "property_assessment";
      return null;
    }

    // Fetch only the clients this user is allowed to see (matches /api/clients scoping)
    const accessibleClients = await db
      .select({ id: clients.id, serviceNeeds: clients.serviceNeeds })
      .from(clients)
      .where(scopedUserId ? eq(clients.createdBy, scopedUserId) : undefined);

    const accessibleClientIds = new Set(accessibleClients.map(c => c.id));

    // Query BuildOps job counts per accessible client and job type
    const accessibleIdList = [...accessibleClientIds];
    const jobRows = accessibleIdList.length > 0
      ? await db
          .select({
            clientId: buildopsJobs.clientId,
            jobTypeName: buildopsJobs.jobTypeName,
            count: sql<string>`COUNT(*)`,
          })
          .from(buildopsJobs)
          .where(and(
            sql`${buildopsJobs.clientId} IS NOT NULL`,
            sql`${buildopsJobs.jobTypeName} IS NOT NULL`,
            inArray(buildopsJobs.clientId, accessibleIdList),
          ))
          .groupBy(buildopsJobs.clientId, buildopsJobs.jobTypeName)
      : [];

    // For each client, find the most frequent mappable job type
    const clientJobCounts: Record<number, Record<string, number>> = {};
    for (const row of jobRows) {
      if (!row.clientId || !accessibleClientIds.has(row.clientId)) continue;
      const category = mapJobTypeToCategory(row.jobTypeName);
      if (!category) continue;
      if (!clientJobCounts[row.clientId]) clientJobCounts[row.clientId] = {};
      clientJobCounts[row.clientId][category] = (clientJobCounts[row.clientId][category] ?? 0) + Number(row.count);
    }

    // Build primary category from BuildOps jobs
    const buildopsCategories: Record<number, string> = {};
    for (const [clientIdStr, counts] of Object.entries(clientJobCounts)) {
      const clientId = Number(clientIdStr);
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) buildopsCategories[clientId] = sorted[0][0];
    }

    const result: Record<number, string> = {};
    for (const client of accessibleClients) {
      if (buildopsCategories[client.id]) {
        // Prefer BuildOps-derived category
        result[client.id] = buildopsCategories[client.id];
      } else if (client.serviceNeeds && client.serviceNeeds.length > 0) {
        // Fall back to first manually-set service need
        result[client.id] = client.serviceNeeds[0];
      }
      // Clients with neither get no entry (will be "Unclassified")
    }
    return result;
  }

  // Action Plans
  async listActionPlans(filters?: { type?: "customer" | "company"; clientId?: number | null; includeCompleted?: boolean }): Promise<ActionPlan[]> {
    const conditions = [];
    if (filters?.type) conditions.push(eq(actionPlans.type, filters.type));
    if (filters?.clientId !== undefined) {
      if (filters.clientId === null) {
        conditions.push(sql`${actionPlans.clientId} IS NULL`);
      } else {
        conditions.push(eq(actionPlans.clientId, filters.clientId));
      }
    }
    if (!filters?.includeCompleted) {
      conditions.push(eq(actionPlans.status, "open"));
    }
    if (conditions.length > 0) {
      return db.select().from(actionPlans).where(and(...conditions)).orderBy(desc(actionPlans.createdAt));
    }
    return db.select().from(actionPlans).orderBy(desc(actionPlans.createdAt));
  }

  async getActionPlan(id: number): Promise<ActionPlan | undefined> {
    const [plan] = await db.select().from(actionPlans).where(eq(actionPlans.id, id));
    return plan;
  }

  async createActionPlan(data: InsertActionPlan): Promise<ActionPlan> {
    const [plan] = await db.insert(actionPlans).values({
      ...data,
      clientId: data.clientId ?? null,
      dueDate: data.dueDate ?? null,
    }).returning();
    return plan;
  }

  async updateActionPlan(id: number, data: Partial<InsertActionPlan>): Promise<ActionPlan> {
    const [plan] = await db.update(actionPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(actionPlans.id, id))
      .returning();
    return plan;
  }

  async deleteActionPlan(id: number): Promise<void> {
    await db.delete(actionPlans).where(eq(actionPlans.id, id));
  }

}

export const storage = new DatabaseStorage();
