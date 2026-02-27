import type { Express, Request, Response, RequestHandler } from "express";
import { type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { seedDemoData } from "./seed";
import { isAuthenticated, isAdmin, authStorage } from "./auth";
import { db } from "./db";
import { users, projects } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
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
  return req.userId!;
}

function param(req: Request, key: string): string {
  return req.params[key] as string;
}

async function verifyProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const project = await storage.getProject(projectId);
  return !!project && project.userId === userId;
}

async function getProjectIdForChatParent(parentId: string, parentType: string): Promise<string | undefined> {
  switch (parentType) {
    case "dashboard_page":
    case "brief_page":
    case "discovery_page":
    case "deliverable_page": {
      const project = await storage.getProject(parentId);
      return project?.id;
    }
    case "brief_section":
      return storage.getProjectIdForBrief(parentId);
    case "discovery_category":
      return storage.getProjectIdForDiscoveryCategory(parentId);
    case "deliverable_asset":
      return storage.getProjectIdForDeliverable(parentId);
    default:
      return undefined;
  }
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
    res.json(user);
  });

  // === GET CURRENT USER ===
  app.get("/api/auth/user", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const user = await authStorage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  // === PROJECTS ===
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    let rows = await storage.listProjects(userId);
    if (rows.length === 0) {
      await seedDemoData(userId);
      rows = await storage.listProjects(userId);
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
    if (!await verifyProjectOwnership(param(req, "id"), userId)) return res.status(404).json({ message: "Not found" });
    const project = await storage.getProject(param(req, "id"));
    if (!project?.archivedAt) return res.status(400).json({ message: "Project is not archived" });
    const restored = await storage.restoreProject(param(req, "id"));
    if (!restored) return res.status(404).json({ message: "Not found" });
    res.json(restored);
  });

  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const row = await storage.getProject(param(req, "id"));
    if (!row || row.userId !== userId) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  app.post("/api/projects", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const row = await storage.createProject({ ...req.body, userId });
    res.status(201).json(row);
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await verifyProjectOwnership(param(req, "id"), userId)) return res.status(404).json({ message: "Not found" });
    const row = await storage.updateProject(param(req, "id"), req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await verifyProjectOwnership(param(req, "id"), userId)) return res.status(404).json({ message: "Not found" });
    await storage.deleteProject(param(req, "id"));
    res.status(204).end();
  });

  // === BRIEF SECTIONS ===
  app.get("/api/projects/:projectId/brief", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await verifyProjectOwnership(param(req, "projectId"), userId)) return res.status(404).json({ message: "Not found" });
    const rows = await storage.listBriefSections(param(req, "projectId"));
    res.json(rows);
  });

  app.post("/api/projects/:projectId/brief", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await verifyProjectOwnership(param(req, "projectId"), userId)) return res.status(404).json({ message: "Not found" });
    const row = await storage.createBriefSection({ ...req.body, projectId: param(req, "projectId") });
    res.status(201).json(row);
  });

  app.patch("/api/brief/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForBrief(param(req, "id"));
    if (!projectId || !await verifyProjectOwnership(projectId, userId)) return res.status(404).json({ message: "Not found" });
    const row = await storage.updateBriefSection(param(req, "id"), req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  app.delete("/api/brief/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForBrief(param(req, "id"));
    if (!projectId || !await verifyProjectOwnership(projectId, userId)) return res.status(404).json({ message: "Not found" });
    await storage.deleteBriefSection(param(req, "id"));
    res.status(204).end();
  });

  app.put("/api/projects/:projectId/brief/reorder", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await verifyProjectOwnership(param(req, "projectId"), userId)) return res.status(404).json({ message: "Not found" });
    await storage.reorderBriefSections(param(req, "projectId"), req.body.ids);
    res.status(204).end();
  });

  // === DISCOVERY CATEGORIES ===
  app.get("/api/projects/:projectId/discovery", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await verifyProjectOwnership(param(req, "projectId"), userId)) return res.status(404).json({ message: "Not found" });
    const rows = await storage.listDiscoveryCategories(param(req, "projectId"));
    res.json(rows);
  });

  app.post("/api/projects/:projectId/discovery", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await verifyProjectOwnership(param(req, "projectId"), userId)) return res.status(404).json({ message: "Not found" });
    const row = await storage.createDiscoveryCategory({ ...req.body, projectId: param(req, "projectId") });
    res.status(201).json(row);
  });

  app.patch("/api/discovery/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForDiscoveryCategory(param(req, "id"));
    if (!projectId || !await verifyProjectOwnership(projectId, userId)) return res.status(404).json({ message: "Not found" });
    const row = await storage.updateDiscoveryCategory(param(req, "id"), req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  app.delete("/api/discovery/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForDiscoveryCategory(param(req, "id"));
    if (!projectId || !await verifyProjectOwnership(projectId, userId)) return res.status(404).json({ message: "Not found" });
    await storage.deleteDiscoveryCategory(param(req, "id"));
    res.status(204).end();
  });

  app.put("/api/projects/:projectId/discovery/reorder", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await verifyProjectOwnership(param(req, "projectId"), userId)) return res.status(404).json({ message: "Not found" });
    await storage.reorderDiscoveryCategories(param(req, "projectId"), req.body.ids);
    res.status(204).end();
  });

  // === DELIVERABLES ===
  app.get("/api/projects/:projectId/deliverables", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await verifyProjectOwnership(param(req, "projectId"), userId)) return res.status(404).json({ message: "Not found" });
    const rows = await storage.listDeliverables(param(req, "projectId"));
    res.json(rows);
  });

  app.post("/api/projects/:projectId/deliverables", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await verifyProjectOwnership(param(req, "projectId"), userId)) return res.status(404).json({ message: "Not found" });
    const row = await storage.createDeliverable({ ...req.body, projectId: param(req, "projectId") });
    res.status(201).json(row);
  });

  app.patch("/api/deliverables/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForDeliverable(param(req, "id"));
    if (!projectId || !await verifyProjectOwnership(projectId, userId)) return res.status(404).json({ message: "Not found" });
    const row = await storage.updateDeliverable(param(req, "id"), req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  app.delete("/api/deliverables/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForDeliverable(param(req, "id"));
    if (!projectId || !await verifyProjectOwnership(projectId, userId)) return res.status(404).json({ message: "Not found" });
    await storage.deleteDeliverable(param(req, "id"));
    res.status(204).end();
  });

  app.put("/api/projects/:projectId/deliverables/reorder", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!await verifyProjectOwnership(param(req, "projectId"), userId)) return res.status(404).json({ message: "Not found" });
    await storage.reorderDeliverables(param(req, "projectId"), req.body.ids);
    res.status(204).end();
  });

  // === BUCKET ITEMS ===
  app.get("/api/items/:parentType/:parentId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForParent(param(req, "parentId"), param(req, "parentType"));
    if (!projectId || !await verifyProjectOwnership(projectId, userId)) return res.status(404).json({ message: "Not found" });
    const rows = await storage.listBucketItems(param(req, "parentId"), param(req, "parentType"));
    res.json(rows);
  });

  app.post("/api/items", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForParent(req.body.parentId, req.body.parentType);
    if (!projectId || !await verifyProjectOwnership(projectId, userId)) return res.status(404).json({ message: "Not found" });
    const row = await storage.createBucketItem(req.body);
    res.status(201).json(row);
  });

  app.delete("/api/items/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const item = await storage.getBucketItem(param(req, "id"));
    if (!item) return res.status(404).json({ message: "Not found" });
    const projectId = await storage.getProjectIdForParent(item.parentId, item.parentType);
    if (!projectId || !await verifyProjectOwnership(projectId, userId)) return res.status(404).json({ message: "Not found" });
    await storage.deleteBucketItem(param(req, "id"));
    res.status(204).end();
  });

  // === CHAT MESSAGES ===
  app.get("/api/messages/:parentType/:parentId", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForParent(param(req, "parentId"), param(req, "parentType"));
    if (!projectId || !await verifyProjectOwnership(projectId, userId)) return res.status(404).json({ message: "Not found" });
    const rows = await storage.listChatMessages(param(req, "parentId"), param(req, "parentType"));
    res.json(rows);
  });

  app.post("/api/messages", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const projectId = await storage.getProjectIdForParent(req.body.parentId, req.body.parentType);
    if (!projectId || !await verifyProjectOwnership(projectId, userId)) return res.status(404).json({ message: "Not found" });
    const row = await storage.createChatMessage(req.body);
    res.status(201).json(row);
  });

  app.patch("/api/messages/:id", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const message = await storage.getChatMessage(param(req, "id"));
    if (!message) return res.status(404).json({ message: "Not found" });
    const projectId = await storage.getProjectIdForParent(message.parentId, message.parentType);
    if (!projectId || !await verifyProjectOwnership(projectId, userId)) return res.status(404).json({ message: "Not found" });
    const row = await storage.updateChatMessage(param(req, "id"), req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  // === AI CHAT (SSE streaming) ===
  const chatRequestSchema = z.object({
    parentId: z.string().min(1),
    parentType: z.string().min(1),
    content: z.string().min(1),
  });

  app.post("/api/chat", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parsed.error.flatten().fieldErrors });
    }

    const { parentId, parentType, content } = parsed.data;

    const projectId = await getProjectIdForChatParent(parentId, parentType);
    if (!projectId || !await verifyProjectOwnership(projectId, userId)) {
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
      const errorText = err instanceof Error ? err.message : "AI provider error";

      // Save error as AI message — wrapped so a storage failure can't prevent SSE cleanup
      try {
        const errTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        await storage.createChatMessage({
          parentId,
          parentType,
          role: "ai",
          content: `Sorry, I encountered an error: ${errorText}`,
          timestamp: errTimestamp,
          hasSaveableContent: false,
          saved: false,
        });
      } catch {
        // Storage failed — still send the SSE error event below
      }

      res.write(`data: ${JSON.stringify({ type: "error", message: errorText })}\n\n`);
    }

    res.end();
  });

  // === ADMIN ROUTES ===
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (_req, res) => {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  });

  app.get("/api/admin/projects", isAuthenticated, isAdmin, async (_req, res) => {
    const allProjects = await storage.listAllProjects();
    res.json(allProjects);
  });

  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (_req, res) => {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [projectCount] = await db.select({ count: sql<number>`count(*)` }).from(projects);
    res.json({
      totalUsers: Number(userCount.count),
      totalProjects: Number(projectCount.count),
    });
  });

  app.patch("/api/admin/users/:id/toggle-admin", isAuthenticated, isAdmin, async (req, res) => {
    const targetId = param(req, "id");
    const user = await authStorage.getUser(targetId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const [updated] = await db.update(users).set({ isAdmin: !user.isAdmin }).where(eq(users.id, targetId)).returning();
    res.json(updated);
  });

  app.patch("/api/admin/users/:id/deactivate", isAuthenticated, isAdmin, async (req, res) => {
    const targetId = param(req, "id");
    const currentUserId = getUserId(req);
    if (targetId === currentUserId) return res.status(400).json({ message: "Cannot deactivate yourself" });
    const user = await authStorage.getUser(targetId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const [updated] = await db.update(users).set({ isActive: !user.isActive }).where(eq(users.id, targetId)).returning();
    res.json(updated);
  });

  // === SUPABASE AUTH USERS (admin only) ===
  app.get("/api/admin/auth-users", isAuthenticated, isAdmin, async (_req, res) => {
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

  app.get("/api/admin/core-queries", isAuthenticated, isAdmin, async (_req, res) => {
    const rows = await storage.listCoreQueries();
    res.json(rows);
  });

  app.put("/api/admin/core-queries/:locationKey", isAuthenticated, isAdmin, async (req, res) => {
    const locationKey = param(req, "locationKey");
    const { contextQuery } = req.body;
    if (typeof contextQuery !== "string") return res.status(400).json({ message: "contextQuery is required" });
    const row = await storage.upsertCoreQuery(locationKey, contextQuery);
    res.json(row);
  });

  // === PROMPT BLOCKS (admin only) ===
  app.get("/api/admin/prompt-blocks", isAuthenticated, isAdmin, async (_req, res) => {
    const rows = await storage.listPromptBlocks();
    res.json(rows);
  });

  app.get("/api/admin/prompt-blocks/:id", isAuthenticated, isAdmin, async (req, res) => {
    const row = await storage.getPromptBlock(param(req, "id"));
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  const validCategories = new Set<string>(PROMPT_CATEGORIES);

  app.post("/api/admin/prompt-blocks", isAuthenticated, isAdmin, async (req, res) => {
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
    res.status(201).json(row);
  });

  app.patch("/api/admin/prompt-blocks/:id", isAuthenticated, isAdmin, async (req, res) => {
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
    res.json(row);
  });

  app.delete("/api/admin/prompt-blocks/:id", isAuthenticated, isAdmin, async (req, res) => {
    const existing = await storage.getPromptBlock(param(req, "id"));
    if (!existing) return res.status(404).json({ message: "Not found" });
    await storage.deletePromptBlock(param(req, "id"));
    res.status(204).end();
  });

  // === PROMPT VERSIONS (admin only, read) ===
  app.get("/api/admin/prompt-blocks/:blockId/versions", isAuthenticated, isAdmin, async (req, res) => {
    const rows = await storage.listPromptVersions(param(req, "blockId"));
    res.json(rows);
  });

  // === PROMPT LOCATIONS (admin only) ===
  app.get("/api/admin/prompt-locations/:locationKey", isAuthenticated, isAdmin, async (req, res) => {
    const rows = await storage.listPromptLocations(param(req, "locationKey"));
    res.json(rows);
  });

  app.post("/api/admin/prompt-locations", isAuthenticated, isAdmin, async (req, res) => {
    const { locationKey, blockId, sortOrder, isActive } = req.body;
    if (typeof locationKey !== "string" || !locationKey.trim()) return res.status(400).json({ message: "locationKey is required" });
    if (typeof blockId !== "string" || !blockId.trim()) return res.status(400).json({ message: "blockId is required" });
    const row = await storage.createPromptLocation({
      locationKey,
      blockId,
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? true,
    });
    res.status(201).json(row);
  });

  app.patch("/api/admin/prompt-locations/:id", isAuthenticated, isAdmin, async (req, res) => {
    const { sortOrder, isActive } = req.body;
    const update: Record<string, unknown> = {};
    if (sortOrder !== undefined) update.sortOrder = sortOrder;
    if (isActive !== undefined) update.isActive = isActive;

    const row = await storage.updatePromptLocation(param(req, "id"), update);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  app.delete("/api/admin/prompt-locations/:id", isAuthenticated, isAdmin, async (req, res) => {
    await storage.deletePromptLocation(param(req, "id"));
    res.status(204).end();
  });

  app.put("/api/admin/prompt-locations/:locationKey/reorder", isAuthenticated, isAdmin, async (req, res) => {
    const locationKey = param(req, "locationKey");
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ message: "ids array is required" });
    await storage.reorderPromptLocations(locationKey, ids);
    res.status(204).end();
  });

  // === PROMPT PREVIEW (admin only) ===
  app.get("/api/admin/prompt-preview/:locationKey", isAuthenticated, isAdmin, async (req, res) => {
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

  return httpServer;
}
