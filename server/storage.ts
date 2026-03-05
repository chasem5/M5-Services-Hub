import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  users,
  clients,
  clientOffices,
  clientContacts,
  contactBuildings,
  bdSpendEntries,
  leads,
  tasks,
  reminders,
  serviceCatalog,
  estimates,
  estimateLineItems,
  proposals,
  activityLogs,
  pipelineStages,
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
  type PipelineStage,
  type InsertPipelineStage,
  type ContactBuilding,
  type InsertContactBuilding,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  listUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;

  // Clients
  listClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;

  // Client Offices
  listClientOffices(clientId: number): Promise<ClientOffice[]>;
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
  listLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead>;
  updateLeadStage(id: number, stage: string): Promise<Lead>;
  deleteLead(id: number): Promise<void>;

  // Tasks
  listTasks(): Promise<Task[]>;
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
  listEstimates(): Promise<Estimate[]>;
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

  // Pipeline Stages
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

  // Clients
  async listClients(): Promise<Client[]> {
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
  async listLeads(): Promise<Lead[]> {
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
  async listTasks(): Promise<Task[]> {
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
  async listEstimates(): Promise<Estimate[]> {
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
    const activeLeads = await db.select({ count: sql<number>`count(*)` }).from(leads).where(sql`${leads.stage} NOT IN ('won', 'lost')`);
    const pipelineValue = await db.select({ total: sql<string>`sum(${leads.value})` }).from(leads).where(sql`${leads.stage} NOT IN ('won', 'lost')`);
    const openTasks = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(sql`${tasks.status} != 'done'`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tasksDueToday = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(sql`${tasks.dueDate} >= ${today}`, sql`${tasks.dueDate} < ${tomorrow}`));
    
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyRevenue = await db.select({ total: sql<string>`sum(${leads.value})` }).from(leads).where(and(eq(leads.stage, 'won'), sql`${leads.updatedAt} >= ${firstDayOfMonth}`));

    const leadStageCounts = await db.select({ stage: leads.stage, count: sql<number>`count(*)` }).from(leads).groupBy(leads.stage);

    return {
      activeLeads: activeLeads[0].count,
      pipelineValue: pipelineValue[0].total || "0",
      openTasks: openTasks[0].count,
      tasksDueToday: tasksDueToday[0].count,
      monthlyRevenue: monthlyRevenue[0].total || "0",
      leadStageCounts
    };
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
}

export const storage = new DatabaseStorage();
