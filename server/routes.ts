import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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
  insertContactStageSchema,
  insertPipelineStageSchema,
  insertBdSpendEntrySchema,
  insertTaskLabelDefinitionSchema,
  insertTaskColumnSchema,
  insertEmailMessageSchema,
  insertAttachmentSchema,
  insertPushSubscriptionSchema,
  insertBuildingPortfolioSchema,
  insertPortfolioBuildingSchema,
  insertPortfolioContactSchema,
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { ObjectStorageService } from "./replit_integrations/object_storage/objectStorage";
import webpush from "web-push";
import { sendSpendReceiptEmail } from "./email";

const upload = multer({ storage: multer.memoryStorage() });
const objectStorageService = new ObjectStorageService();

function parseStoragePath(fullPath: string): { bucketName: string; objectName: string } {
  const parts = fullPath.replace(/^\//, "").split("/");
  return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
}

// Helper to get role-scoped userId for list queries based on dynamic permissions
async function getScopedUserId(req: any, module: string): Promise<string | undefined> {
  const userId = req.user?.claims?.sub;
  if (!userId) return undefined;
  const user = await storage.getUser(userId);
  if (!user) return undefined;
  if (user.role === "admin") return undefined;
  const perm = await storage.getRolePermission(user.role, module);
  const level = perm?.accessLevel ?? "own_only";
  if (level === "own_only") return userId;
  return undefined;
}

// Helper to check if user has any access to a module (returns false if 'none')
async function hasModuleAccess(req: any, module: string): Promise<boolean> {
  const userId = req.user?.claims?.sub;
  if (!userId) return false;
  const user = await storage.getUser(userId);
  if (!user) return false;
  if (user.role === "admin") return true;
  const perm = await storage.getRolePermission(user.role, module);
  return (perm?.accessLevel ?? "own_only") !== "none";
}

// Middleware: allow if user is admin OR has 'full' access to a module
function requireModuleFullAccess(module: string) {
  return async (req: any, res: any, next: any) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    if (user.role === "admin") return next();
    const perm = await storage.getRolePermission(user.role, module);
    if (perm?.accessLevel === "full") return next();
    return res.status(403).json({ message: "Forbidden" });
  };
}

// Push notification helper
async function sendPushNotification(userId: string, payload: { title: string; body: string; url?: string }) {
  const subscriptions = await storage.listPushSubscriptions(userId);
  const results = await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(payload)
        );
        return { success: true };
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await storage.deletePushSubscription(sub.endpoint);
        }
        return { success: false, error };
      }
    })
  );
  return results;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Version endpoint — no auth, used for client staleness checks
  // Returns the hashed JS bundle filename so the version changes on every build
  app.get("/api/version", (_req, res) => {
    try {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      const candidates = [
        path.join(currentDir, "public", "assets"),
        path.join(currentDir, "..", "dist", "public", "assets"),
        path.join(process.cwd(), "dist", "public", "assets"),
      ];
      const assetsDir = candidates.find((p) => fs.existsSync(p)) ?? "";
      if (assetsDir) {
        const files = fs.readdirSync(assetsDir);
        const jsBundle = files.find((f) => f.startsWith("index-") && f.endsWith(".js"));
        if (jsBundle) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          return res.json({ version: jsBundle });
        }
      }
    } catch {
      // fall through
    }
    const version = process.env.DEPLOY_VERSION || process.env.npm_package_version || "dev";
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({ version });
  });

  // Run migrations first
  await storage.migrateLeadServiceTypes();
  await storage.migrateContactStages();
  await storage.migrateIndustryOptions();
  await storage.migrateDashboardFilter();
  // Seed default value tier settings
  await storage.getValueTierSettings();
  // Seed default contact stages on startup
  await storage.seedDefaultContactStages();
  // Seed default pipeline stages on startup
  await storage.seedDefaultPipelineStages();
  // Seed default task columns on startup
  await storage.seedDefaultTaskColumns();
  // Seed default role permissions and configs on startup
  await storage.seedDefaultPermissions();
  // Promote initial admin on startup if env var is set
  if (process.env.INITIAL_ADMIN_EMAIL) {
    await storage.seedInitialAdmin(process.env.INITIAL_ADMIN_EMAIL);
  }

  // Push notification setup
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      "mailto:admin@m5crm.replit.app",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }

  // Push subscription routes
  app.get("/api/push/vapid-public-key", isAuthenticated, (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
  });

  app.post("/api/push/subscribe", isAuthenticated, async (req, res) => {
    const userId = (req as any).user.claims.sub;
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: "Invalid subscription" });
    }
    const sub = await storage.createPushSubscription({
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });
    res.json(sub);
  });

  app.delete("/api/push/unsubscribe", isAuthenticated, async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ message: "Endpoint required" });
    await storage.deletePushSubscription(endpoint);
    res.sendStatus(204);
  });

  // Task due today: daily cron-like check
  const checkTasksDueToday = async () => {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));
    
    const allTasks = await storage.listTasks();
    const tasksDueToday = allTasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= startOfDay && d <= endOfDay && t.status !== 'done';
    });

    for (const task of tasksDueToday) {
      if (task.assignedTo) {
        await sendPushNotification(task.assignedTo, {
          title: "Deal Task Due Today",
          body: `Reminder: "${task.title}" is due today.`,
          url: `/tasks`
        });
      }
    }
  };

  // Run on startup and every 24 hours
  checkTasksDueToday();
  setInterval(checkTasksDueToday, 24 * 60 * 60 * 1000);

  // Attachments
  app.post("/api/attachments/upload", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      const { entityType, entityId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId are required" });
      }

      // 1. Get upload URL (this also generates a random object ID)
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      // 2. Upload the file to storage
      // Note: We need to get the actual File object from the bucket to use createWriteStream
      // But objectStorageService doesn't have a direct "uploadBuffer" method.
      // Looking at ObjectStorageService.getObjectEntityFile, it parses /objects/ path.
      
      const parts = objectPath.slice(1).split("/"); // e.g. ["objects", "uploads", "uuid"]
      const entityIdInPath = parts.slice(1).join("/");
      let entityDir = objectStorageService.getPrivateObjectDir();
      if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
      const fullPath = `${entityDir}${entityIdInPath}`;

      const { bucketName, objectName } = parseStoragePath(fullPath);
      const bucket = (await import("./replit_integrations/object_storage/objectStorage")).objectStorageClient.bucket(bucketName);
      const storageFile = bucket.file(objectName);

      await storageFile.save(file.buffer, {
        contentType: file.mimetype,
        resumable: false,
      });

      // 3. Save to DB
      const userId = (req as any).user.claims.sub;
      const attachment = await storage.createAttachment({
        entityType,
        entityId: parseInt(entityId),
        fileName: file.originalname,
        objectKey: objectPath,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedBy: userId,
      });

      res.json(attachment);
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ message: error.message || "Failed to upload attachment" });
    }
  });

  app.get("/api/attachments/:entityType/:entityId", isAuthenticated, async (req, res) => {
    const { entityType, entityId } = req.params;
    const attachments = await storage.getAttachments(entityType, parseInt(entityId));
    res.json(attachments);
  });

  app.delete("/api/attachments/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const attachment = await storage.getAttachment(id);
    if (!attachment) return res.status(404).json({ message: "Attachment not found" });

    // Delete from storage
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(attachment.objectKey);
      await objectFile.delete();
    } catch (err) {
      console.error("Failed to delete from storage:", err);
      // Continue to delete from DB even if storage delete fails
    }

    await storage.deleteAttachment(id);
    res.sendStatus(204);
  });

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
  app.get("/api/dashboard", isAuthenticated, async (req, res) => {
    const r = req as any;
    const currentUserId = r.user?.claims?.sub;
    const filter = String(req.query.filter || "all");
    let filterUserId: string | undefined;
    if (filter === "mine") {
      filterUserId = currentUserId;
    } else if (filter !== "all") {
      filterUserId = filter;
    }
    const stats = await storage.getDashboardStats(filterUserId);
    res.json(stats);
  });

  app.get("/api/leads/activity-summary", isAuthenticated, async (req, res) => {
    const userId = await getScopedUserId(req, "leads");
    const summary = await storage.getLeadsActivitySummary(userId);
    res.json(summary);
  });

  app.get("/api/dashboard/team-performance", isAuthenticated, requireRole(["admin", "manager"]), async (_req, res) => {
    const stats = await storage.getTeamPerformanceStats();
    res.json(stats);
  });

  // Users (Admin only)
  app.get("/api/users", isAuthenticated, requireRole(["admin"]), async (_req, res) => {
    const users = await storage.listUsers();
    res.json(users);
  });

  app.put("/api/users/:id/role", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    const id = req.params.id as string;
    const { role } = z.object({ role: z.string().min(1) }).parse(req.body);
    const configs = await storage.listRoleConfigs();
    if (!configs.find(c => c.roleKey === role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const user = await storage.updateUserRole(id, role);
    res.json(user);
  });

  app.delete("/api/users/:id", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    const id = req.params.id as string;
    await storage.deleteUser(id);
    res.sendStatus(204);
  });

  // Invites
  app.get("/api/invites", isAuthenticated, requireRole(["admin"]), async (_req, res) => {
    const all = await storage.listInvites();
    res.json(all);
  });

  app.post("/api/invites", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    const userId = (req as any).user.claims.sub;
    const { email, role } = z.object({
      email: z.string().email(),
      role: z.string().min(1).default("member"),
    }).parse(req.body);
    const configs = await storage.listRoleConfigs();
    if (!configs.find(c => c.roleKey === role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const invite = await storage.createInvite({ email, role, token, invitedBy: userId, expiresAt });
    res.json(invite);
  });

  app.delete("/api/invites/:id", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    const id = parseInt(req.params.id as string);
    await storage.deleteInvite(id);
    res.sendStatus(204);
  });

  // Public invite token validation (no auth required)
  app.get("/api/invite/:token", async (req, res) => {
    const invite = await storage.getInviteByToken(req.params.token);
    if (!invite) return res.status(404).json({ message: "Invite not found" });
    if (invite.usedAt) return res.status(410).json({ message: "Invite already used" });
    if (new Date() > new Date(invite.expiresAt)) return res.status(410).json({ message: "Invite expired" });
    const configs = await storage.listRoleConfigs();
    const roleCfg = configs.find(c => c.roleKey === invite.role);
    const roleDisplayName = roleCfg?.displayName ?? invite.role;
    res.json({ email: invite.email, role: invite.role, roleDisplayName });
  });

  // Consume invite (authenticated, any role)
  app.post("/api/invite/consume", isAuthenticated, async (req, res) => {
    const userId = (req as any).user.claims.sub;
    const { token } = z.object({ token: z.string() }).parse(req.body);
    const invite = await storage.getInviteByToken(token);
    if (!invite) return res.status(404).json({ message: "Invite not found" });
    if (invite.usedAt) return res.status(410).json({ message: "Invite already used" });
    if (new Date() > new Date(invite.expiresAt)) return res.status(410).json({ message: "Invite expired" });
    await storage.consumeInvite(token, userId);
    await storage.updateUserRole(userId, invite.role);
    const updatedUser = await storage.getUser(userId);
    res.json(updatedUser);
  });

  // Duplicate detection
  app.get("/api/clients/check-duplicate", isAuthenticated, async (req, res) => {
    const name = req.query.name as string;
    if (!name) return res.status(400).json({ message: "Name parameter required" });
    const scopedUserId = await getScopedUserId(req, "customers");
    const clients = await storage.listClients(scopedUserId);
    const existing = clients.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      return res.json({ exists: true, client: { id: existing.id, name: existing.name } });
    }
    res.json({ exists: false });
  });

  app.get("/api/contacts/check-duplicate", isAuthenticated, async (req, res) => {
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ message: "Email parameter required" });
    const contacts = await storage.listAllClientContacts();
    const existing = contacts.find(c => c.email?.toLowerCase() === email.toLowerCase());
    if (existing) {
      const client = await storage.getClient(existing.clientId);
      return res.json({
        exists: true,
        contact: {
          id: existing.id,
          name: existing.name,
          clientId: existing.clientId,
          clientName: client?.name
        }
      });
    }
    res.json({ exists: false });
  });

  // Clients
  app.post("/api/activity-logs", isAuthenticated, async (req, res) => {
    const userId = (req as any).user.claims.sub;
    const logData = insertActivityLogSchema.parse({ ...req.body, userId });
    const log = await storage.createActivityLog(logData);
    res.json(log);
  });

  app.get("/api/clients", isAuthenticated, async (req, res) => {
    const scopedUserId = await getScopedUserId(req, "customers");
    const clients = await storage.listClients(scopedUserId);
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

  app.delete("/api/clients/bulk", isAuthenticated, async (req, res) => {
    const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
    await storage.deleteBulkClients(ids);
    res.sendStatus(204);
  });

  app.patch("/api/clients/bulk", isAuthenticated, async (req, res) => {
    const { ids, data } = z.object({
      ids: z.array(z.number()),
      data: z.record(z.unknown())
    }).parse(req.body);
    await storage.bulkUpdateClients(ids, data as any);
    res.sendStatus(204);
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

  app.delete("/api/contacts/bulk", isAuthenticated, async (req, res) => {
    const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
    await storage.deleteBulkClientContacts(ids);
    res.sendStatus(204);
  });

  app.patch("/api/contacts/bulk", isAuthenticated, async (req, res) => {
    const { ids, data } = z.object({
      ids: z.array(z.number()),
      data: z.record(z.unknown())
    }).parse(req.body);
    await storage.bulkUpdateClientContacts(ids, data as any);
    res.sendStatus(204);
  });

  app.patch("/api/contacts/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const data = insertClientContactSchema.partial().parse(req.body);
    const contact = await storage.updateClientContact(id, data);
    res.json(contact);
  });

  app.delete("/api/clients/:id/contacts/:contactId", isAuthenticated, async (req, res) => {
    const contactId = parseInt(req.params.contactId as string);
    await storage.deleteClientContact(contactId);
    res.sendStatus(204);
  });

  // LinkedIn enrichment via Apollo.io People Match API
  app.post("/api/contacts/:contactId/linkedin-enrich", isAuthenticated, async (req, res) => {
    const apiKey = process.env.APOLLO_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: "APOLLO_API_KEY is not configured." });
    }
    const contactId = parseInt(req.params.contactId as string);
    const contact = await storage.getClientContact(contactId);
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    const linkedinUrl = req.body?.linkedinUrl || contact.linkedinUrl;
    if (!linkedinUrl) return res.status(400).json({ message: "No LinkedIn URL provided." });

    const apolloRes = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        linkedin_url: linkedinUrl,
        reveal_personal_emails: true,
      }),
    });

    if (!apolloRes.ok) {
      const errText = await apolloRes.text();
      return res.status(apolloRes.status).json({ message: `Apollo error: ${errText}` });
    }

    const data: any = await apolloRes.json();
    const person = data?.person;
    if (!person) {
      return res.status(404).json({ message: "No person found for that LinkedIn URL." });
    }

    const updates: Record<string, string | null> = {};
    updates.linkedinUrl = linkedinUrl;
    if (person.photo_url) updates.profilePictureUrl = person.photo_url;
    if (person.title) updates.title = person.title;
    // Always take Apollo's full name if it's more complete (has a last name)
    if (person.name && person.name.trim().includes(" ")) updates.name = person.name.trim();
    else if (!contact.name && person.name) updates.name = person.name.trim();
    if (!contact.email && person.email) updates.email = person.email;

    if (req.body.preview === true) {
      return res.json({
        preview: true,
        updates,
        currentValues: {
          name: contact.name,
          title: contact.title,
          profilePictureUrl: contact.profilePictureUrl,
          email: contact.email,
        },
      });
    }

    let finalUpdates = updates;
    if (Array.isArray(req.body.fieldsToUpdate)) {
      finalUpdates = {};
      for (const field of req.body.fieldsToUpdate) {
        if (field in updates) {
          finalUpdates[field] = updates[field];
        }
      }
    }

    const updated = await storage.updateClientContact(contactId, finalUpdates);
    res.json(updated);
  });

  // Batch employment verification via Apollo.io
  app.post("/api/clients/:id/verify-employment", isAuthenticated, async (req, res) => {
    const apiKey = process.env.APOLLO_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: "APOLLO_API_KEY is not configured." });
    }
    const clientId = parseInt(req.params.id as string);
    const client = await storage.getClient(clientId);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const contacts = await storage.listClientContacts(clientId);
    const results: { contactId: number; name: string; status: string; currentEmployer: string | null }[] = [];

    for (const contact of contacts) {
      if (!contact.linkedinUrl) {
        await storage.updateClientContact(contact.id, { employmentStatus: "unverified" });
        results.push({ contactId: contact.id, name: contact.name, status: "unverified", currentEmployer: null });
        continue;
      }

      try {
        const apolloRes = await fetch("https://api.apollo.io/api/v1/people/match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "X-Api-Key": apiKey,
          },
          body: JSON.stringify({ linkedin_url: contact.linkedinUrl }),
        });

        if (!apolloRes.ok) {
          results.push({ contactId: contact.id, name: contact.name, status: "unverified", currentEmployer: null });
          continue;
        }

        const data: any = await apolloRes.json();
        const person = data?.person;
        if (!person) {
          results.push({ contactId: contact.id, name: contact.name, status: "unverified", currentEmployer: null });
          continue;
        }

        // Determine current employer from organization_name or employment_history
        let currentEmployer: string | null = person.organization_name || null;
        if (!currentEmployer && person.employment_history?.length) {
          const current = person.employment_history.find((e: any) => !e.end_date);
          if (current) currentEmployer = current.organization_name || null;
        }

        // Fuzzy match: check if client name appears in employer or vice versa
        const clientNameLower = client.name.toLowerCase();
        const employerLower = (currentEmployer || "").toLowerCase();
        const isMatch =
          employerLower.includes(clientNameLower) ||
          clientNameLower.includes(employerLower.split(" ")[0]);

        const status = currentEmployer ? (isMatch ? "active" : "likely_left") : "unverified";
        await storage.updateClientContact(contact.id, { employmentStatus: status });
        results.push({ contactId: contact.id, name: contact.name, status, currentEmployer });
      } catch {
        results.push({ contactId: contact.id, name: contact.name, status: "unverified", currentEmployer: null });
      }
    }

    res.json(results);
  });

  // All buildings for all contacts of a client (for portfolio map)
  app.get("/api/clients/:id/all-buildings", isAuthenticated, async (req, res) => {
    const clientId = parseInt(req.params.id as string);
    const [contacts, offices] = await Promise.all([
      storage.listClientContacts(clientId),
      storage.listClientOffices(clientId),
    ]);
    const contactBuildings = await Promise.all(
      contacts.map(async (c) => {
        const buildings = await storage.listContactBuildings(c.id);
        return buildings.map(b => ({ ...b, contactName: c.name, contactId: c.id, type: "building" as const }));
      })
    );
    const officeEntries = offices.map(o => ({
      id: o.id,
      name: o.name,
      address: o.address,
      lat: o.lat,
      lng: o.lng,
      notes: null,
      contactName: "Office",
      contactId: null,
      type: "office" as const,
    }));
    res.json([...officeEntries, ...contactBuildings.flat()]);
  });

  // All contact buildings (for lookups)
  app.get("/api/all-buildings", isAuthenticated, async (_req, res) => {
    const buildings = await storage.listAllContactBuildings();
    res.json(buildings);
  });

  // All offices across all clients (for map and buildings list)
  app.get("/api/all-offices", isAuthenticated, async (_req, res) => {
    const offices = await storage.listAllClientOffices();
    res.json(offices);
  });

  // Contact Buildings
  app.get("/api/contacts/:contactId/buildings", isAuthenticated, async (req, res) => {
    const contactId = parseInt(req.params.contactId as string);
    const buildings = await storage.listContactBuildings(contactId);
    res.json(buildings);
  });

  app.post("/api/contacts/:contactId/buildings", isAuthenticated, async (req, res) => {
    const contactId = parseInt(req.params.contactId as string);
    const body = { ...req.body, contactId };
    if (body.lat != null) body.lat = String(body.lat);
    if (body.lng != null) body.lng = String(body.lng);
    const data = insertContactBuildingSchema.parse(body);
    const building = await storage.createContactBuilding(data);
    res.json(building);
  });

  app.put("/api/contacts/:contactId/buildings/:buildingId", isAuthenticated, async (req, res) => {
    const buildingId = parseInt(req.params.buildingId as string);
    const body = { ...req.body };
    if (body.lat != null) body.lat = String(body.lat);
    if (body.lng != null) body.lng = String(body.lng);
    const updated = await storage.updateContactBuilding(buildingId, body);
    res.json(updated);
  });

  app.delete("/api/contacts/:contactId/buildings/:buildingId", isAuthenticated, async (req, res) => {
    const buildingId = parseInt(req.params.buildingId as string);
    await storage.deleteContactBuilding(buildingId);
    res.sendStatus(204);
  });

  app.get("/api/buildings/:id/activity", isAuthenticated, async (req, res) => {
    const buildingId = parseInt(req.params.id as string);
    const activity = await storage.getBuildingActivity(buildingId);
    res.json(activity);
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
    const body = { ...req.body };
    if (body.lat != null) body.lat = String(body.lat);
    if (body.lng != null) body.lng = String(body.lng);
    const updated = await storage.updateClientOffice(officeId, body);
    res.json(updated);
  });

  app.delete("/api/clients/:id/offices/:officeId", isAuthenticated, async (req, res) => {
    const officeId = parseInt(req.params.officeId as string);
    await storage.deleteClientOffice(officeId);
    res.sendStatus(204);
  });

  // Bulk Import
  app.post("/api/clients/import-preview", isAuthenticated, async (req, res) => {
    const { rows } = req.body as { rows: Record<string, string>[] };
    if (!Array.isArray(rows)) return res.status(400).json({ message: "rows must be an array" });
    const allClients = await storage.listClients();
    const newItems: Record<string, string>[] = [];
    const matches: Array<{ existing: any; incoming: Record<string, string>; diff: Record<string, string> }> = [];

    const fields = ["name", "industry", "address", "phone", "email", "website", "notes", "tier"] as const;

    for (const row of rows) {
      const name = (row.name || row.company_name || "").trim();
      const existing = allClients.find(c => c.name.toLowerCase() === name.toLowerCase());

      if (existing) {
        const diff: Record<string, string> = {};
        fields.forEach(f => {
          const val = row[f === "name" ? (row.name ? "name" : "company_name") : f];
          if (val && val !== String((existing as any)[f] || "")) {
            diff[f] = val;
          }
        });
        matches.push({ existing, incoming: row, diff });
      } else {
        newItems.push(row);
      }
    }
    res.json({ newItems, matches });
  });

  app.post("/api/client-contacts/import-preview", isAuthenticated, async (req, res) => {
    const { rows } = req.body as { rows: Record<string, string>[] };
    if (!Array.isArray(rows)) return res.status(400).json({ message: "rows must be an array" });
    const allContacts = await storage.listAllClientContacts();
    const allClients = await storage.listClients();
    const newItems: Record<string, string>[] = [];
    const matches: Array<{ existing: any; incoming: Record<string, string>; diff: Record<string, string>; companyName: string }> = [];

    const fields = ["name", "title", "email", "phone", "linkedinUrl", "tier"] as const;

    for (const row of rows) {
      const email = (row.email || "").trim();
      const name = (row.name || row.contact_name || "").trim();
      const companyName = (row.company_name || row.company || "").trim();

      let existing = null;
      if (email) {
        existing = allContacts.find(c => c.email?.toLowerCase() === email.toLowerCase());
      }
      if (!existing && name && companyName) {
        const company = allClients.find(cl => cl.name.toLowerCase() === companyName.toLowerCase());
        if (company) {
          existing = allContacts.find(c => c.clientId === company.id && c.name.toLowerCase() === name.toLowerCase());
        }
      }

      if (existing) {
        const diff: Record<string, string> = {};
        fields.forEach(f => {
          const incomingKey = f === "linkedinUrl" ? "linkedin_url" : f;
          const val = row[incomingKey];
          if (val && val !== String((existing as any)[f] || "")) {
            diff[f] = val;
          }
        });
        matches.push({ existing, incoming: row, diff, companyName });
      } else {
        newItems.push(row);
      }
    }
    res.json({ newItems, matches });
  });

  app.post("/api/clients/import", isAuthenticated, async (req, res) => {
    const { rows, updates } = req.body as { rows: Record<string, string>[]; updates?: Array<{ id: number; data: any }> };
    let created = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    if (updates && Array.isArray(updates)) {
      for (const update of updates) {
        try {
          await storage.updateClient(update.id, update.data);
          await logActivity(req, "client", update.id, "updated", update.data);
          updatedCount++;
        } catch (e: any) {
          errors.push(`Update client ${update.id}: ${e.message ?? String(e)}`);
        }
      }
    }

    if (Array.isArray(rows)) {
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
            tier: row.tier || null,
            annualRevenue: row.annual_revenue || null,
            serviceNeeds: row.service_needs ? row.service_needs.split(";").map(s => s.trim()) : [],
            createdBy: (req as any).user?.id ?? null,
          });
          const client = await storage.createClient(data);
          await logActivity(req, "client", client.id, "created");
          created++;
        } catch (e: any) {
          errors.push(`Row ${i + 2}: ${e.message ?? String(e)}`);
        }
      }
    }
    res.json({ created, updated: updatedCount, errors });
  });

  app.post("/api/client-contacts/import", isAuthenticated, async (req, res) => {
    const { rows, updates } = req.body as { rows: Record<string, string>[]; updates?: Array<{ id: number; data: any }> };
    const allClients = await storage.listClients();
    const allOffices = await storage.listAllClientOffices();
    let created = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    if (updates && Array.isArray(updates)) {
      for (const update of updates) {
        try {
          await storage.updateClientContact(update.id, update.data);
          updatedCount++;
        } catch (e: any) {
          errors.push(`Update contact ${update.id}: ${e.message ?? String(e)}`);
        }
      }
    }

    if (Array.isArray(rows)) {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const companyName = (row.company_name || row.company || "").trim();
          const company = allClients.find(c => c.name.toLowerCase() === companyName.toLowerCase());
          if (!company) {
            errors.push(`Row ${i + 2}: Company "${companyName}" not found`);
            continue;
          }

          let officeId: number | null = null;
          if (row.office_name) {
            const office = allOffices.find(o => 
              o.clientId === company.id && 
              o.name.toLowerCase() === row.office_name.toLowerCase()
            );
            if (office) {
              officeId = office.id;
            }
          }

          await storage.createClientContact({
            clientId: company.id,
            name: row.name || row.contact_name || "",
            title: row.title || null,
            email: row.email || null,
            phone: row.phone || null,
            isPrimary: row.is_primary === "true" || row.is_primary === "1" || row.is_primary === "yes",
            reportsTo: null,
            officeId: officeId,
            linkedinUrl: row.linkedin_url || null,
            tier: row.tier || null,
            serviceNeeds: row.service_needs ? row.service_needs.split(";").map(s => s.trim()) : [],
            employmentStatus: row.employment_status || null,
          });
          created++;
        } catch (e: any) {
          errors.push(`Row ${i + 2}: ${e.message ?? String(e)}`);
        }
      }
    }
    res.json({ created, updated: updatedCount, errors });
  });

  // Contact card/signature scanner (AI vision)
  app.post("/api/contacts/scan-image", isAuthenticated, async (req, res) => {
    const { imageBase64, mimeType } = req.body as { imageBase64: string; mimeType: string };
    if (!imageBase64) return res.status(400).json({ message: "imageBase64 is required" });
    try {
      const { openai } = await import("./openai");
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        max_completion_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
                  detail: "high",
                },
              },
              {
                type: "text",
                text: `Extract contact information from this business card or email signature screenshot. Return ONLY a JSON object with these fields (use null for any field not found):
{
  "name": string | null,
  "title": string | null,
  "email": string | null,
  "phone": string | null,
  "company": string | null,
  "linkedinUrl": string | null,
  "notes": string | null
}
Do not include any other text, just the JSON.`,
              },
            ],
          },
        ],
      });
      const raw = completion.choices[0]?.message?.content?.trim() || "{}";
      const cleaned = raw.replace(/^```json\s*|^```\s*|\s*```$/g, "");
      const parsed = JSON.parse(cleaned);
      res.json(parsed);
    } catch (e: any) {
      console.error("scan-image error:", e);
      res.status(500).json({ message: e.message || "Failed to scan image" });
    }
  });

  // Export contact as vCard
  app.get("/api/contacts/:id/vcard", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const contact = await storage.getClientContact(id);
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    const client = await storage.getClient(contact.clientId);
    const safeName = (contact.name || "contact").replace(/[^a-zA-Z0-9_\-]/g, "_");
    const lines: string[] = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${contact.name || ""}`,
    ];
    if (contact.title) lines.push(`TITLE:${contact.title}`);
    if (client?.name) lines.push(`ORG:${client.name}`);
    if (contact.email) lines.push(`EMAIL;TYPE=WORK:${contact.email}`);
    if (contact.phone) lines.push(`TEL;TYPE=WORK:${contact.phone}`);
    if (contact.linkedinUrl) lines.push(`URL:${contact.linkedinUrl}`);
    lines.push("END:VCARD");
    const vcard = lines.join("\r\n");
    res.setHeader("Content-Type", "text/vcard; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.vcf"`);
    res.send(vcard);
  });

  // Leads
  app.get("/api/leads", isAuthenticated, async (req, res) => {
    const scopedUserId = await getScopedUserId(req, "leads");
    const leads = await storage.listLeads(scopedUserId);
    res.json(leads);
  });

  app.post("/api/leads", isAuthenticated, async (req, res) => {
    const leadData = insertLeadSchema.parse(req.body);
    const lead = await storage.createLead(leadData);
    await logActivity(req, "lead", lead.id, "created");
    
    if (lead.assignedTo) {
      await sendPushNotification(lead.assignedTo, {
        title: "New Lead Assigned",
        body: `You have been assigned a new lead: ${lead.title}`,
        url: `/leads`
      });
    }

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
    const oldLead = await storage.getLead(id);
    const leadData = insertLeadSchema.partial().parse(req.body);
    const lead = await storage.updateLead(id, leadData);
    await logActivity(req, "lead", lead.id, "updated", leadData);

    if (lead.assignedTo && lead.assignedTo !== oldLead?.assignedTo) {
      await sendPushNotification(lead.assignedTo, {
        title: "Lead Assigned to You",
        body: `You have been assigned a lead: ${lead.title}`,
        url: `/leads`
      });
    }

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

  // Lead Notes
  app.get("/api/leads/:id/notes", isAuthenticated, async (req, res) => {
    try {
      const leadId = parseInt(req.params.id as string);
      const notes = await storage.listLeadNotes(leadId);
      res.json(notes);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/leads/:id/notes", isAuthenticated, async (req, res) => {
    try {
      const leadId = parseInt(req.params.id as string);
      const userId = (req as any).user?.claims?.sub;
      const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
      const note = await storage.createLeadNote({ leadId, userId, content });
      res.json(note);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/leads/:leadId/notes/:noteId", isAuthenticated, async (req, res) => {
    try {
      const noteId = parseInt(req.params.noteId as string);
      await storage.deleteLeadNote(noteId);
      res.sendStatus(204);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // AI Summary for a lead
  app.post("/api/leads/:id/ai-summary", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const lead = await storage.getLead(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const [leadTasks, activityLogs, company, contact] = await Promise.all([
      storage.listTasks().then(t => t.filter(t => t.relatedLeadId === id).slice(0, 15)),
      storage.listActivityLogs("lead", id).then(a => a.slice(0, 15)),
      lead.clientId ? storage.getClient(lead.clientId) : Promise.resolve(undefined),
      lead.contactId ? storage.getClientContact(lead.contactId) : Promise.resolve(undefined),
    ]);

    // Derived signals
    const now = Date.now();
    const dealAgeDays = Math.floor((now - new Date(lead.createdAt).getTime()) / 86400000);
    const lastActivity = activityLogs[0];
    const daysSinceActivity = lastActivity
      ? Math.floor((now - new Date(lastActivity.createdAt).getTime()) / 86400000)
      : null;
    const daysUntilRenewal = lead.renewalDate
      ? Math.floor((new Date(lead.renewalDate).getTime() - now) / 86400000)
      : null;

    // Human-readable activity formatting
    function formatActivity(a: { action: string; createdAt: Date | string; metadata?: any }): string {
      const date = new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const meta = a.metadata;
      if (!meta) return `${a.action} (${date})`;
      if (meta.toStage) return `Stage moved to "${meta.toStage.replace(/_/g, " ")}" (${date})`;
      if (meta.note) return `Note added: "${String(meta.note).slice(0, 80)}" (${date})`;
      if (meta.field) return `Field "${meta.field}" updated (${date})`;
      return `${a.action} (${date})`;
    }

    const openTaskCount = leadTasks.filter(t => t.status !== "done" && t.status !== "completed").length;
    const overdueTaskCount = leadTasks.filter(t => {
      if (!t.dueDate || t.status === "done" || t.status === "completed") return false;
      return new Date(t.dueDate).getTime() < now;
    }).length;

    const tasksSummary = leadTasks.length
      ? leadTasks.slice(0, 5).map(t => {
          const due = t.dueDate ? `, due ${new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "";
          const overdue = t.dueDate && new Date(t.dueDate).getTime() < now && t.status !== "done" ? " [OVERDUE]" : "";
          return `- "${t.title}" (${t.status}, ${t.priority} priority${due}${overdue})`;
        }).join("\n")
      : "No tasks linked.";

    const activitySummary = activityLogs.length
      ? activityLogs.slice(0, 8).map(a => `- ${formatActivity(a)}`).join("\n")
      : "No recent activity logged.";

    const stageGuide = `Stage reference (M5 pipeline):
- new_lead: Just entered, not yet qualified
- qualified: Needs confirmed, initial contact made
- proposal: Actively scoping or writing SOW/budget
- negotiation: Pricing or contract terms being discussed
- won: Deal closed, work awarded
- lost: Deal dead or awarded to competitor`;

    const serviceLabel = (lead.serviceTypes && lead.serviceTypes.length > 0
      ? lead.serviceTypes
      : lead.serviceType ? [lead.serviceType] : []
    ).map(s => s.replace(/_/g, " ")).join(", ") || "Not specified";

    const prompt = `You are a senior BD analyst at M5 Services, a commercial facility maintenance company (janitorial, building engineering, facility solutions, special projects). Analyze this deal and respond with a JSON object only.

${stageGuide}

DEAL DATA:
- Title: "${lead.title}"
- Company: ${company?.name ?? "Unknown"}${contact ? ` | Contact: ${contact.name}${contact.title ? ` (${contact.title})` : ""}` : ""}
- Stage: ${lead.stage.replace(/_/g, " ")} | Confidence: ${lead.confidenceScore ?? "N/A"}%
- Value: $${Number(lead.value).toLocaleString()} (${lead.contractType?.replace(/_/g, " ") ?? "one-time"}${lead.recurringFrequency ? ", " + lead.recurringFrequency : ""})
- Service: ${serviceLabel}
- Deal age: ${dealAgeDays} day${dealAgeDays !== 1 ? "s" : ""}${daysSinceActivity !== null ? ` | Last activity: ${daysSinceActivity} day${daysSinceActivity !== 1 ? "s" : ""} ago` : " | No activity logged"}${daysUntilRenewal !== null ? ` | Renewal in ${daysUntilRenewal} days` : ""}
- Tags: ${lead.tags?.join(", ") || "None"}
- Open tasks: ${openTaskCount}${overdueTaskCount > 0 ? ` (${overdueTaskCount} OVERDUE)` : ""}
- Notes: ${lead.notes?.trim() || "None"}

Recent Activity (newest first):
${activitySummary}

Open/Active Tasks:
${tasksSummary}

Respond ONLY with a JSON object in this exact shape — no markdown, no explanation:
{
  "healthLabel": "Strong" | "On Track" | "Stalled" | "At Risk",
  "headline": "One tight sentence summarizing deal health and context — not a restatement of fields.",
  "observation": "The most notable signal, risk, or opportunity that isn't obvious from just reading the data. Be specific.",
  "nextStep": "A short, specific question or action phrased as pre-meeting preparation. e.g. 'Ask about the procurement approval process and who else is involved in the decision.' Should be something the BD rep can say or ask in their next conversation."
}

Rules:
- healthLabel must be exactly one of: Strong, On Track, Stalled, At Risk
- Strong = high confidence, active engagement, clear path forward
- On Track = progressing normally, no red flags
- Stalled = low recent activity, stuck in stage too long, or low confidence for stage
- At Risk = overdue tasks, very long inactivity, confidence/stage mismatch, or other warning signs
- nextStep should sound like meeting prep advice — something practical a BD rep would think before walking into a conversation
- Use company names, dollar amounts, and stage names in your text where helpful
- Do NOT just restate the data fields — interpret and synthesize`;

    try {
      const { openai } = await import("./openai");
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 350,
        response_format: { type: "json_object" },
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      const result = {
        healthLabel: (["Strong", "On Track", "Stalled", "At Risk"].includes(parsed.healthLabel) ? parsed.healthLabel : "On Track") as string,
        headline: parsed.headline ?? "No summary available.",
        observation: parsed.observation ?? "",
        nextStep: parsed.nextStep ?? "",
      };
      res.json(result);
    } catch (err: any) {
      console.error("AI summary error:", err);
      res.status(500).json({ message: "AI summary failed", error: err.message });
    }
  });

  // Pipeline Views
  app.get("/api/pipeline-views", isAuthenticated, async (_req, res) => {
    const views = await storage.listPipelineViews();
    res.json(views);
  });

  app.post("/api/pipeline-views", isAuthenticated, async (req, res) => {
    const userId = (req as any).user.claims.sub;
    const data = { ...req.body, createdBy: userId };
    const view = await storage.createPipelineView(data);
    res.json(view);
  });

  app.put("/api/pipeline-views/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const view = await storage.updatePipelineView(id, req.body);
    res.json(view);
  });

  app.delete("/api/pipeline-views/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    await storage.deletePipelineView(id);
    res.sendStatus(204);
  });

  // Tasks
  app.get("/api/tasks", isAuthenticated, async (req, res) => {
    const scopedUserId = await getScopedUserId(req, "tasks");
    const tasks = await storage.listTasks(scopedUserId);
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

  app.patch("/api/tasks/:id/move", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const { status, sortOrder } = z.object({
      status: z.string(),
      sortOrder: z.number(),
    }).parse(req.body);
    const task = await storage.updateTask(id, { status, sortOrder });
    res.json(task);
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    await storage.deleteTask(id);
    res.sendStatus(204);
  });

  // Task Label Definitions
  app.get("/api/task-labels", isAuthenticated, async (_req, res) => {
    const labels = await storage.listTaskLabelDefinitions();
    res.json(labels);
  });

  app.post("/api/task-labels", isAuthenticated, async (req, res) => {
    const data = insertTaskLabelDefinitionSchema.parse(req.body);
    const label = await storage.createTaskLabelDefinition(data);
    res.json(label);
  });

  app.put("/api/task-labels/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const data = insertTaskLabelDefinitionSchema.partial().parse(req.body);
    const label = await storage.updateTaskLabelDefinition(id, data);
    res.json(label);
  });

  app.delete("/api/task-labels/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    await storage.deleteTaskLabelDefinition(id);
    res.sendStatus(204);
  });

  // Task Columns
  app.get("/api/task-columns", isAuthenticated, async (_req, res) => {
    const cols = await storage.listTaskColumns();
    res.json(cols);
  });

  app.post("/api/task-columns", isAuthenticated, async (req, res) => {
    const data = insertTaskColumnSchema.parse(req.body);
    const col = await storage.createTaskColumn(data);
    res.json(col);
  });

  app.put("/api/task-columns/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const data = insertTaskColumnSchema.partial().parse(req.body);
    const col = await storage.updateTaskColumn(id, data);
    res.json(col);
  });

  app.delete("/api/task-columns/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const col = await storage.listTaskColumns();
    const target = col.find((c) => c.id === id);
    if (target?.isDefault) {
      return res.status(400).json({ message: "Cannot delete a default column." });
    }
    await storage.deleteTaskColumn(id);
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

  // Announcements
  app.get("/api/announcements", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const items = await storage.listAnnouncements(userId);
      const reads = await (async () => {
        const { db } = await import("./db");
        const { announcementReads } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        return db.select().from(announcementReads).where(eq(announcementReads.userId, userId));
      })();
      const readIds = new Set(reads.map((r: any) => r.announcementId));
      const withRead = items.map((a) => ({ ...a, isRead: readIds.has(a.id) }));
      res.json(withRead);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/announcements/unread-count", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const count = await storage.getUnreadAnnouncementCount(userId);
      res.json({ count });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/announcements", isAuthenticated, requireModuleFullAccess("announcements"), async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { insertAnnouncementSchema } = await import("@shared/schema");
      const data = insertAnnouncementSchema.parse({ ...req.body, createdBy: userId });
      const announcement = await storage.createAnnouncement(data);

      const targetIds: string[] = data.targetUserIds?.length
        ? data.targetUserIds
        : (await storage.listUsers()).map((u: any) => u.id).filter((id: string) => id !== userId);

      if (data.type === "task" && data.title) {
        const { insertTaskSchema } = await import("@shared/schema");
        for (const targetUserId of targetIds) {
          const taskData = insertTaskSchema.parse({
            title: data.title,
            description: data.message || null,
            assignedTo: targetUserId,
            priority: data.priority === "urgent" ? "high" : "medium",
            status: "todo",
          });
          await storage.createTask(taskData);
        }
      } else if (data.type === "reminder" && data.title) {
        const { insertReminderSchema } = await import("@shared/schema");
        for (const targetUserId of targetIds) {
          const reminderData = insertReminderSchema.parse({
            userId: targetUserId,
            title: data.title,
            message: data.message || null,
            dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          });
          await storage.createReminder(reminderData);
        }
      }

      res.json(announcement);

      // Send push notifications to target users
      for (const targetUserId of targetIds) {
        await sendPushNotification(targetUserId, {
          title: data.type === "announcement" ? "New Announcement" : `New ${data.type}`,
          body: data.title || "You have a new update",
          url: data.type === "announcement" ? "/announcements" : (data.type === "task" ? "/tasks" : "/dashboard")
        });
      }
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/announcements/:id/read", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const announcementId = parseInt(req.params.id);
      await storage.markAnnouncementRead(announcementId, userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/announcements/read-all", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      await storage.markAllAnnouncementsRead(userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Service Catalog
  app.get("/api/service-catalog", isAuthenticated, async (_req, res) => {
    const items = await storage.listServiceCatalog();
    res.json(items);
  });

  app.post("/api/service-catalog", isAuthenticated, requireModuleFullAccess("service_catalog"), async (req, res) => {
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

  app.put("/api/service-catalog/:id", isAuthenticated, requireModuleFullAccess("service_catalog"), async (req, res) => {
    const id = parseInt(req.params.id as string);
    const itemData = insertServiceCatalogSchema.partial().parse(req.body);
    const item = await storage.updateServiceCatalogItem(id, itemData);
    res.json(item);
  });

  app.delete("/api/service-catalog/:id", isAuthenticated, requireModuleFullAccess("service_catalog"), async (req, res) => {
    const id = parseInt(req.params.id as string);
    await storage.deleteServiceCatalogItem(id);
    res.sendStatus(204);
  });

  // Estimates
  app.get("/api/estimates", isAuthenticated, async (req, res) => {
    const scopedUserId = await getScopedUserId(req, "estimates");
    const estimates = await storage.listEstimates(scopedUserId);
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

  // Contact Stages
  app.get("/api/contact-stages", isAuthenticated, async (_req, res) => {
    const stages = await storage.listContactStages();
    res.json(stages);
  });

  app.post("/api/contact-stages", isAuthenticated, async (req, res) => {
    const stages = await storage.listContactStages();
    const data = insertContactStageSchema.parse({ ...req.body, sortOrder: stages.length });
    const stage = await storage.createContactStage(data);
    res.json(stage);
  });

  app.put("/api/contact-stages/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const data = insertContactStageSchema.partial().parse(req.body);
    const stage = await storage.updateContactStage(id, data);
    res.json(stage);
  });

  app.delete("/api/contact-stages/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    await storage.deleteContactStage(id);
    res.sendStatus(204);
  });

  app.post("/api/contact-stages/reorder", isAuthenticated, async (req, res) => {
    const { orderedIds } = z.object({ orderedIds: z.array(z.number()) }).parse(req.body);
    const stages = await storage.reorderContactStages(orderedIds);
    res.json(stages);
  });

  app.get("/api/pipeline-stages", isAuthenticated, async (_req, res) => {
    const stages = await storage.listPipelineStages();
    res.json(stages);
  });

  app.post("/api/pipeline-stages", isAuthenticated, requireModuleFullAccess("leads"), async (req, res) => {
    const stages = await storage.listPipelineStages();
    const data = insertPipelineStageSchema.parse({ ...req.body, sortOrder: stages.length });
    const stage = await storage.createPipelineStage(data);
    res.json(stage);
  });

  app.put("/api/pipeline-stages/:id", isAuthenticated, requireModuleFullAccess("leads"), async (req, res) => {
    const id = parseInt(req.params.id as string);
    const data = insertPipelineStageSchema.partial().parse(req.body);
    const stage = await storage.updatePipelineStage(id, data);
    res.json(stage);
  });

  app.delete("/api/pipeline-stages/:id", isAuthenticated, requireModuleFullAccess("leads"), async (req, res) => {
    const id = parseInt(req.params.id as string);
    await storage.deletePipelineStage(id);
    res.sendStatus(204);
  });

  app.post("/api/pipeline-stages/reorder", isAuthenticated, requireModuleFullAccess("leads"), async (req, res) => {
    const { orderedIds } = z.object({ orderedIds: z.array(z.number()) }).parse(req.body);
    const stages = await storage.reorderPipelineStages(orderedIds);
    res.json(stages);
  });

  // BD Spend — aggregate totals (must be before :id routes to avoid param conflict)
  app.get("/api/spend/client-totals", isAuthenticated, async (_req, res) => {
    const totals = await storage.getAllClientSpendTotals();
    res.json(totals);
  });

  app.get("/api/spend/contact-totals", isAuthenticated, async (_req, res) => {
    const totals = await storage.getAllContactSpendTotals();
    res.json(totals);
  });

  // BD Spend — per-client entries
  app.get("/api/clients/:id/spend", isAuthenticated, async (req, res) => {
    const clientId = parseInt(req.params.id);
    const entries = await storage.getSpendByClient(clientId);
    res.json(entries);
  });

  app.post("/api/clients/:id/spend", isAuthenticated, async (req, res) => {
    const clientId = parseInt(req.params.id);
    const userId = (req as any).user.claims.sub;
    const parsed = insertBdSpendEntrySchema.parse({ ...req.body, clientId, createdBy: userId });
    const entry = await storage.createSpendEntry(parsed);
    (async () => {
      try {
        const receiptEmail = await storage.getAppSetting("receiptEmail");
        if (receiptEmail) {
          const [user, client] = await Promise.all([
            storage.getUser(userId),
            storage.getClient(clientId),
          ]);
          await sendSpendReceiptEmail(receiptEmail, {
            amount: entry.amount,
            category: entry.category,
            date: entry.date,
            description: entry.description,
            loggedByName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.email ?? "Unknown"),
            clientName: client?.name ?? null,
            receiptUrl: entry.receiptUrl ?? null,
          });
        }
      } catch (err) {
        console.error("[email] Failed to send spend receipt:", err);
      }
    })();
    res.status(201).json(entry);
  });

  app.post("/api/spend/upload-receipt", isAuthenticated, upload.single("receipt"), async (req, res) => {
    const r = req as any;
    if (!r.file) return res.status(400).json({ message: "No file uploaded" });
    try {
      const mimeType = r.file.mimetype;
      const ext = mimeType === "application/pdf" ? "pdf" : (mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg");
      const entityDir = objectStorageService.getPrivateObjectDir();
      const timestamp = Date.now();
      const fullPath = `${entityDir}/receipts/${timestamp}.${ext}`;
      const { bucketName, objectName } = parseStoragePath(fullPath);
      const bucket = (await import("./replit_integrations/object_storage/objectStorage")).objectStorageClient.bucket(bucketName);
      const gcsFile = bucket.file(objectName);
      await gcsFile.save(r.file.buffer, { contentType: mimeType });
      try { await gcsFile.makePublic(); } catch (_) {}
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
      res.json({ url: publicUrl });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/spend", isAuthenticated, async (req, res) => {
    const userId = (req as any).user.claims.sub;
    const parsed = insertBdSpendEntrySchema.parse({ ...req.body, createdBy: userId });
    const entry = await storage.createSpendEntry(parsed);
    (async () => {
      try {
        const receiptEmail = await storage.getAppSetting("receiptEmail");
        if (receiptEmail) {
          const user = await storage.getUser(userId);
          let clientName: string | null = null;
          if (entry.clientId) {
            const client = await storage.getClient(entry.clientId);
            clientName = client?.name ?? null;
          }
          await sendSpendReceiptEmail(receiptEmail, {
            amount: entry.amount,
            category: entry.category,
            date: entry.date,
            description: entry.description,
            loggedByName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.email ?? "Unknown"),
            clientName,
            receiptUrl: entry.receiptUrl ?? null,
          });
        }
      } catch (err) {
        console.error("[email] Failed to send spend receipt:", err);
      }
    })();
    res.status(201).json(entry);
  });

  app.delete("/api/spend/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteSpendEntry(id);
    res.sendStatus(204);
  });

  // ── App Settings ─────────────────────────────────────────────────────────────

  app.get("/api/settings/:key", isAuthenticated, async (req, res) => {
    const key = req.params.key as string;
    const value = await storage.getAppSetting(key);
    res.json({ key, value });
  });

  app.put("/api/settings/:key", isAuthenticated, requireRole("admin", "manager"), async (req, res) => {
    const key = req.params.key as string;
    const { value } = z.object({ value: z.string() }).parse(req.body);
    await storage.setAppSetting(key, value);
    res.json({ key, value });
  });

  // ── Meetings ─────────────────────────────────────────────────────────────────

  app.get("/api/meetings", isAuthenticated, async (req, res) => {
    const userId = (req as any).user.claims.sub;
    const meetingList = await storage.listMeetings(userId);
    // Attach action counts
    const withCounts = await Promise.all(
      meetingList.map(async (m) => {
        const actions = await storage.listMeetingActions(m.id);
        return { ...m, actionCount: actions.length, pendingCount: actions.filter((a) => a.status === "pending").length };
      })
    );
    res.json(withCounts);
  });

  app.post("/api/meetings", isAuthenticated, async (req, res) => {
    const userId = (req as any).user.claims.sub;
    const { title, clientId, leadId } = z.object({
      title: z.string().min(1),
      clientId: z.number().int().optional(),
      leadId: z.number().int().optional(),
    }).parse(req.body);
    const meeting = await storage.createMeeting({ title, createdBy: userId, status: "recording", clientId: clientId ?? null, leadId: leadId ?? null });
    res.json(meeting);
  });

  app.get("/api/meetings/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const meeting = await storage.getMeeting(id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    const actions = await storage.listMeetingActions(id);
    res.json({ ...meeting, actions });
  });

  app.put("/api/meetings/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const data = z.object({
      title: z.string().optional(),
      status: z.string().optional(),
      rawTranscript: z.string().optional(),
      summary: z.string().optional(),
    }).parse(req.body);
    const meeting = await storage.updateMeeting(id, data);
    res.json(meeting);
  });

  app.delete("/api/meetings/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    await storage.deleteMeeting(id);
    res.sendStatus(204);
  });

  // Transcribe an audio chunk using Whisper
  app.post("/api/meetings/:id/transcribe", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const meeting = await storage.getMeeting(id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    try {
      const { openai } = await import("./openai");
      const { default: formidable } = await import("formidable");
      const { createReadStream } = await import("fs");

      const form = formidable({ maxFileSize: 25 * 1024 * 1024 });
      const [, files] = await form.parse(req);
      const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;

      if (!audioFile) return res.status(400).json({ message: "No audio file provided" });

      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(audioFile.filepath) as any,
        model: "whisper-1",
      });

      const newText = transcription.text;
      const updatedTranscript = (meeting.rawTranscript || "") + (meeting.rawTranscript ? " " : "") + newText;
      await storage.updateMeeting(id, { rawTranscript: updatedTranscript });

      res.json({ text: newText, fullTranscript: updatedTranscript });
    } catch (err: any) {
      console.error("Transcription error:", err);
      res.status(500).json({ message: err.message || "Transcription failed" });
    }
  });

  // Analyze full transcript with GPT-4o and create action suggestions
  app.post("/api/meetings/:id/analyze", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const meeting = await storage.getMeeting(id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    if (!meeting.rawTranscript) return res.status(400).json({ message: "No transcript to analyze" });

    await storage.updateMeeting(id, { status: "processing" });

    try {
      const { openai } = await import("./openai");

      const systemPrompt = `You are an AI assistant for M5 Services, a facility maintenance company.
Analyze the following meeting transcript and extract actionable items to create or update in their CRM.

Return a JSON object with two keys:
- "summary": A concise 2-4 sentence summary of the meeting.
- "actions": An array of action objects. Each object must have:
  - "type": one of "create_task", "update_lead", "update_client", "create_contact", "note"
  - "description": A clear, human-readable description of what will happen (1 sentence).
  - "payload": An object with relevant fields:
    
    For create_task: { "title": string, "description": string (optional), "priority": "low"|"medium"|"high" (optional), "dueDate": "YYYY-MM-DD" (optional), "assignedTo": null }
    For update_lead: { "leadTitle": string (fuzzy match name), "stage": string (optional), "assignedTo": null (optional), "notes": string (optional), "value": number (optional) }
    For update_client: { "clientName": string (fuzzy match name), "phone": string (optional), "email": string (optional), "address": string (optional), "notes": string (optional) }
    For create_contact: { "name": string, "clientName": string (fuzzy match for parent company), "title": string (optional), "email": string (optional), "phone": string (optional) }
    For note: { "text": string }

Only include items that are clearly mentioned or implied in the transcript. Do not invent items.
Return only valid JSON, no markdown.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Meeting transcript:\n\n${meeting.rawTranscript}` },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2000,
      });

      const raw = completion.choices[0].message.content || "{}";
      const parsed = JSON.parse(raw);
      const summary: string = parsed.summary || "";
      const actionItems: any[] = Array.isArray(parsed.actions) ? parsed.actions : [];

      // Save actions
      for (const item of actionItems) {
        await storage.createMeetingAction({
          meetingId: id,
          type: item.type,
          description: item.description,
          payload: item.payload || {},
          status: "pending",
        });
      }

      await storage.updateMeeting(id, { status: "review", summary });

      const actions = await storage.listMeetingActions(id);
      res.json({ summary, actions });
    } catch (err: any) {
      console.error("Analysis error:", err);
      await storage.updateMeeting(id, { status: "recording" });
      res.status(500).json({ message: err.message || "Analysis failed" });
    }
  });

  // Approve a meeting action — execute it against the CRM
  app.patch("/api/meeting-actions/:id/approve", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const [action] = await storage.listMeetingActions(0).then(() => []).catch(() => []);

    // Fetch the action directly
    const actions = await storage.listMeetingActions(
      (await storage.getMeeting(0).catch(() => undefined))?.id ?? -1
    );
    // We need to find the action by ID — do a direct query
    const { ilike, eq } = await import("drizzle-orm");
    const { db } = await import("./db");
    const { meetingActions: maTable, tasks: tasksTable, clients: clientsTable, clientContacts: contactsTable, leads: leadsTable } = await import("@shared/schema");

    const [targetAction] = await db.select().from(maTable).where(eq(maTable.id, id));
    if (!targetAction) return res.status(404).json({ message: "Action not found" });
    if (targetAction.status !== "pending") return res.status(400).json({ message: "Action already processed" });

    const payload = targetAction.payload as Record<string, any>;

    try {
      switch (targetAction.type) {
        case "create_task": {
          await db.insert(tasksTable).values({
            title: payload.title,
            description: payload.description || null,
            priority: payload.priority || "medium",
            status: "todo",
            dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
            sortOrder: 0,
            checklist: [],
            labels: [],
          });
          break;
        }
        case "update_lead": {
          if (payload.leadTitle) {
            const [lead] = await db.select().from(leadsTable).where(ilike(leadsTable.title, `%${payload.leadTitle}%`));
            if (lead) {
              const updateData: Record<string, any> = {};
              if (payload.stage) updateData.stage = payload.stage;
              if (payload.notes) updateData.notes = payload.notes;
              if (payload.value) updateData.value = String(payload.value);
              if (Object.keys(updateData).length > 0) {
                await db.update(leadsTable).set(updateData).where(eq(leadsTable.id, lead.id));
              }
            }
          }
          break;
        }
        case "update_client": {
          if (payload.clientName) {
            const [client] = await db.select().from(clientsTable).where(ilike(clientsTable.name, `%${payload.clientName}%`));
            if (client) {
              const updateData: Record<string, any> = {};
              if (payload.phone) updateData.phone = payload.phone;
              if (payload.email) updateData.email = payload.email;
              if (payload.address) updateData.address = payload.address;
              if (payload.notes) updateData.notes = payload.notes;
              if (Object.keys(updateData).length > 0) {
                await db.update(clientsTable).set(updateData).where(eq(clientsTable.id, client.id));
              }
            }
          }
          break;
        }
        case "create_contact": {
          let clientId: number | undefined;
          if (payload.clientName) {
            const [client] = await db.select().from(clientsTable).where(ilike(clientsTable.name, `%${payload.clientName}%`));
            clientId = client?.id;
          }
          if (clientId) {
            await db.insert(contactsTable).values({
              name: payload.name,
              clientId,
              title: payload.title || null,
              email: payload.email || null,
              phone: payload.phone || null,
              isPrimary: false,
            });
          }
          break;
        }
        case "note":
        default:
          break;
      }

      const updated = await storage.updateMeetingAction(id, { status: "approved", appliedAt: new Date() });
      res.json(updated);
    } catch (err: any) {
      console.error("Apply action error:", err);
      res.status(500).json({ message: err.message || "Failed to apply action" });
    }
  });

  // Decline a meeting action
  app.patch("/api/meeting-actions/:id/decline", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const updated = await storage.updateMeetingAction(id, { status: "declined" });
    res.json(updated);
  });

  // Role Configs (admin only)
  app.get("/api/role-configs", isAuthenticated, requireRole(["admin"]), async (_req, res) => {
    const configs = await storage.listRoleConfigs();
    res.json(configs);
  });

  app.post("/api/role-configs", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    const { displayName } = z.object({ displayName: z.string().min(1).max(50) }).parse(req.body);
    const roleKey = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const configs = await storage.listRoleConfigs();
    if (configs.find(c => c.roleKey === roleKey)) {
      return res.status(400).json({ message: "A role with that name already exists" });
    }
    const config = await storage.createRoleConfig(roleKey, displayName);
    const MODULES = ["dashboard", "leads", "customers", "tasks", "meetings", "estimates", "service_catalog", "proposals", "email_sync", "announcements"];
    for (const module of MODULES) {
      await storage.upsertRolePermission(roleKey, module, "own_only");
    }
    res.json(config);
  });

  app.patch("/api/role-configs/:roleKey", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    const roleKey = req.params.roleKey as string;
    if (roleKey === "admin") return res.status(400).json({ message: "Cannot rename the admin role" });
    const { displayName } = z.object({ displayName: z.string().min(1).max(50) }).parse(req.body);
    const config = await storage.updateRoleConfig(roleKey, displayName);
    res.json(config);
  });

  app.delete("/api/role-configs/:roleKey", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    const roleKey = req.params.roleKey as string;
    if (roleKey === "admin") return res.status(400).json({ message: "Cannot delete the admin role" });
    await storage.deleteRoleConfig(roleKey);
    res.sendStatus(204);
  });

  // Role Permissions (admin only)
  app.get("/api/permissions", isAuthenticated, requireRole(["admin"]), async (_req, res) => {
    const perms = await storage.listRolePermissions();
    res.json(perms);
  });

  app.patch("/api/permissions", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    const { roleKey, module, accessLevel } = z.object({
      roleKey: z.string().min(1),
      module: z.string(),
      accessLevel: z.enum(["full", "view_all", "own_only", "none"]),
    }).parse(req.body);
    if (roleKey === "admin") return res.status(400).json({ message: "Cannot modify admin permissions" });
    const configs = await storage.listRoleConfigs();
    if (!configs.find(c => c.roleKey === roleKey)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const perm = await storage.upsertRolePermission(roleKey, module, accessLevel);
    res.json(perm);
  });

  // Gmail OAuth routes
  app.get("/api/auth/gmail/connect", isAuthenticated, async (req, res) => {
    try {
      const { getGmailAuthUrl, buildRedirectUri } = await import("./gmail");
      const userId = (req as any).user?.claims?.sub;
      const host = req.get("host") ?? req.hostname;
      const redirectUri = buildRedirectUri(host);
      const url = getGmailAuthUrl(redirectUri, userId);
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/auth/gmail/callback", async (req, res) => {
    const { code, state: userId, error } = req.query as Record<string, string>;
    if (error || !code || !userId) {
      return res.redirect("/settings?gmail=error");
    }
    try {
      const { exchangeCodeForTokens, buildRedirectUri } = await import("./gmail");
      const host = req.get("host") ?? req.hostname;
      const redirectUri = buildRedirectUri(host);
      const tokens = await exchangeCodeForTokens(code, redirectUri);
      await storage.updateGmailTokens(userId, {
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token,
        gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        gmailEmail: tokens.email,
        gmailConnected: true,
      });
      res.redirect("/settings?gmail=connected");
    } catch (err: any) {
      console.error("Gmail OAuth callback error:", err);
      res.redirect("/settings?gmail=error");
    }
  });

  app.delete("/api/auth/gmail/disconnect", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      await storage.updateGmailTokens(userId, {
        gmailAccessToken: "",
        gmailRefreshToken: null,
        gmailTokenExpiry: null,
        gmailEmail: null,
        gmailConnected: false,
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/auth/gmail/status", isAuthenticated, async (req, res) => {
    const userId = (req as any).user?.claims?.sub;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ connected: user.gmailConnected, gmailEmail: user.gmailEmail ?? null });
  });

  // Google Calendar OAuth routes
  app.get("/api/auth/calendar/connect", isAuthenticated, async (req, res) => {
    try {
      const { getCalendarAuthUrl, buildCalendarRedirectUri } = await import("./calendar");
      const userId = (req as any).user?.claims?.sub;
      const host = req.get("host") ?? req.hostname;
      const redirectUri = buildCalendarRedirectUri(host);
      const url = getCalendarAuthUrl(redirectUri, userId);
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/auth/calendar/callback", async (req, res) => {
    const { code, state: userId, error } = req.query as Record<string, string>;
    if (error || !code || !userId) {
      return res.redirect("/settings?calendar=error");
    }
    try {
      const { exchangeCalendarCode, buildCalendarRedirectUri } = await import("./calendar");
      const host = req.get("host") ?? req.hostname;
      const redirectUri = buildCalendarRedirectUri(host);
      const tokens = await exchangeCalendarCode(code, redirectUri);
      await storage.updateCalendarTokens(userId, {
        calendarAccessToken: tokens.access_token,
        calendarRefreshToken: tokens.refresh_token,
        calendarTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        calendarEmail: tokens.email,
        calendarConnected: true,
      });
      res.redirect("/settings?calendar=connected");
    } catch (err: any) {
      console.error("Calendar OAuth callback error:", err);
      res.redirect("/settings?calendar=error");
    }
  });

  app.delete("/api/auth/calendar/disconnect", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      await storage.updateCalendarTokens(userId, {
        calendarAccessToken: "",
        calendarRefreshToken: null,
        calendarTokenExpiry: null,
        calendarEmail: null,
        calendarConnected: false,
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/auth/calendar/status", isAuthenticated, async (req, res) => {
    const userId = (req as any).user?.claims?.sub;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ connected: user.calendarConnected, calendarEmail: user.calendarEmail ?? null });
  });

  // Google Calendar Events
  app.get("/api/calendar/events", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user?.calendarConnected) return res.json([]);
      const { listUpcomingEvents } = await import("./calendar");
      const events = await listUpcomingEvents(user);
      res.json(events);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/calendar/events", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user?.calendarConnected) {
        return res.status(400).json({ message: "Calendar not connected." });
      }
      const { title, description, startTime, endTime } = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        startTime: z.string(),
        endTime: z.string(),
      }).parse(req.body);
      const { createCalendarEvent } = await import("./calendar");
      const result = await createCalendarEvent(user, {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/meetings/:id/sync-calendar", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const meetingId = parseInt(req.params.id as string);
      const user = await storage.getUser(userId);
      if (!user?.calendarConnected) {
        return res.status(400).json({ message: "Connect Google Calendar in Settings first." });
      }
      const meeting = await storage.getMeeting(meetingId);
      if (!meeting) return res.status(404).json({ message: "Meeting not found" });

      const { createCalendarEvent } = await import("./calendar");
      const startTime = new Date(meeting.date);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      const result = await createCalendarEvent(user, {
        title: meeting.title,
        description: meeting.summary ?? undefined,
        startTime,
        endTime,
      });

      const { db } = await import("./db");
      const { meetings: meetingsTable } = await import("@shared/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      const [updated] = await db
        .update(meetingsTable)
        .set({ calendarEventId: result.eventId, calendarEventLink: result.htmlLink })
        .where(eqOp(meetingsTable.id, meetingId))
        .returning();

      res.json({ ...updated, eventLink: result.htmlLink });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Email Sync
  app.post("/api/email/sync", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { getGmailMessages, getUserGmailAddress } = await import("./gmail");
      const { openai } = await import("./openai");

      const currentUser = await storage.getUser(userId);
      if (!currentUser || !currentUser.gmailConnected) {
        return res.status(400).json({ message: "Connect your Gmail account in Settings before syncing." });
      }

      const [rawEmails, myAddress] = await Promise.all([
        getGmailMessages(currentUser, 50),
        getUserGmailAddress(currentUser),
      ]);

      const allClients = await storage.listClients();
      const allContacts = await storage.listAllClientContacts();
      const allLeads = await storage.listLeads();

      const clientEmailMap = new Map<string, number>();
      for (const c of allClients) {
        if (c.email) clientEmailMap.set(c.email.toLowerCase(), c.id);
      }
      const contactEmailMap = new Map<string, { clientId: number | null; contactId: number }>(); 
      for (const ct of allContacts) {
        if (ct.email) contactEmailMap.set(ct.email.toLowerCase(), { clientId: ct.clientId, contactId: ct.id });
      }

      const clientContext = allClients.slice(0, 30).map(c => ({ id: c.id, name: c.name, email: c.email }));
      const leadContext = allLeads.slice(0, 30).map(l => ({ id: l.id, title: l.title, stage: l.stage, clientId: l.clientId }));

      let newEmails = 0;
      const savedEmails: any[] = [];

      for (const raw of rawEmails) {
        const direction = raw.fromEmail.toLowerCase() === myAddress.toLowerCase() ? "outbound" : "inbound";

        let clientId: number | null = null;
        let contactId: number | null = null;

        const fromLower = raw.fromEmail.toLowerCase();
        if (clientEmailMap.has(fromLower)) {
          clientId = clientEmailMap.get(fromLower)!;
        } else if (contactEmailMap.has(fromLower)) {
          const match = contactEmailMap.get(fromLower)!;
          clientId = match.clientId;
          contactId = match.contactId;
        } else {
          for (const to of raw.toEmails) {
            const toLower = to.toLowerCase();
            if (clientEmailMap.has(toLower)) { clientId = clientEmailMap.get(toLower)!; break; }
            if (contactEmailMap.has(toLower)) { const m = contactEmailMap.get(toLower)!; clientId = m.clientId; contactId = m.contactId; break; }
          }
        }

        const leadId = clientId ? (allLeads.find(l => l.clientId === clientId)?.id ?? null) : null;

        let aiResult = { summary: "", suggestedTasks: [] as any[], sentiment: "neutral", stageSuggestion: null as string | null, requiresResponse: false };
        try {
          const prompt = `You are an assistant for M5 Services, a facility maintenance company. Analyze this email and respond with ONLY valid JSON.

Email:
From: ${raw.fromName} <${raw.fromEmail}>
Subject: ${raw.subject}
Body: ${raw.fullBody.slice(0, 2000)}

Known clients: ${JSON.stringify(clientContext.slice(0, 15))}
Active leads: ${JSON.stringify(leadContext.slice(0, 10))}
Direction: ${direction} (${direction === "inbound" ? "client emailed M5" : "M5 emailed client"})

Respond with this JSON:
{
  "summary": "1-2 sentence summary of the email",
  "suggestedTasks": [{"title": "task title", "priority": "high|medium|low", "dueInDays": 1}],
  "sentiment": "positive|neutral|negative|urgent",
  "stageSuggestion": null or one of: "new_lead|qualification|proposal|negotiation|won|lost",
  "requiresResponse": true or false (true only if inbound and M5 should reply — exclude automated/notifications/newsletters)
}`;

          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            max_completion_tokens: 500,
          });
          const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
          aiResult = {
            summary: parsed.summary ?? "",
            suggestedTasks: Array.isArray(parsed.suggestedTasks) ? parsed.suggestedTasks.slice(0, 5) : [],
            sentiment: parsed.sentiment ?? "neutral",
            stageSuggestion: parsed.stageSuggestion ?? null,
            requiresResponse: direction === "inbound" ? (parsed.requiresResponse ?? false) : false,
          };
        } catch {}

        const msgData: any = {
          gmailMessageId: raw.gmailMessageId,
          gmailThreadId: raw.gmailThreadId,
          userId,
          direction,
          fromEmail: raw.fromEmail,
          fromName: raw.fromName ?? null,
          toEmails: raw.toEmails,
          subject: raw.subject,
          bodySnippet: raw.bodySnippet,
          fullBody: raw.fullBody,
          receivedAt: raw.receivedAt,
          clientId: clientId ?? null,
          leadId: leadId ?? null,
          contactId: contactId ?? null,
          aiSummary: aiResult.summary,
          aiSuggestedTasks: aiResult.suggestedTasks,
          aiSentiment: aiResult.sentiment,
          aiStageSuggestion: aiResult.stageSuggestion,
          requiresResponse: aiResult.requiresResponse,
          followUpReminderCreated: false,
          isProcessed: true,
        };

        const existing = await storage.listEmailMessages({ userId });
        const alreadyExists = existing.some(e => e.gmailMessageId === raw.gmailMessageId);
        if (!alreadyExists) newEmails++;

        await storage.upsertEmailMessage(msgData);
        savedEmails.push({ ...msgData, clientId, leadId });
      }

      const unresponded = await storage.listUnrespondedInboundEmails(2, userId);
      let remindersCreated = 0;
      for (const email of unresponded) {
        await storage.createReminder({
          userId,
          title: `Follow up needed: "${(email.subject ?? "").slice(0, 60)}"`,
          message: `This client email hasn't been responded to in over 2 days. ${email.aiSummary ? `Summary: ${email.aiSummary}` : ""}`,
          dueAt: new Date(),
          relatedLeadId: email.leadId ?? null,
          relatedClientId: email.clientId ?? null,
        } as any);
        await storage.updateEmailMessage(email.id, { followUpReminderCreated: true });
        remindersCreated++;
      }

      res.json({ newEmails, totalSynced: rawEmails.length, remindersCreated });
    } catch (err: any) {
      res.status(500).json({ message: err.message ?? "Email sync failed" });
    }
  });

  app.get("/api/email-messages", isAuthenticated, async (req, res) => {
    const userId = (req as any).user?.claims?.sub;
    const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
    const leadId = req.query.leadId ? parseInt(req.query.leadId as string) : undefined;
    const filters = clientId ? { clientId } : leadId ? { leadId } : { userId };
    const msgs = await storage.listEmailMessages(filters);
    res.json(msgs);
  });

  app.patch("/api/email-messages/:id/link", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const { clientId, leadId, contactId } = z.object({
      clientId: z.number().nullable().optional(),
      leadId: z.number().nullable().optional(),
      contactId: z.number().nullable().optional(),
    }).parse(req.body);
    const updated = await storage.updateEmailMessage(id, {
      ...(clientId !== undefined ? { clientId: clientId ?? null } : {}),
      ...(leadId !== undefined ? { leadId: leadId ?? null } : {}),
      ...(contactId !== undefined ? { contactId: contactId ?? null } : {}),
    });
    res.json(updated);
  });

  app.post("/api/email-messages/:id/create-tasks", isAuthenticated, async (req, res) => {
    const userId = (req as any).user?.claims?.sub;
    const id = parseInt(req.params.id);
    const { tasks: taskList } = z.object({
      tasks: z.array(z.object({
        title: z.string(),
        priority: z.string().optional(),
        dueInDays: z.number().optional(),
      })),
    }).parse(req.body);

    const email = await storage.getEmailMessage(id);
    if (!email) return res.status(404).json({ message: "Email not found" });

    const created = [];
    for (const t of taskList) {
      const dueDate = t.dueInDays ? new Date(Date.now() + t.dueInDays * 86400000) : null;
      const task = await storage.createTask({
        title: t.title,
        priority: (t.priority as any) ?? "medium",
        status: "todo",
        assignedTo: userId,
        clientId: email.clientId ?? null,
        leadId: email.leadId ?? null,
        dueDate,
        description: `Created from email: "${email.subject}"`,
        labels: [],
        checklist: [],
        columnId: null,
      } as any);
      created.push(task);
    }
    res.json(created);
  });

  app.patch("/api/email-messages/:id/apply-stage", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const { leadId, stage } = z.object({ leadId: z.number(), stage: z.string() }).parse(req.body);
    const lead = await storage.updateLeadStage(leadId, stage);
    const email = await storage.getEmailMessage(id);
    await storage.createActivityLog({
      entityType: "lead",
      entityId: leadId,
      action: "stage_changed",
      details: `Stage updated to "${stage}" based on email: "${email?.subject}"`,
      userId: (req as any).user?.claims?.sub,
    } as any);
    res.json(lead);
  });

  // My permissions (any authenticated user)
  app.get("/api/my-permissions", isAuthenticated, async (req, res) => {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const MODULES = ["dashboard", "leads", "customers", "tasks", "meetings", "estimates", "service_catalog", "proposals", "email_sync", "announcements"];

    let permissions: Record<string, string>;
    if (user.role === "admin") {
      permissions = Object.fromEntries(MODULES.map(m => [m, "full"]));
    } else {
      const perms = await storage.listRolePermissions();
      const rolePerms = perms.filter(p => p.roleKey === user.role);
      permissions = Object.fromEntries(MODULES.map(m => {
        const found = rolePerms.find(p => p.module === m);
        return [m, found?.accessLevel ?? "own_only"];
      }));
    }

    const configs = await storage.listRoleConfigs();
    const roleConfig = configs.find(c => c.roleKey === user.role);
    const displayName = roleConfig?.displayName ?? user.role;

    res.json({ role: user.role, displayName, permissions });
  });

  // ── Building Portfolios ──────────────────────────────────────────────────
  app.get("/api/portfolios", isAuthenticated, async (req, res) => {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const portfolios = await storage.listPortfolios(clientId);
    res.json(portfolios);
  });

  app.post("/api/portfolios", isAuthenticated, async (req, res) => {
    const parsed = insertBuildingPortfolioSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const user = req.user as any;
    const portfolio = await storage.createPortfolio({ ...parsed.data, createdBy: user?.id ?? null });
    res.status(201).json(portfolio);
  });

  app.get("/api/portfolios/:id", isAuthenticated, async (req, res) => {
    const portfolio = await storage.getPortfolio(Number(req.params.id));
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
    res.json(portfolio);
  });

  app.patch("/api/portfolios/:id", isAuthenticated, async (req, res) => {
    const parsed = insertBuildingPortfolioSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const portfolio = await storage.updatePortfolio(Number(req.params.id), parsed.data);
    res.json(portfolio);
  });

  app.delete("/api/portfolios/:id", isAuthenticated, async (req, res) => {
    await storage.deletePortfolio(Number(req.params.id));
    res.status(204).end();
  });

  app.post("/api/portfolios/:id/buildings", isAuthenticated, async (req, res) => {
    const { buildingId } = req.body;
    if (!buildingId) return res.status(400).json({ message: "buildingId required" });
    const row = await storage.addBuildingToPortfolio(Number(req.params.id), Number(buildingId));
    res.status(201).json(row);
  });

  app.delete("/api/portfolios/:id/buildings/:buildingId", isAuthenticated, async (req, res) => {
    await storage.removeBuildingFromPortfolio(Number(req.params.id), Number(req.params.buildingId));
    res.status(204).end();
  });

  app.post("/api/portfolios/:id/contacts", isAuthenticated, async (req, res) => {
    const { contactId, role } = req.body;
    if (!contactId) return res.status(400).json({ message: "contactId required" });
    const row = await storage.addContactToPortfolio(Number(req.params.id), Number(contactId), role ?? null);
    res.status(201).json(row);
  });

  app.delete("/api/portfolios/:id/contacts/:contactId", isAuthenticated, async (req, res) => {
    await storage.removeContactFromPortfolio(Number(req.params.id), Number(req.params.contactId));
    res.status(204).end();
  });

  // Deal Tags
  app.get("/api/deal-tags", isAuthenticated, async (_req, res) => {
    const tags = await storage.listDealTags();
    res.json(tags);
  });

  app.post("/api/deal-tags", isAuthenticated, async (req, res) => {
    const { name, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name required" });
    try {
      const tag = await storage.createDealTag({ name: name.toLowerCase().trim(), color: color || "gray" });
      res.status(201).json(tag);
    } catch (e: any) {
      if (e.code === "23505") return res.status(409).json({ message: "Tag already exists" });
      throw e;
    }
  });

  app.delete("/api/deal-tags/:id", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    await storage.deleteDealTag(Number(req.params.id));
    res.status(204).end();
  });

  // Industry Options
  app.get("/api/industry-options", isAuthenticated, async (_req, res) => {
    const options = await storage.listIndustryOptions();
    res.json(options);
  });

  app.post("/api/industry-options", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    const { label } = req.body;
    if (!label?.trim()) return res.status(400).json({ message: "Label required" });
    const option = await storage.createIndustryOption({ label: label.trim(), sortOrder: 999 });
    res.status(201).json(option);
  });

  app.delete("/api/industry-options/:id", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    await storage.deleteIndustryOption(Number(req.params.id));
    res.status(204).end();
  });

  // User Profile Self-Edit
  app.patch("/api/users/me", isAuthenticated, async (req, res) => {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { firstName, lastName, phone, profileImageUrl, dashboardFilter } = req.body;
    const user = await storage.updateUserProfile(userId, { firstName, lastName, phone, profileImageUrl, dashboardFilter });
    res.json(user);
  });

  // Value Tier Settings
  app.get("/api/value-tier-settings", isAuthenticated, async (_req, res) => {
    const tiers = await storage.getValueTierSettings();
    res.json(tiers);
  });

  app.patch("/api/value-tier-settings/:tier", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    const tier = decodeURIComponent(req.params.tier);
    const { estimatedValue } = z.object({ estimatedValue: z.coerce.number().min(0) }).parse(req.body);
    const updated = await storage.updateValueTierSetting(tier, estimatedValue);
    res.json(updated);
  });

  // Profile picture upload for users
  app.post("/api/users/me/avatar", isAuthenticated, upload.single("avatar"), async (req, res) => {
    const r = req as any;
    const userId = r.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!r.file) return res.status(400).json({ message: "No file uploaded" });
    try {
      const ext = r.file.mimetype.split("/")[1] || "jpg";
      let entityDir = objectStorageService.getPrivateObjectDir();
      const fullPath = `${entityDir}/avatars/${userId}.${ext}`;
      const { bucketName, objectName } = parseStoragePath(fullPath);
      const bucket = (await import("./replit_integrations/object_storage/objectStorage")).objectStorageClient.bucket(bucketName);
      const gcsFile = bucket.file(objectName);
      await gcsFile.save(r.file.buffer, { contentType: r.file.mimetype });
      try { await gcsFile.makePublic(); } catch (_) {}
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
      const user = await storage.updateUserProfile(userId, { profileImageUrl: publicUrl });
      res.json({ url: publicUrl, user });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Company logo upload
  app.post("/api/clients/:id/logo", isAuthenticated, upload.single("logo"), async (req, res) => {
    const r = req as any;
    const clientId = Number(req.params.id);
    if (!r.file) return res.status(400).json({ message: "No file uploaded" });
    try {
      const ext = r.file.mimetype.split("/")[1] || "jpg";
      let entityDir = objectStorageService.getPrivateObjectDir();
      const fullPath = `${entityDir}/logos/client_${clientId}.${ext}`;
      const { bucketName, objectName } = parseStoragePath(fullPath);
      const bucket = (await import("./replit_integrations/object_storage/objectStorage")).objectStorageClient.bucket(bucketName);
      const gcsFile = bucket.file(objectName);
      await gcsFile.save(r.file.buffer, { contentType: r.file.mimetype });
      try { await gcsFile.makePublic(); } catch (_) {}
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
      const client = await storage.updateClient(clientId, { logoUrl: publicUrl } as any);
      res.json({ url: publicUrl, client });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Auto-fetch company logo from domain, store in GCS, return URL
  app.get("/api/fetch-logo", isAuthenticated, async (req, res) => {
    const domain = String(req.query.domain || "").trim();
    const clientId = req.query.clientId ? Number(req.query.clientId) : null;
    if (!domain) return res.status(400).json({ message: "domain is required" });

    const candidates = [
      `https://logo.clearbit.com/${domain}`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    ];

    let imageBuffer: Buffer | null = null;
    let mimeType = "image/png";
    let chosenExt = "png";

    for (const url of candidates) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) continue;
        const ct = response.headers.get("content-type") || "";
        if (!ct.startsWith("image/")) continue;
        const ab = await response.arrayBuffer();
        const buf = Buffer.from(ab);
        if (buf.length < 100) continue; // too small, likely a placeholder
        imageBuffer = buf;
        mimeType = ct.split(";")[0];
        const extMap: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/x-icon": "png", "image/vnd.microsoft.icon": "png" };
        chosenExt = extMap[mimeType] || "png";
        break;
      } catch (_) { continue; }
    }

    if (!imageBuffer) return res.status(404).json({ message: "Could not fetch a logo for this domain" });

    try {
      const entityDir = objectStorageService.getPrivateObjectDir();
      const filename = clientId ? `client_${clientId}_auto_${Date.now()}.${chosenExt}` : `logo_${Date.now()}.${chosenExt}`;
      const fullPath = `${entityDir}/logos/${filename}`;
      const { bucketName, objectName } = parseStoragePath(fullPath);
      const { objectStorageClient: gcsClient } = await import("./replit_integrations/object_storage/objectStorage");
      const gcsFile = gcsClient.bucket(bucketName).file(objectName);
      await gcsFile.save(imageBuffer, { contentType: mimeType });
      try { await gcsFile.makePublic(); } catch (_) {}
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
      if (clientId) {
        await storage.updateClient(clientId, { logoUrl: publicUrl } as any);
      }
      return res.json({ url: publicUrl });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Proxy route for serving stored images (logo, contact photos) through the backend
  app.get("/api/clients/:id/logo-img", isAuthenticated, async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const client = await storage.getClient(clientId);
      if (!client || !(client as any).logoUrl) return res.status(404).end();
      const logoUrl: string = (client as any).logoUrl;
      if (!logoUrl.startsWith("https://storage.googleapis.com/")) {
        return res.redirect(logoUrl);
      }
      const { bucketName, objectName } = parseStoragePath(logoUrl.replace("https://storage.googleapis.com/", ""));
      const { objectStorageClient: gcsClient } = await import("./replit_integrations/object_storage/objectStorage");
      const [buf] = await gcsClient.bucket(bucketName).file(objectName).download();
      const ext = objectName.split(".").pop()?.toLowerCase() || "jpeg";
      const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };
      res.setHeader("Content-Type", mimeMap[ext] || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(buf);
    } catch (e: any) {
      res.status(500).end();
    }
  });

  app.get("/api/contacts/:id/photo-img", isAuthenticated, async (req, res) => {
    try {
      const contactId = Number(req.params.id);
      const contact = await storage.getClientContact(contactId);
      if (!contact || !contact.profilePictureUrl) return res.status(404).end();
      const photoUrl: string = contact.profilePictureUrl;
      // Only proxy GCS URLs, not external (LinkedIn) URLs
      if (!photoUrl.startsWith("https://storage.googleapis.com/")) {
        return res.redirect(photoUrl);
      }
      const { bucketName, objectName } = parseStoragePath(photoUrl.replace("https://storage.googleapis.com/", ""));
      const { objectStorageClient: gcsClient } = await import("./replit_integrations/object_storage/objectStorage");
      const [buf] = await gcsClient.bucket(bucketName).file(objectName).download();
      const ext = objectName.split(".").pop()?.toLowerCase() || "jpeg";
      const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };
      res.setHeader("Content-Type", mimeMap[ext] || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(buf);
    } catch (e: any) {
      res.status(500).end();
    }
  });

  app.get("/api/users/:id/avatar-img", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user || !user.profileImageUrl) return res.status(404).end();
      const photoUrl: string = user.profileImageUrl;
      if (!photoUrl.startsWith("https://storage.googleapis.com/")) {
        return res.redirect(photoUrl);
      }
      const { bucketName, objectName } = parseStoragePath(photoUrl.replace("https://storage.googleapis.com/", ""));
      const { objectStorageClient: gcsClient } = await import("./replit_integrations/object_storage/objectStorage");
      const [buf] = await gcsClient.bucket(bucketName).file(objectName).download();
      const ext = objectName.split(".").pop()?.toLowerCase() || "jpeg";
      const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };
      res.setHeader("Content-Type", mimeMap[ext] || "image/jpeg");
      res.setHeader("Cache-Control", "no-cache");
      res.send(buf);
    } catch (e: any) {
      res.status(500).end();
    }
  });

  app.post("/api/contacts/:id/photo", isAuthenticated, upload.single("photo"), async (req, res) => {
    const r = req as any;
    const contactId = parseInt(req.params.id);
    if (!r.file) return res.status(400).json({ message: "No file uploaded" });
    try {
      const ext = r.file.mimetype.split("/")[1] || "jpg";
      let entityDir = objectStorageService.getPrivateObjectDir();
      if (!entityDir.endsWith("/")) entityDir = entityDir + "/";
      const fullPath = entityDir + "contact_photos/contact_" + contactId + "." + ext;
      const { bucketName, objectName } = parseStoragePath(fullPath);
      const bucket = (await import("./replit_integrations/object_storage/objectStorage")).objectStorageClient.bucket(bucketName);
      const gcsPhotoFile = bucket.file(objectName);
      await gcsPhotoFile.save(r.file.buffer, { contentType: r.file.mimetype });
      try { await gcsPhotoFile.makePublic(); } catch (_) {}
      const publicUrl = "https://storage.googleapis.com/" + bucketName + "/" + objectName;
      const updated = await storage.updateClientContact(contactId, { profilePictureUrl: publicUrl });
      res.json({ url: publicUrl, contact: updated });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Bulk Delete / Update — Clients
  app.post("/api/clients/bulk-delete", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "ids required" });
    await storage.deleteBulkClients(ids.map(Number));
    res.status(204).end();
  });

  app.post("/api/clients/bulk-update", isAuthenticated, async (req, res) => {
    const { ids, data } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "ids required" });
    await storage.bulkUpdateClients(ids.map(Number), data);
    res.json({ updated: ids.length });
  });

  // Bulk Delete / Update — Contacts
  app.post("/api/contacts/bulk-delete", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "ids required" });
    await storage.deleteBulkClientContacts(ids.map(Number));
    res.status(204).end();
  });

  app.post("/api/contacts/bulk-update", isAuthenticated, async (req, res) => {
    const { ids, data } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "ids required" });
    await storage.bulkUpdateClientContacts(ids.map(Number), data);
    res.json({ updated: ids.length });
  });

  return httpServer;
}
