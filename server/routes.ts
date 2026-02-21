import type { Express, Request, Response, RequestHandler } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { seedDemoData } from "./seed";
import { isAuthenticated, authStorage } from "./replit_integrations/auth";
import { db } from "./db";
import { users, projects } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

function getUserId(req: Request): string {
  return (req as any).user?.claims?.sub;
}

function param(req: Request, key: string): string {
  return req.params[key] as string;
}

async function verifyProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const project = await storage.getProject(projectId);
  return !!project && project.userId === userId;
}

const isAdmin: RequestHandler = async (req, res, next) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const user = await authStorage.getUser(userId);
  if (!user?.isAdmin) return res.status(403).json({ message: "Forbidden" });
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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
    const rows = await storage.listBucketItems(param(req, "parentId"), param(req, "parentType"));
    res.json(rows);
  });

  app.post("/api/items", isAuthenticated, async (req, res) => {
    const row = await storage.createBucketItem(req.body);
    res.status(201).json(row);
  });

  app.delete("/api/items/:id", isAuthenticated, async (req, res) => {
    await storage.deleteBucketItem(param(req, "id"));
    res.status(204).end();
  });

  // === CHAT MESSAGES ===
  app.get("/api/messages/:parentType/:parentId", isAuthenticated, async (req, res) => {
    const rows = await storage.listChatMessages(param(req, "parentId"), param(req, "parentType"));
    res.json(rows);
  });

  app.post("/api/messages", isAuthenticated, async (req, res) => {
    const row = await storage.createChatMessage(req.body);
    res.status(201).json(row);
  });

  app.patch("/api/messages/:id", isAuthenticated, async (req, res) => {
    const row = await storage.updateChatMessage(param(req, "id"), req.body);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
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
    res.json({ message: "User deactivated", userId: targetId });
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

  return httpServer;
}
