import type { Express, Request, Response, RequestHandler } from "express";
import { type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { seedDemoData } from "./seed";
import { isAuthenticated, authStorage, requirePermission, checkProjectPermission, rbacStorage } from "./auth";
import { audit } from "./auth/audit";
import { db } from "./db";
import { users, projects, auditLog } from "@shared/schema";
import { eq, sql, desc, and, gte, lte, inArray } from "drizzle-orm";
import { getAIProvider, type AIMessage } from "./ai";
import { assemblePrompt, PROMPT_CATEGORIES } from "./prompts";
import { createClient } from "@supabase/supabase-js";

const syncUserSchema = z.object({
  email: z.string().email().nullable(),
  firstName: z.string().max(255).nullable(),
  lastName: z.string().max(255).nullable(),
  profileImageUrl: z.string().url().nullable(),
});

function getUserId(req: Request): string {
  if (!req.userId) throw new Error("userId not set on authenticated request");
  return req.userId;
}

function param(req: Request, key: string): string {
  const value = req.params[key];
  if (typeof value !== "string") throw new Error(`Missing route param: ${key}`);
  return value;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === AUTH SYNC (called by frontend after Supabase login) ===
  app.post("/api/auth/sync", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const parsed = syncUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parsed.error.flatten().fieldErrors });
    }
    const { email, firstName, lastName, profileImageUrl } = parsed.data;
    const user = await authStorage.upsertUser({
      id: userId,
      email: email || null,
      firstName: firstName || null,
      lastName: lastName || null,
      profileImageUrl: profileImageUrl || null,
    });

    // Seed demo data for new users with no projects
    const existingProjects = await storage.listProjects(userId);
    if (existingProjects.length === 0) {
      await seedDemoData(userId);
    }

    audit(req, "sync", "user", userId);
    res.json(user);
  });

  // === GET CURRENT USER (with permissions) ===
  app.get("/api/auth/user", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const user = await authStorage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Resolve user's system permissions and roles for the frontend
    const systemPermissions = await rbacStorage.getUserSystemPermissions(userId);
    const userRolesList = await rbacStorage.getUserRoles(userId);
    const systemRoles = userRolesList.filter((r) => r.type === "system").map((r) => r.name);

    res.json({
      ...user,
      systemPermissions,
      systemRoles,
    });
  });

  // === PROJECTS ===
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const rows = await storage.listProjects(userId);

    // Also include projects where user is a member but not owner (batch query)
    const memberProjectIds = await rbacStorage.getProjectsForUser(userId);
    const ownedIds = new Set(rows.map((r) => r.id));
    const missingIds = memberProjectIds.filter((pid) => !ownedIds.has(pid));
    if (missingIds.length > 0) {
      const memberProjects = await storage.getProjectsByIds(missingIds);
      for (const project of memberProjects) {
        if (!project.archivedAt) {
          rows.push(project);
        }
      }
    }

    res.json(rows);
  });

  app.get("/api/projects/archived", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const rows = await storage.listArchivedProjects(userId);
    res.json(rows);
  });

  app.patch("/api/projects/:id/restore", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await checkProjectPermission(req, param(req, "id"), userId, "project.edit")) return res.status(404).json({ message: "Not found" });
    const project = await storage.getProject(param(req, "id"));
    if (!project?.archivedAt) return res.status(400).json({ message: "Project is not archived" });
    const restored = await storage.restoreProject(param(req, "id"));
    if (!restored) return res.status(404).json({ message: "Not found" });
    audit(req, "update", "project", param(req, "id"), { action: "restore" });
    res.json(restored);
  });

  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await checkProjectPermission(req, param(req, "id"), userId, "project.view")) return res.status(404).json({ message: "Not found" });
    const row = await storage.getProject(param(req, "id"));
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  app.post("/api/projects", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const { name, summary, executiveSummary, dashboardStatus } = req.body;
    const ownerRole = await rbacStorage.getRoleByName("owner");
    if (!ownerRole) {
      return res.status(500).json({ message: "Owner role not found — RBAC seed may not have run" });
    }

    const row = await storage.createProject({ name, summary, executiveSummary, dashboardStatus, userId });
    await rbacStorage.addProjectMember(row.id, userId, ownerRole.id);

    audit(req, "create", "project", row.id, { name: row.name });
    res.status(201).json(row);
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await checkProjectPermission(req, param(req, "id"), userId, "project.edit")) return res.status(404).json({ message: "Not found" });
    const { name, summary, executiveSummary, dashboardStatus } = req.body;
    const row = await storage.updateProject(param(req, "id"), { name, summary, executiveSummary, dashboardStatus });
    if (!row) return res.status(404).json({ message: "Not found" });
    audit(req, "update", "project", param(req, "id"));
    res.json(row);
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await checkProjectPermission(req, param(req, "id"), userId, "project.delete")) return res.status(404).json({ message: "Not found" });
    await storage.deleteProject(param(req, "id"));
    audit(req, "delete", "project", param(req, "id"));
    res.status(204).end();
  });

  // === BRIEF SECTIONS ===
  app.get("/api/projects/:projectId/brief", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await checkProjectPermission(req, param(req, "projectId"), userId, "project.view")) return res.status(404).json({ message: "Not found" });
    const rows = await storage.listBriefSections(param(req, "projectId"));
    res.json(rows);
  });

  app.post("/api/projects/:projectId/brief", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await checkProjectPermission(req, param(req, "projectId"), userId, "project.brief.edit")) return res.status(404).json({ message: "Not found" });
    const { genericName, subtitle, completeness, totalItems, completedItems, content, sortOrder } = req.body;
    const row = await storage.createBriefSection({ genericName, subtitle, completeness, totalItems, completedItems, content, sortOrder, projectId: param(req, "projectId") });
    audit(req, "create", "brief_section", row.id);
    res.status(201).json(row);
  });

  app.patch("/api/brief/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForBrief(param(req, "id"));
    if (!projectId || !await checkProjectPermission(req, projectId, userId, "project.brief.edit")) return res.status(404).json({ message: "Not found" });
    const { genericName, subtitle, completeness, totalItems, completedItems, content, sortOrder } = req.body;
    const row = await storage.updateBriefSection(param(req, "id"), { genericName, subtitle, completeness, totalItems, completedItems, content, sortOrder });
    if (!row) return res.status(404).json({ message: "Not found" });
    audit(req, "update", "brief_section", param(req, "id"));
    res.json(row);
  });

  app.delete("/api/brief/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForBrief(param(req, "id"));
    if (!projectId || !await checkProjectPermission(req, projectId, userId, "project.brief.edit")) return res.status(404).json({ message: "Not found" });
    await storage.deleteBriefSection(param(req, "id"));
    audit(req, "delete", "brief_section", param(req, "id"));
    res.status(204).end();
  });

  app.put("/api/projects/:projectId/brief/reorder", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await checkProjectPermission(req, param(req, "projectId"), userId, "project.brief.edit")) return res.status(404).json({ message: "Not found" });
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.every((id: unknown) => typeof id === "string")) {
      return res.status(400).json({ message: "ids must be an array of strings" });
    }
    await storage.reorderBriefSections(param(req, "projectId"), ids);
    audit(req, "update", "brief_sections", undefined, { action: "reorder" });
    res.status(204).end();
  });

  // === DISCOVERY CATEGORIES ===
  app.get("/api/projects/:projectId/discovery", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await checkProjectPermission(req, param(req, "projectId"), userId, "project.view")) return res.status(404).json({ message: "Not found" });
    const rows = await storage.listDiscoveryCategories(param(req, "projectId"));
    res.json(rows);
  });

  app.post("/api/projects/:projectId/discovery", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await checkProjectPermission(req, param(req, "projectId"), userId, "project.discovery.edit")) return res.status(404).json({ message: "Not found" });
    const { name, sortOrder } = req.body;
    const row = await storage.createDiscoveryCategory({ name, sortOrder, projectId: param(req, "projectId") });
    audit(req, "create", "discovery_category", row.id);
    res.status(201).json(row);
  });

  app.patch("/api/discovery/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForDiscoveryCategory(param(req, "id"));
    if (!projectId || !await checkProjectPermission(req, projectId, userId, "project.discovery.edit")) return res.status(404).json({ message: "Not found" });
    const { name, sortOrder } = req.body;
    const row = await storage.updateDiscoveryCategory(param(req, "id"), { name, sortOrder });
    if (!row) return res.status(404).json({ message: "Not found" });
    audit(req, "update", "discovery_category", param(req, "id"));
    res.json(row);
  });

  app.delete("/api/discovery/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForDiscoveryCategory(param(req, "id"));
    if (!projectId || !await checkProjectPermission(req, projectId, userId, "project.discovery.edit")) return res.status(404).json({ message: "Not found" });
    await storage.deleteDiscoveryCategory(param(req, "id"));
    audit(req, "delete", "discovery_category", param(req, "id"));
    res.status(204).end();
  });

  app.put("/api/projects/:projectId/discovery/reorder", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await checkProjectPermission(req, param(req, "projectId"), userId, "project.discovery.edit")) return res.status(404).json({ message: "Not found" });
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.every((id: unknown) => typeof id === "string")) {
      return res.status(400).json({ message: "ids must be an array of strings" });
    }
    await storage.reorderDiscoveryCategories(param(req, "projectId"), ids);
    audit(req, "update", "discovery_categories", undefined, { action: "reorder" });
    res.status(204).end();
  });

  // === DELIVERABLES ===
  app.get("/api/projects/:projectId/deliverables", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await checkProjectPermission(req, param(req, "projectId"), userId, "project.view")) return res.status(404).json({ message: "Not found" });
    const rows = await storage.listDeliverables(param(req, "projectId"));
    res.json(rows);
  });

  app.post("/api/projects/:projectId/deliverables", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await checkProjectPermission(req, param(req, "projectId"), userId, "project.deliverables.edit")) return res.status(404).json({ message: "Not found" });
    const { title, subtitle, completeness, status, content, engaged, sortOrder } = req.body;
    const row = await storage.createDeliverable({ title, subtitle, completeness, status, content, engaged, sortOrder, projectId: param(req, "projectId") });
    audit(req, "create", "deliverable", row.id);
    res.status(201).json(row);
  });

  app.patch("/api/deliverables/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForDeliverable(param(req, "id"));
    if (!projectId || !await checkProjectPermission(req, projectId, userId, "project.deliverables.edit")) return res.status(404).json({ message: "Not found" });
    const { title, subtitle, completeness, status, content, engaged, sortOrder } = req.body;
    const row = await storage.updateDeliverable(param(req, "id"), { title, subtitle, completeness, status, content, engaged, sortOrder });
    if (!row) return res.status(404).json({ message: "Not found" });
    audit(req, "update", "deliverable", param(req, "id"));
    res.json(row);
  });

  app.delete("/api/deliverables/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForDeliverable(param(req, "id"));
    if (!projectId || !await checkProjectPermission(req, projectId, userId, "project.deliverables.edit")) return res.status(404).json({ message: "Not found" });
    await storage.deleteDeliverable(param(req, "id"));
    audit(req, "delete", "deliverable", param(req, "id"));
    res.status(204).end();
  });

  app.put("/api/projects/:projectId/deliverables/reorder", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await checkProjectPermission(req, param(req, "projectId"), userId, "project.deliverables.edit")) return res.status(404).json({ message: "Not found" });
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.every((id: unknown) => typeof id === "string")) {
      return res.status(400).json({ message: "ids must be an array of strings" });
    }
    await storage.reorderDeliverables(param(req, "projectId"), ids);
    audit(req, "update", "deliverables", undefined, { action: "reorder" });
    res.status(204).end();
  });

  // === BUCKET ITEMS ===
  app.get("/api/items/:parentType/:parentId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForParent(param(req, "parentId"), param(req, "parentType"));
    if (!projectId || !await checkProjectPermission(req, projectId, userId, "project.view")) return res.status(404).json({ message: "Not found" });
    const rows = await storage.listBucketItems(param(req, "parentId"), param(req, "parentType"));
    res.json(rows);
  });

  app.post("/api/items", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const { parentId, parentType, type, title, preview, date, url, fileName, fileSizeLabel, sortOrder } = req.body;
    const projectId = await storage.getProjectIdForParent(parentId, parentType);
    if (!projectId || !await checkProjectPermission(req, projectId, userId, "project.edit")) return res.status(404).json({ message: "Not found" });
    const row = await storage.createBucketItem({ parentId, parentType, type, title, preview, date, url, fileName, fileSizeLabel, sortOrder });
    audit(req, "create", "bucket_item", row.id);
    res.status(201).json(row);
  });

  app.delete("/api/items/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const item = await storage.getBucketItem(param(req, "id"));
    if (!item) return res.status(404).json({ message: "Not found" });
    const projectId = await storage.getProjectIdForParent(item.parentId, item.parentType);
    if (!projectId || !await checkProjectPermission(req, projectId, userId, "project.edit")) return res.status(404).json({ message: "Not found" });
    await storage.deleteBucketItem(param(req, "id"));
    audit(req, "delete", "bucket_item", param(req, "id"));
    res.status(204).end();
  });

  // === CHAT MESSAGES ===
  app.get("/api/messages/:parentType/:parentId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForParent(param(req, "parentId"), param(req, "parentType"));
    if (!projectId || !await checkProjectPermission(req, projectId, userId, "project.view")) return res.status(404).json({ message: "Not found" });
    const rows = await storage.listChatMessages(param(req, "parentId"), param(req, "parentType"));
    res.json(rows);
  });

  app.post("/api/messages", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const { parentId, parentType, content, timestamp, hasSaveableContent, saved, sortOrder } = req.body;
    const projectId = await storage.getProjectIdForParent(parentId, parentType);
    if (!projectId || !await checkProjectPermission(req, projectId, userId, "project.chat.use")) return res.status(404).json({ message: "Not found" });
    const row = await storage.createChatMessage({ parentId, parentType, role: "user", content, timestamp, hasSaveableContent, saved, sortOrder });
    audit(req, "create", "chat_message", row.id);
    res.status(201).json(row);
  });

  app.patch("/api/messages/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const message = await storage.getChatMessage(param(req, "id"));
    if (!message) return res.status(404).json({ message: "Not found" });
    const projectId = await storage.getProjectIdForParent(message.parentId, message.parentType);
    if (!projectId || !await checkProjectPermission(req, projectId, userId, "project.chat.use")) return res.status(404).json({ message: "Not found" });
    const { saved, hasSaveableContent } = req.body;
    const row = await storage.updateChatMessage(param(req, "id"), { saved, hasSaveableContent });
    if (!row) return res.status(404).json({ message: "Not found" });
    audit(req, "update", "chat_message", param(req, "id"));
    res.json(row);
  });

  // === AI CHAT (SSE streaming) ===
  const chatRequestSchema = z.object({
    parentId: z.string().min(1),
    parentType: z.string().min(1).max(64),
    content: z.string().min(1).max(50000),
  });

  app.post("/api/chat", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parsed.error.flatten().fieldErrors });
    }

    const { parentId, parentType, content } = parsed.data;

    const projectId = await storage.getProjectIdForParent(parentId, parentType);
    if (!projectId || !await checkProjectPermission(req, projectId, userId, "project.chat.use")) {
      return res.status(404).json({ message: "Not found" });
    }

    // Save user message
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMessage = await storage.createChatMessage({
      parentId,
      parentType,
      role: "user",
      content,
      timestamp,
      hasSaveableContent: false,
      saved: false,
    });

    // Fetch conversation history
    const history = await storage.listChatMessages(parentId, parentType);
    const conversationHistory: AIMessage[] = history.map((msg) => ({
      role: msg.role === "user" ? "user" as const : "assistant" as const,
      content: msg.content,
    }));

    // Fetch legacy fallback prompt from core_queries
    const coreQuery = await storage.getCoreQuery(parentType);
    const fallbackPrompt = coreQuery?.contextQuery || "";

    // Assemble prompt: loads blocks, applies model formatting, windows history
    const provider = getAIProvider();
    const aiMessages = await assemblePrompt({
      locationKey: parentType,
      conversationHistory,
      providerName: provider.getProviderName(),
      fallbackPrompt,
      parentId,
      parentType,
      projectId,
    });

    // Set up SSE
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    let fullResponse = "";

    try {
      for await (const token of provider.streamCompletion(aiMessages)) {
        fullResponse += token;
        res.write(`data: ${JSON.stringify({ type: "token", text: token })}\n\n`);
      }

      // Save completed AI response
      const aiTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const aiMessage = await storage.createChatMessage({
        parentId,
        parentType,
        role: "ai",
        content: fullResponse,
        timestamp: aiTimestamp,
        hasSaveableContent: true,
        saved: false,
      });

      res.write(`data: ${JSON.stringify({ type: "done", userMessageId: userMessage.id, aiMessageId: aiMessage.id })}\n\n`);
    } catch (err) {
      const internalError = err instanceof Error ? err.message : "AI provider error";
      const safeErrorText = "Sorry, something went wrong. Please try again.";

      // Log full error server-side for debugging
      const { log } = await import("./index");
      log(`AI chat error: ${internalError}`, "chat");

      // Save safe error as AI message — wrapped so a storage failure can't prevent SSE cleanup
      try {
        const errTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        await storage.createChatMessage({
          parentId,
          parentType,
          role: "ai",
          content: safeErrorText,
          timestamp: errTimestamp,
          hasSaveableContent: false,
          saved: false,
        });
      } catch {
        // Storage failed — still send the SSE error event below
      }

      res.write(`data: ${JSON.stringify({ type: "error", message: safeErrorText })}\n\n`);
    }

    res.end();
  });

  // === ADMIN ROUTES ===
  app.get("/api/admin/users", isAuthenticated, requirePermission("admin.users.manage"), async (_req, res) => {
    const allUsers = await db.select().from(users);

    // Enrich with role info
    const enriched = await Promise.all(allUsers.map(async (u) => {
      const userRolesList = await rbacStorage.getUserRoles(u.id);
      const systemRoles = userRolesList.filter((r) => r.type === "system");
      return {
        ...u,
        systemRoles: systemRoles.map((r) => r.name),
        primaryRole: systemRoles.find((r) => r.name !== "member")?.name || "member",
      };
    }));

    res.json(enriched);
  });

  app.get("/api/admin/projects", isAuthenticated, requirePermission("admin.projects.view"), async (_req, res) => {
    const allProjects = await storage.listAllProjects();
    res.json(allProjects);
  });

  app.get("/api/admin/stats", isAuthenticated, requirePermission("admin.stats.view"), async (_req, res) => {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [projectCount] = await db.select({ count: sql<number>`count(*)` }).from(projects);
    res.json({
      totalUsers: Number(userCount.count),
      totalProjects: Number(projectCount.count),
    });
  });

  app.patch("/api/admin/users/:id/deactivate", isAuthenticated, requirePermission("admin.users.manage"), async (req, res) => {
    const targetId = param(req, "id");
    const currentUserId = getUserId(req);
    if (targetId === currentUserId) return res.status(400).json({ message: "Cannot deactivate yourself" });
    const user = await authStorage.getUser(targetId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const [updated] = await db.update(users).set({ isActive: !user.isActive }).where(eq(users.id, targetId)).returning();
    if (!updated) return res.status(404).json({ message: "User not found" });
    audit(req, "update", "user", targetId, { isActive: !user.isActive });
    res.json(updated);
  });

  // === ASSIGN SYSTEM ROLE TO USER ===
  app.put("/api/admin/users/:id/role", isAuthenticated, requirePermission("admin.users.roles"), async (req, res) => {
    const targetId = param(req, "id");
    const currentUserId = getUserId(req);
    if (targetId === currentUserId) return res.status(400).json({ message: "Cannot change your own role" });

    const { roleId } = req.body;
    if (typeof roleId !== "string") return res.status(400).json({ message: "roleId is required" });

    const role = await rbacStorage.getRoleById(roleId);
    if (!role || role.type !== "system") return res.status(400).json({ message: "Invalid system role" });

    // Only super_admins can assign the super_admin role
    if (role.name === "super_admin") {
      const callerPerms = await rbacStorage.getUserSystemPermissions(currentUserId);
      if (!callerPerms.includes("*")) {
        return res.status(403).json({ message: "Only super admins can assign the super_admin role" });
      }
    }

    const user = await authStorage.getUser(targetId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent demoting the last super_admin
    if (role.name !== "super_admin") {
      const targetRoles = await rbacStorage.getUserRoles(targetId);
      const isSuperAdmin = targetRoles.some((r) => r.name === "super_admin");
      if (isSuperAdmin) {
        const superAdminRole = await rbacStorage.getRoleByName("super_admin");
        if (superAdminRole) {
          const count = await rbacStorage.getRoleAssignmentCount(superAdminRole.id);
          if (count <= 1) {
            return res.status(400).json({ message: "Cannot demote the last super admin" });
          }
        }
      }
    }

    await rbacStorage.setUserSystemRole(targetId, roleId);

    // Sync isAdmin flag for backward compat
    const isAdminRole = role.name === "admin" || role.name === "super_admin";
    await db.update(users).set({ isAdmin: isAdminRole }).where(eq(users.id, targetId));

    audit(req, "update", "user", targetId, { role: role.name });
    res.json({ success: true, role: role.name });
  });

  // === SUPABASE AUTH USERS (admin only) ===
  app.get("/api/admin/auth-users", isAuthenticated, requirePermission("admin.auth-users.view"), async (_req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ message: "Supabase service role key not configured" });
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      return res.status(500).json({ message: error.message });
    }
    res.json(data.users);
  });

  // === CORE QUERIES (admin write, all users read) ===
  app.get("/api/core-queries", isAuthenticated, async (_req, res) => {
    const rows = await storage.listCoreQueries();
    res.json(rows);
  });

  app.get("/api/admin/core-queries", isAuthenticated, requirePermission("admin.core-queries.manage"), async (_req, res) => {
    const rows = await storage.listCoreQueries();
    res.json(rows);
  });

  app.put("/api/admin/core-queries/:locationKey", isAuthenticated, requirePermission("admin.core-queries.manage"), async (req, res) => {
    const locationKey = param(req, "locationKey");
    const { contextQuery } = req.body;
    if (typeof contextQuery !== "string") return res.status(400).json({ message: "contextQuery is required" });
    const row = await storage.upsertCoreQuery(locationKey, contextQuery);
    audit(req, "update", "core_query", locationKey);
    res.json(row);
  });

  // === PROMPT BLOCKS (admin only) ===
  app.get("/api/admin/prompt-blocks", isAuthenticated, requirePermission("admin.prompts.manage"), async (_req, res) => {
    const rows = await storage.listPromptBlocks();
    res.json(rows);
  });

  app.get("/api/admin/prompt-blocks/:id", isAuthenticated, requirePermission("admin.prompts.manage"), async (req, res) => {
    const row = await storage.getPromptBlock(param(req, "id"));
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  const validCategories = new Set<string>(PROMPT_CATEGORIES);

  app.post("/api/admin/prompt-blocks", isAuthenticated, requirePermission("admin.prompts.manage"), async (req, res) => {
    const { name, category, content, description, isActive, sortOrder } = req.body;
    if (typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "name is required" });
    if (typeof category !== "string" || !validCategories.has(category)) {
      return res.status(400).json({ message: `category must be one of: ${PROMPT_CATEGORIES.join(", ")}` });
    }
    const row = await storage.createPromptBlock({
      name: name.trim(),
      category,
      content: content || "",
      description: description || "",
      isActive: isActive ?? true,
      sortOrder: sortOrder ?? 0,
    });
    audit(req, "create", "prompt_block", row.id, { name: row.name });
    res.status(201).json(row);
  });

  app.patch("/api/admin/prompt-blocks/:id", isAuthenticated, requirePermission("admin.prompts.manage"), async (req, res) => {
    const existing = await storage.getPromptBlock(param(req, "id"));
    if (!existing) return res.status(404).json({ message: "Not found" });

    // Destructure only allowed fields
    const { name, category, content, description, isActive, sortOrder, changeNote } = req.body;

    if (category !== undefined && !validCategories.has(category)) {
      return res.status(400).json({ message: `category must be one of: ${PROMPT_CATEGORIES.join(", ")}` });
    }

    const userId = getUserId(req);

    // Auto-version: snapshot content before updating if content changed
    if (content !== undefined && content !== existing.content) {
      const versions = await storage.listPromptVersions(existing.id);
      const nextVersion = versions.length + 1;
      await storage.createPromptVersion({
        blockId: existing.id,
        content: existing.content,
        version: nextVersion,
        changedBy: userId,
        changeNote: changeNote || "",
      });
    }

    // Build update payload from allowed fields only
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (category !== undefined) update.category = category;
    if (content !== undefined) update.content = content;
    if (description !== undefined) update.description = description;
    if (isActive !== undefined) update.isActive = isActive;
    if (sortOrder !== undefined) update.sortOrder = sortOrder;

    const row = await storage.updatePromptBlock(param(req, "id"), update);
    if (!row) return res.status(404).json({ message: "Not found" });
    audit(req, "update", "prompt_block", param(req, "id"));
    res.json(row);
  });

  app.delete("/api/admin/prompt-blocks/:id", isAuthenticated, requirePermission("admin.prompts.manage"), async (req, res) => {
    const existing = await storage.getPromptBlock(param(req, "id"));
    if (!existing) return res.status(404).json({ message: "Not found" });
    await storage.deletePromptBlock(param(req, "id"));
    audit(req, "delete", "prompt_block", param(req, "id"));
    res.status(204).end();
  });

  // === PROMPT VERSIONS (admin only, read) ===
  app.get("/api/admin/prompt-blocks/:blockId/versions", isAuthenticated, requirePermission("admin.prompts.manage"), async (req, res) => {
    const rows = await storage.listPromptVersions(param(req, "blockId"));
    res.json(rows);
  });

  // === PROMPT LOCATIONS (admin only) ===
  app.get("/api/admin/prompt-locations/:locationKey", isAuthenticated, requirePermission("admin.prompts.manage"), async (req, res) => {
    const rows = await storage.listPromptLocations(param(req, "locationKey"));
    res.json(rows);
  });

  app.post("/api/admin/prompt-locations", isAuthenticated, requirePermission("admin.prompts.manage"), async (req, res) => {
    const { locationKey, blockId, sortOrder, isActive } = req.body;
    if (typeof locationKey !== "string" || !locationKey.trim()) return res.status(400).json({ message: "locationKey is required" });
    if (typeof blockId !== "string" || !blockId.trim()) return res.status(400).json({ message: "blockId is required" });
    const row = await storage.createPromptLocation({
      locationKey,
      blockId,
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? true,
    });
    audit(req, "create", "prompt_location", row.id);
    res.status(201).json(row);
  });

  app.patch("/api/admin/prompt-locations/:id", isAuthenticated, requirePermission("admin.prompts.manage"), async (req, res) => {
    const { sortOrder, isActive } = req.body;
    const update: Record<string, unknown> = {};
    if (sortOrder !== undefined) update.sortOrder = sortOrder;
    if (isActive !== undefined) update.isActive = isActive;

    const row = await storage.updatePromptLocation(param(req, "id"), update);
    if (!row) return res.status(404).json({ message: "Not found" });
    audit(req, "update", "prompt_location", param(req, "id"));
    res.json(row);
  });

  app.delete("/api/admin/prompt-locations/:id", isAuthenticated, requirePermission("admin.prompts.manage"), async (req, res) => {
    const deleted = await storage.deletePromptLocation(param(req, "id"));
    if (!deleted) return res.status(404).json({ message: "Not found" });
    audit(req, "delete", "prompt_location", param(req, "id"));
    res.status(204).end();
  });

  app.put("/api/admin/prompt-locations/:locationKey/reorder", isAuthenticated, requirePermission("admin.prompts.manage"), async (req, res) => {
    const locationKey = param(req, "locationKey");
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.every((id: unknown) => typeof id === "string")) {
      return res.status(400).json({ message: "ids must be an array of strings" });
    }
    await storage.reorderPromptLocations(locationKey, ids);
    audit(req, "update", "prompt_locations", undefined, { action: "reorder", locationKey });
    res.status(204).end();
  });

  // === PROMPT PREVIEW (admin only) ===
  app.get("/api/admin/prompt-preview/:locationKey", isAuthenticated, requirePermission("admin.prompts.manage"), async (req, res) => {
    const locationKey = param(req, "locationKey");
    const providerName = (req.query.provider as string) || "anthropic";

    const coreQuery = await storage.getCoreQuery(locationKey);
    const fallbackPrompt = coreQuery?.contextQuery || "";

    const aiMessages = await assemblePrompt({
      locationKey,
      conversationHistory: [],
      providerName,
      fallbackPrompt,
    });

    const systemMessage = aiMessages.find((m) => m.role === "system");
    res.json({
      systemMessage: systemMessage?.content || "",
      provider: providerName,
      tokenEstimate: Math.ceil((systemMessage?.content || "").length / 4),
    });
  });

  // === ROLES MANAGEMENT (admin only) ===
  app.get("/api/admin/roles", isAuthenticated, requirePermission("admin.roles.view"), async (_req, res) => {
    const allRoles = await rbacStorage.listRoles();
    const enriched = await Promise.all(allRoles.map(async (role) => {
      const perms = await rbacStorage.listRolePermissions(role.id);
      return { ...role, permissions: perms };
    }));
    res.json(enriched);
  });

  app.get("/api/admin/roles/:id", isAuthenticated, requirePermission("admin.roles.view"), async (req, res) => {
    const role = await rbacStorage.getRoleById(param(req, "id"));
    if (!role) return res.status(404).json({ message: "Role not found" });
    const perms = await rbacStorage.listRolePermissions(role.id);
    res.json({ ...role, permissions: perms });
  });

  app.post("/api/admin/roles", isAuthenticated, requirePermission("admin.roles.manage"), async (req, res) => {
    const { name, description, type } = req.body;
    if (typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "name is required" });
    if (type !== "system" && type !== "project") return res.status(400).json({ message: "type must be 'system' or 'project'" });
    const existing = await rbacStorage.getRoleByName(name.trim());
    if (existing) return res.status(409).json({ message: "A role with that name already exists" });
    const role = await rbacStorage.createRole({ name: name.trim(), description: description || "", type });
    audit(req, "create", "role", role.id, { name: role.name });
    res.status(201).json(role);
  });

  app.patch("/api/admin/roles/:id", isAuthenticated, requirePermission("admin.roles.manage"), async (req, res) => {
    const role = await rbacStorage.getRoleById(param(req, "id"));
    if (!role) return res.status(404).json({ message: "Role not found" });
    if (role.isBuiltIn) return res.status(400).json({ message: "Cannot modify built-in roles" });
    const { name, description } = req.body;
    const updated = await rbacStorage.updateRole(param(req, "id"), {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
    });
    audit(req, "update", "role", param(req, "id"));
    res.json(updated);
  });

  app.delete("/api/admin/roles/:id", isAuthenticated, requirePermission("admin.roles.manage"), async (req, res) => {
    const roleId = param(req, "id");
    const role = await rbacStorage.getRoleById(roleId);
    if (!role) return res.status(404).json({ message: "Role not found" });
    if (role.isBuiltIn) return res.status(400).json({ message: "Cannot delete built-in roles" });
    // Block deletion if role has active assignments (would cascade-delete them)
    const assignmentCount = await rbacStorage.getRoleAssignmentCount(roleId);
    if (assignmentCount > 0) {
      return res.status(400).json({ message: `Cannot delete role with ${assignmentCount} active assignment(s). Reassign users first.` });
    }
    await rbacStorage.deleteRole(roleId);
    audit(req, "delete", "role", roleId);
    res.status(204).end();
  });

  app.put("/api/admin/roles/:id/permissions", isAuthenticated, requirePermission("admin.roles.manage"), async (req, res) => {
    const role = await rbacStorage.getRoleById(param(req, "id"));
    if (!role) return res.status(404).json({ message: "Role not found" });
    if (role.isBuiltIn) return res.status(400).json({ message: "Cannot modify built-in role permissions" });
    const { permissionIds } = req.body;
    if (!Array.isArray(permissionIds) || !permissionIds.every((id: unknown) => typeof id === "string")) {
      return res.status(400).json({ message: "permissionIds must be an array of strings" });
    }
    await rbacStorage.setRolePermissions(param(req, "id"), permissionIds);
    audit(req, "update", "role_permissions", param(req, "id"));
    res.json({ success: true });
  });

  app.get("/api/admin/permissions", isAuthenticated, requirePermission("admin.roles.view"), async (_req, res) => {
    const allPerms = await rbacStorage.listPermissions();
    res.json(allPerms);
  });

  // === AUDIT LOG (admin only) ===
  app.get("/api/admin/audit-log", isAuthenticated, requirePermission("admin.audit.view"), async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (req.query.actorId) {
      conditions.push(eq(auditLog.actorId, req.query.actorId as string));
    }
    if (req.query.action) {
      conditions.push(eq(auditLog.action, req.query.action as string));
    }
    if (req.query.resourceType) {
      conditions.push(eq(auditLog.resourceType, req.query.resourceType as string));
    }
    if (req.query.startDate) {
      const d = new Date(req.query.startDate as string);
      if (isNaN(d.getTime())) return res.status(400).json({ message: "Invalid startDate" });
      conditions.push(gte(auditLog.createdAt, d));
    }
    if (req.query.endDate) {
      const d = new Date(req.query.endDate as string);
      if (isNaN(d.getTime())) return res.status(400).json({ message: "Invalid endDate" });
      conditions.push(lte(auditLog.createdAt, d));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLog)
      .where(whereClause);

    const rows = await db
      .select()
      .from(auditLog)
      .where(whereClause)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);

    // Enrich with actor info (batch query)
    const actorIds = Array.from(new Set(rows.filter((r) => r.actorId).map((r) => r.actorId!)));
    const actorMap = new Map<string, { email: string | null; firstName: string | null; lastName: string | null }>();
    if (actorIds.length > 0) {
      const actorRows = await db.select().from(users).where(inArray(users.id, actorIds));
      for (const u of actorRows) {
        actorMap.set(u.id, { email: u.email, firstName: u.firstName, lastName: u.lastName });
      }
    }

    const enrichedRows = rows.map((row) => ({
      ...row,
      actor: row.actorId ? actorMap.get(row.actorId) || null : null,
    }));

    res.json({
      entries: enrichedRows,
      total: Number(countResult.count),
      page,
      limit,
      totalPages: Math.ceil(Number(countResult.count) / limit),
    });
  });

  return httpServer;
}
