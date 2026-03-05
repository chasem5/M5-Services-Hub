import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated, requireRole } from "./replit_integrations/auth/replitAuth";
import { 
  insertClientSchema, 
  insertClientOfficeSchema,
  insertClientContactSchema,
  insertContactBuildingSchema,
  insertLeadSchema, 
  insertTaskSchema, 
  insertReminderSchema, 
  insertServiceCatalogSchema, 
  insertEstimateSchema, 
  insertEstimateLineItemSchema, 
  insertProposalSchema,
  insertPipelineStageSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed default pipeline stages on startup
  await storage.seedDefaultPipelineStages();

  // Helper to log activity
  const logActivity = async (req: any, entityType: any, entityId: number, action: string, metadata?: any) => {
    const userId = req.user.claims.sub;
    await storage.createActivityLog({
      entityType,
      entityId,
      userId,
      action,
      metadata
    });
  };

  // Dashboard
  app.get("/api/dashboard", isAuthenticated, async (_req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // Users (Admin only)
  app.get("/api/users", isAuthenticated, requireRole(["admin"]), async (_req, res) => {
    const users = await storage.listUsers();
    res.json(users);
  });

  app.put("/api/users/:id/role", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    const id = req.params.id as string;
    const { role } = z.object({ role: z.enum(["admin", "manager", "member"]) }).parse(req.body);
    const user = await storage.updateUserRole(id, role);
    res.json(user);
  });

  // Clients
  app.get("/api/clients", isAuthenticated, async (_req, res) => {
    const clients = await storage.listClients();
    res.json(clients);
  });

  app.post("/api/clients", isAuthenticated, async (req, res) => {
    const userId = (req as any).user.claims.sub;
    const clientData = insertClientSchema.parse({ ...req.body, createdBy: userId });
    const client = await storage.createClient(clientData);
    await logActivity(req, "client", client.id, "created");
    res.json(client);
  });

  app.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const client = await storage.getClient(id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  });

  app.put("/api/clients/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const clientData = insertClientSchema.partial().parse(req.body);
    const client = await storage.updateClient(id, clientData);
    await logActivity(req, "client", client.id, "updated", clientData);
    res.json(client);
  });

  app.delete("/api/clients/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    await storage.deleteClient(id);
    res.sendStatus(204);
  });

  // Client Contacts
  app.get("/api/client-contacts", isAuthenticated, async (_req, res) => {
    const contacts = await storage.listAllClientContacts();
    res.json(contacts);
  });

  app.get("/api/clients/:id/contacts", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const contacts = await storage.listClientContacts(id);
    res.json(contacts);
  });

  app.post("/api/clients/:id/contacts", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const contactData = insertClientContactSchema.parse({ ...req.body, clientId: id });
    const contact = await storage.createClientContact(contactData);
    res.json(contact);
  });

  app.put("/api/clients/:id/contacts/:contactId", isAuthenticated, async (req, res) => {
    const contactId = parseInt(req.params.contactId as string);
    const contact = await storage.updateClientContact(contactId, req.body);
    res.json(contact);
  });

  app.delete("/api/clients/:id/contacts/:contactId", isAuthenticated, async (req, res) => {
    const contactId = parseInt(req.params.contactId as string);
    await storage.deleteClientContact(contactId);
    res.sendStatus(204);
  });

  // All buildings for all contacts of a client (for portfolio map)
  app.get("/api/clients/:id/all-buildings", isAuthenticated, async (req, res) => {
    const clientId = parseInt(req.params.id as string);
    const contacts = await storage.listClientContacts(clientId);
    const allBuildings = await Promise.all(
      contacts.map(async (c) => {
        const buildings = await storage.listContactBuildings(c.id);
        return buildings.map(b => ({ ...b, contactName: c.name, contactId: c.id }));
      })
    );
    res.json(allBuildings.flat());
  });

  // Contact Buildings
  app.get("/api/contacts/:contactId/buildings", isAuthenticated, async (req, res) => {
    const contactId = parseInt(req.params.contactId as string);
    const buildings = await storage.listContactBuildings(contactId);
    res.json(buildings);
  });

  app.post("/api/contacts/:contactId/buildings", isAuthenticated, async (req, res) => {
    const contactId = parseInt(req.params.contactId as string);
    const data = insertContactBuildingSchema.parse({ ...req.body, contactId });
    const building = await storage.createContactBuilding(data);
    res.json(building);
  });

  app.put("/api/contacts/:contactId/buildings/:buildingId", isAuthenticated, async (req, res) => {
    const buildingId = parseInt(req.params.buildingId as string);
    const updated = await storage.updateContactBuilding(buildingId, req.body);
    res.json(updated);
  });

  app.delete("/api/contacts/:contactId/buildings/:buildingId", isAuthenticated, async (req, res) => {
    const buildingId = parseInt(req.params.buildingId as string);
    await storage.deleteContactBuilding(buildingId);
    res.sendStatus(204);
  });

  // Client Offices
  app.get("/api/clients/:id/offices", isAuthenticated, async (req, res) => {
    const clientId = parseInt(req.params.id as string);
    const offices = await storage.listClientOffices(clientId);
    res.json(offices);
  });

  app.post("/api/clients/:id/offices", isAuthenticated, async (req, res) => {
    const clientId = parseInt(req.params.id as string);
    const body = insertClientOfficeSchema.parse({ ...req.body, clientId });
    const office = await storage.createClientOffice(body);
    res.json(office);
  });

  app.put("/api/clients/:id/offices/:officeId", isAuthenticated, async (req, res) => {
    const officeId = parseInt(req.params.officeId as string);
    const updated = await storage.updateClientOffice(officeId, req.body);
    res.json(updated);
  });

  app.delete("/api/clients/:id/offices/:officeId", isAuthenticated, async (req, res) => {
    const officeId = parseInt(req.params.officeId as string);
    await storage.deleteClientOffice(officeId);
    res.sendStatus(204);
  });

  // Bulk Import
  app.post("/api/clients/import", isAuthenticated, async (req, res) => {
    const { rows } = req.body as { rows: Record<string, string>[] };
    if (!Array.isArray(rows)) return res.status(400).json({ message: "rows must be an array" });
    let created = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const data = insertClientSchema.parse({
          name: row.name || row.company_name || "",
          industry: row.industry || null,
          address: row.address || null,
          phone: row.phone || null,
          email: row.email || null,
          website: row.website || null,
          notes: row.notes || null,
          createdBy: (req as any).user?.id ?? null,
        });
        const client = await storage.createClient(data);
        await logActivity(req, "client", client.id, "created");
        created++;
      } catch (e: any) {
        errors.push(`Row ${i + 2}: ${e.message ?? String(e)}`);
      }
    }
    res.json({ created, errors });
  });

  app.post("/api/client-contacts/import", isAuthenticated, async (req, res) => {
    const { rows } = req.body as { rows: Record<string, string>[] };
    if (!Array.isArray(rows)) return res.status(400).json({ message: "rows must be an array" });
    const allClients = await storage.listClients();
    let created = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const companyName = (row.company_name || row.company || "").trim();
        const company = allClients.find(c => c.name.toLowerCase() === companyName.toLowerCase());
        if (!company) {
          errors.push(`Row ${i + 2}: Company "${companyName}" not found`);
          continue;
        }
        await storage.createClientContact({
          clientId: company.id,
          name: row.name || row.contact_name || "",
          title: row.title || null,
          email: row.email || null,
          phone: row.phone || null,
          isPrimary: row.is_primary === "true" || row.is_primary === "1" || row.is_primary === "yes",
          reportsTo: null,
          officeId: null,
        });
        created++;
      } catch (e: any) {
        errors.push(`Row ${i + 2}: ${e.message ?? String(e)}`);
      }
    }
    res.json({ created, errors });
  });

  // Leads
  app.get("/api/leads", isAuthenticated, async (_req, res) => {
    const leads = await storage.listLeads();
    res.json(leads);
  });

  app.post("/api/leads", isAuthenticated, async (req, res) => {
    const leadData = insertLeadSchema.parse(req.body);
    const lead = await storage.createLead(leadData);
    await logActivity(req, "lead", lead.id, "created");
    res.json(lead);
  });

  app.get("/api/leads/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const lead = await storage.getLead(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json(lead);
  });

  app.put("/api/leads/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const leadData = insertLeadSchema.partial().parse(req.body);
    const lead = await storage.updateLead(id, leadData);
    await logActivity(req, "lead", lead.id, "updated", leadData);
    res.json(lead);
  });

  app.patch("/api/leads/:id/stage", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const { stage } = z.object({ stage: z.string() }).parse(req.body);
    const lead = await storage.updateLeadStage(id, stage);
    await logActivity(req, "lead", lead.id, "stage_updated", { stage });
    res.json(lead);
  });

  app.delete("/api/leads/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    await storage.deleteLead(id);
    res.sendStatus(204);
  });

  // Tasks
  app.get("/api/tasks", isAuthenticated, async (_req, res) => {
    const tasks = await storage.listTasks();
    res.json(tasks);
  });

  app.post("/api/tasks", isAuthenticated, async (req, res) => {
    const taskData = insertTaskSchema.extend({ dueDate: z.coerce.date().optional().nullable() }).parse(req.body);
    const task = await storage.createTask(taskData);
    await logActivity(req, "task", task.id, "created");
    res.json(task);
  });

  app.get("/api/tasks/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const task = await storage.getTask(id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.put("/api/tasks/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const taskData = insertTaskSchema.extend({ dueDate: z.coerce.date().optional().nullable() }).partial().parse(req.body);
    const task = await storage.updateTask(id, taskData);
    await logActivity(req, "task", task.id, "updated", taskData);
    res.json(task);
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    await storage.deleteTask(id);
    res.sendStatus(204);
  });

  // Reminders
  app.get("/api/reminders", isAuthenticated, async (req, res) => {
    const userId = (req as any).user.claims.sub;
    const reminders = await storage.listReminders(userId);
    res.json(reminders);
  });

  app.post("/api/reminders", isAuthenticated, async (req, res) => {
    const userId = (req as any).user.claims.sub;
    const reminderData = insertReminderSchema.parse({ ...req.body, userId });
    const reminder = await storage.createReminder(reminderData);
    res.json(reminder);
  });

  app.patch("/api/reminders/:id/dismiss", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const reminder = await storage.dismissReminder(id);
    res.json(reminder);
  });

  // Service Catalog
  app.get("/api/service-catalog", isAuthenticated, async (_req, res) => {
    const items = await storage.listServiceCatalog();
    res.json(items);
  });

  app.post("/api/service-catalog", isAuthenticated, requireRole(["admin", "manager"]), async (req, res) => {
    const itemData = insertServiceCatalogSchema.parse(req.body);
    const item = await storage.createServiceCatalogItem(itemData);
    res.json(item);
  });

  app.get("/api/service-catalog/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const item = await storage.getServiceCatalogItem(id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  });

  app.put("/api/service-catalog/:id", isAuthenticated, requireRole(["admin", "manager"]), async (req, res) => {
    const id = parseInt(req.params.id as string);
    const itemData = insertServiceCatalogSchema.partial().parse(req.body);
    const item = await storage.updateServiceCatalogItem(id, itemData);
    res.json(item);
  });

  app.delete("/api/service-catalog/:id", isAuthenticated, requireRole(["admin", "manager"]), async (req, res) => {
    const id = parseInt(req.params.id as string);
    await storage.deleteServiceCatalogItem(id);
    res.sendStatus(204);
  });

  // Estimates
  app.get("/api/estimates", isAuthenticated, async (_req, res) => {
    const estimates = await storage.listEstimates();
    res.json(estimates);
  });

  app.post("/api/estimates", isAuthenticated, async (req, res) => {
    const userId = (req as any).user.claims.sub;
    const estimateData = insertEstimateSchema.parse({ ...req.body, createdBy: userId });
    const estimate = await storage.createEstimate(estimateData);
    await logActivity(req, "estimate", estimate.id, "created");
    res.json(estimate);
  });

  app.get("/api/estimates/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const estimate = await storage.getEstimate(id);
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });
    res.json(estimate);
  });

  app.put("/api/estimates/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const estimateData = insertEstimateSchema.partial().parse(req.body);
    const estimate = await storage.updateEstimate(id, estimateData);
    await logActivity(req, "estimate", estimate.id, "updated", estimateData);
    res.json(estimate);
  });

  app.delete("/api/estimates/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    await storage.deleteEstimate(id);
    res.sendStatus(204);
  });

  // Estimate Line Items
  app.get("/api/estimates/:id/line-items", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const items = await storage.listEstimateLineItems(id);
    res.json(items);
  });

  app.post("/api/estimates/:id/line-items", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const itemData = insertEstimateLineItemSchema.parse({ ...req.body, estimateId: id });
    const item = await storage.createEstimateLineItem(itemData);
    res.json(item);
  });

  app.delete("/api/estimates/:id/line-items/:lineItemId", isAuthenticated, async (req, res) => {
    const lineItemId = parseInt(req.params.lineItemId as string);
    await storage.deleteEstimateLineItem(lineItemId);
    res.sendStatus(204);
  });

  // Proposals
  app.get("/api/proposals", isAuthenticated, async (_req, res) => {
    const proposals = await storage.listProposals();
    res.json(proposals);
  });

  app.post("/api/proposals", isAuthenticated, async (req, res) => {
    const userId = (req as any).user.claims.sub;
    const proposalData = insertProposalSchema.parse({ ...req.body, createdBy: userId });
    const proposal = await storage.createProposal(proposalData);
    await logActivity(req, "proposal", proposal.id, "created");
    res.json(proposal);
  });

  app.get("/api/proposals/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const proposal = await storage.getProposal(id);
    if (!proposal) return res.status(404).json({ message: "Proposal not found" });
    res.json(proposal);
  });

  app.put("/api/proposals/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const proposalData = insertProposalSchema.partial().parse(req.body);
    const proposal = await storage.updateProposal(id, proposalData);
    await logActivity(req, "proposal", proposal.id, "updated", proposalData);
    res.json(proposal);
  });

  app.delete("/api/proposals/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    await storage.deleteProposal(id);
    res.sendStatus(204);
  });

  // Activity Logs
  app.get("/api/activity-logs", isAuthenticated, async (req, res) => {
    const entityType = req.query.entityType as string;
    const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : undefined;
    const logs = await storage.listActivityLogs(entityType, entityId);
    res.json(logs);
  });

  // Pipeline Stages
  app.get("/api/pipeline-stages", isAuthenticated, async (_req, res) => {
    const stages = await storage.listPipelineStages();
    res.json(stages);
  });

  app.post("/api/pipeline-stages", isAuthenticated, requireRole(["admin", "manager"]), async (req, res) => {
    const stages = await storage.listPipelineStages();
    const data = insertPipelineStageSchema.parse({ ...req.body, sortOrder: stages.length });
    const stage = await storage.createPipelineStage(data);
    res.json(stage);
  });

  app.put("/api/pipeline-stages/:id", isAuthenticated, requireRole(["admin", "manager"]), async (req, res) => {
    const id = parseInt(req.params.id as string);
    const data = insertPipelineStageSchema.partial().parse(req.body);
    const stage = await storage.updatePipelineStage(id, data);
    res.json(stage);
  });

  app.delete("/api/pipeline-stages/:id", isAuthenticated, requireRole(["admin", "manager"]), async (req, res) => {
    const id = parseInt(req.params.id as string);
    await storage.deletePipelineStage(id);
    res.sendStatus(204);
  });

  app.post("/api/pipeline-stages/reorder", isAuthenticated, requireRole(["admin", "manager"]), async (req, res) => {
    const { orderedIds } = z.object({ orderedIds: z.array(z.number()) }).parse(req.body);
    const stages = await storage.reorderPipelineStages(orderedIds);
    res.json(stages);
  });

  return httpServer;
}
