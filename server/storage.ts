import { eq, asc, and, isNull, isNotNull, lt, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  projects, briefSections, discoveryCategories, deliverables, bucketItems, chatMessages, coreQueries,
  promptBlocks, promptVersions, promptLocations,
  type InsertProject, type Project,
  type InsertBriefSection, type BriefSection,
  type InsertDiscoveryCategory, type DiscoveryCategory,
  type InsertDeliverable, type Deliverable,
  type InsertBucketItem, type BucketItem,
  type InsertChatMessage, type ChatMessage,
  type CoreQuery,
  type InsertPromptBlock, type PromptBlock,
  type InsertPromptVersion, type PromptVersion,
  type InsertPromptLocation, type PromptLocation,
  type PromptBlockForLocation,
} from "@shared/schema";

export interface IStorage {
  listProjects(userId?: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByIds(ids: string[]): Promise<Project[]>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
  restoreProject(id: string): Promise<Project | undefined>;
  permanentlyDeleteExpiredProjects(): Promise<number>;
  listArchivedProjects(userId: string): Promise<Project[]>;
  listAllProjects(): Promise<Project[]>;

  listBriefSections(projectId: string): Promise<BriefSection[]>;
  getBriefSection(id: string): Promise<BriefSection | undefined>;
  createBriefSection(data: InsertBriefSection): Promise<BriefSection>;
  updateBriefSection(id: string, data: Partial<InsertBriefSection>): Promise<BriefSection | undefined>;
  deleteBriefSection(id: string): Promise<void>;
  reorderBriefSections(projectId: string, ids: string[]): Promise<void>;

  listDiscoveryCategories(projectId: string): Promise<DiscoveryCategory[]>;
  getDiscoveryCategory(id: string): Promise<DiscoveryCategory | undefined>;
  createDiscoveryCategory(data: InsertDiscoveryCategory): Promise<DiscoveryCategory>;
  updateDiscoveryCategory(id: string, data: Partial<InsertDiscoveryCategory>): Promise<DiscoveryCategory | undefined>;
  deleteDiscoveryCategory(id: string): Promise<void>;
  reorderDiscoveryCategories(projectId: string, ids: string[]): Promise<void>;

  listDeliverables(projectId: string): Promise<Deliverable[]>;
  getDeliverable(id: string): Promise<Deliverable | undefined>;
  createDeliverable(data: InsertDeliverable): Promise<Deliverable>;
  updateDeliverable(id: string, data: Partial<InsertDeliverable>): Promise<Deliverable | undefined>;
  deleteDeliverable(id: string): Promise<void>;
  reorderDeliverables(projectId: string, ids: string[]): Promise<void>;

  listBucketItems(parentId: string, parentType: string): Promise<BucketItem[]>;
  getBucketItem(id: string): Promise<BucketItem | undefined>;
  createBucketItem(data: InsertBucketItem): Promise<BucketItem>;
  deleteBucketItem(id: string): Promise<void>;

  listChatMessages(parentId: string, parentType: string): Promise<ChatMessage[]>;
  getChatMessage(id: string): Promise<ChatMessage | undefined>;
  createChatMessage(data: InsertChatMessage): Promise<ChatMessage>;
  updateChatMessage(id: string, data: Partial<InsertChatMessage>): Promise<ChatMessage | undefined>;

  getProjectIdForBrief(briefId: string): Promise<string | undefined>;
  getProjectIdForDiscoveryCategory(categoryId: string): Promise<string | undefined>;
  getProjectIdForDeliverable(deliverableId: string): Promise<string | undefined>;
  getProjectIdForParent(parentId: string, parentType: string): Promise<string | undefined>;

  listCoreQueries(): Promise<CoreQuery[]>;
  getCoreQuery(locationKey: string): Promise<CoreQuery | undefined>;
  upsertCoreQuery(locationKey: string, contextQuery: string): Promise<CoreQuery>;

  // Prompt blocks
  listPromptBlocks(): Promise<PromptBlock[]>;
  getPromptBlock(id: string): Promise<PromptBlock | undefined>;
  createPromptBlock(data: InsertPromptBlock): Promise<PromptBlock>;
  updatePromptBlock(id: string, data: Partial<InsertPromptBlock>): Promise<PromptBlock | undefined>;
  deletePromptBlock(id: string): Promise<void>;

  // Prompt versions
  listPromptVersions(blockId: string): Promise<PromptVersion[]>;
  createPromptVersion(data: InsertPromptVersion): Promise<PromptVersion>;

  // Prompt locations
  getBlocksForLocation(locationKey: string): Promise<PromptBlockForLocation[]>;
  listPromptLocations(locationKey: string): Promise<PromptLocation[]>;
  createPromptLocation(data: InsertPromptLocation): Promise<PromptLocation>;
  updatePromptLocation(id: string, data: Partial<InsertPromptLocation>): Promise<PromptLocation | undefined>;
  deletePromptLocation(id: string): Promise<boolean>;
  reorderPromptLocations(locationKey: string, ids: string[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async listProjects(userId?: string): Promise<Project[]> {
    if (userId) {
      return db.select().from(projects).where(and(eq(projects.userId, userId), isNull(projects.archivedAt))).orderBy(asc(projects.createdAt));
    }
    return db.select().from(projects).where(isNull(projects.archivedAt)).orderBy(asc(projects.createdAt));
  }

  async listArchivedProjects(userId: string): Promise<Project[]> {
    return db.select().from(projects).where(and(eq(projects.userId, userId), isNotNull(projects.archivedAt))).orderBy(asc(projects.createdAt));
  }

  async listAllProjects(): Promise<Project[]> {
    return db.select().from(projects).where(isNull(projects.archivedAt)).orderBy(asc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [row] = await db.select().from(projects).where(eq(projects.id, id));
    return row;
  }

  async getProjectsByIds(ids: string[]): Promise<Project[]> {
    if (ids.length === 0) return [];
    return db.select().from(projects).where(inArray(projects.id, ids));
  }

  async createProject(data: InsertProject): Promise<Project> {
    const [row] = await db.insert(projects).values(data).returning();
    return row;
  }

  async updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined> {
    const [row] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return row;
  }

  async deleteProject(id: string): Promise<void> {
    await db.update(projects).set({ archivedAt: new Date() }).where(eq(projects.id, id));
  }

  async restoreProject(id: string): Promise<Project | undefined> {
    const [row] = await db.update(projects).set({ archivedAt: null }).where(eq(projects.id, id)).returning();
    return row;
  }

  async permanentlyDeleteExpiredProjects(): Promise<number> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deleted = await db.delete(projects).where(lt(projects.archivedAt, cutoff)).returning();
    return deleted.length;
  }

  async listBriefSections(projectId: string): Promise<BriefSection[]> {
    return db.select().from(briefSections).where(eq(briefSections.projectId, projectId)).orderBy(asc(briefSections.sortOrder));
  }

  async getBriefSection(id: string): Promise<BriefSection | undefined> {
    const [row] = await db.select().from(briefSections).where(eq(briefSections.id, id));
    return row;
  }

  async createBriefSection(data: InsertBriefSection): Promise<BriefSection> {
    const [row] = await db.insert(briefSections).values(data).returning();
    return row;
  }

  async updateBriefSection(id: string, data: Partial<InsertBriefSection>): Promise<BriefSection | undefined> {
    const [row] = await db.update(briefSections).set(data).where(eq(briefSections.id, id)).returning();
    return row;
  }

  async deleteBriefSection(id: string): Promise<void> {
    await db.delete(briefSections).where(eq(briefSections.id, id));
  }

  async reorderBriefSections(projectId: string, ids: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.update(briefSections).set({ sortOrder: i }).where(and(eq(briefSections.id, ids[i]), eq(briefSections.projectId, projectId)));
      }
    });
  }

  async listDiscoveryCategories(projectId: string): Promise<DiscoveryCategory[]> {
    return db.select().from(discoveryCategories).where(eq(discoveryCategories.projectId, projectId)).orderBy(asc(discoveryCategories.sortOrder));
  }

  async getDiscoveryCategory(id: string): Promise<DiscoveryCategory | undefined> {
    const [row] = await db.select().from(discoveryCategories).where(eq(discoveryCategories.id, id));
    return row;
  }

  async createDiscoveryCategory(data: InsertDiscoveryCategory): Promise<DiscoveryCategory> {
    const [row] = await db.insert(discoveryCategories).values(data).returning();
    return row;
  }

  async updateDiscoveryCategory(id: string, data: Partial<InsertDiscoveryCategory>): Promise<DiscoveryCategory | undefined> {
    const [row] = await db.update(discoveryCategories).set(data).where(eq(discoveryCategories.id, id)).returning();
    return row;
  }

  async deleteDiscoveryCategory(id: string): Promise<void> {
    await db.delete(discoveryCategories).where(eq(discoveryCategories.id, id));
  }

  async reorderDiscoveryCategories(projectId: string, ids: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.update(discoveryCategories).set({ sortOrder: i }).where(and(eq(discoveryCategories.id, ids[i]), eq(discoveryCategories.projectId, projectId)));
      }
    });
  }

  async listDeliverables(projectId: string): Promise<Deliverable[]> {
    return db.select().from(deliverables).where(eq(deliverables.projectId, projectId)).orderBy(asc(deliverables.sortOrder));
  }

  async getDeliverable(id: string): Promise<Deliverable | undefined> {
    const [row] = await db.select().from(deliverables).where(eq(deliverables.id, id));
    return row;
  }

  async createDeliverable(data: InsertDeliverable): Promise<Deliverable> {
    const [row] = await db.insert(deliverables).values(data).returning();
    return row;
  }

  async updateDeliverable(id: string, data: Partial<InsertDeliverable>): Promise<Deliverable | undefined> {
    const [row] = await db.update(deliverables).set(data).where(eq(deliverables.id, id)).returning();
    return row;
  }

  async deleteDeliverable(id: string): Promise<void> {
    await db.delete(deliverables).where(eq(deliverables.id, id));
  }

  async reorderDeliverables(projectId: string, ids: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.update(deliverables).set({ sortOrder: i }).where(and(eq(deliverables.id, ids[i]), eq(deliverables.projectId, projectId)));
      }
    });
  }

  async listBucketItems(parentId: string, parentType: string): Promise<BucketItem[]> {
    return db.select().from(bucketItems)
      .where(and(eq(bucketItems.parentId, parentId), eq(bucketItems.parentType, parentType)))
      .orderBy(asc(bucketItems.sortOrder));
  }

  async getBucketItem(id: string): Promise<BucketItem | undefined> {
    const [row] = await db.select().from(bucketItems).where(eq(bucketItems.id, id));
    return row;
  }

  async createBucketItem(data: InsertBucketItem): Promise<BucketItem> {
    const [row] = await db.insert(bucketItems).values(data).returning();
    return row;
  }

  async deleteBucketItem(id: string): Promise<void> {
    await db.delete(bucketItems).where(eq(bucketItems.id, id));
  }

  async listChatMessages(parentId: string, parentType: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages)
      .where(and(eq(chatMessages.parentId, parentId), eq(chatMessages.parentType, parentType)))
      .orderBy(asc(chatMessages.sortOrder));
  }

  async getChatMessage(id: string): Promise<ChatMessage | undefined> {
    const [row] = await db.select().from(chatMessages).where(eq(chatMessages.id, id));
    return row;
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [row] = await db.insert(chatMessages).values(data).returning();
    return row;
  }

  async updateChatMessage(id: string, data: Partial<InsertChatMessage>): Promise<ChatMessage | undefined> {
    const [row] = await db.update(chatMessages).set(data).where(eq(chatMessages.id, id)).returning();
    return row;
  }

  async getProjectIdForBrief(briefId: string): Promise<string | undefined> {
    const [row] = await db.select({ projectId: briefSections.projectId }).from(briefSections).where(eq(briefSections.id, briefId));
    return row?.projectId;
  }

  async getProjectIdForDiscoveryCategory(categoryId: string): Promise<string | undefined> {
    const [row] = await db.select({ projectId: discoveryCategories.projectId }).from(discoveryCategories).where(eq(discoveryCategories.id, categoryId));
    return row?.projectId;
  }

  async getProjectIdForDeliverable(deliverableId: string): Promise<string | undefined> {
    const [row] = await db.select({ projectId: deliverables.projectId }).from(deliverables).where(eq(deliverables.id, deliverableId));
    return row?.projectId;
  }

  async getProjectIdForParent(parentId: string, parentType: string): Promise<string | undefined> {
    switch (parentType) {
      case "dashboard":
      case "dashboard_page":
      case "brief_page":
      case "discovery_page":
      case "deliverables":
      case "deliverable_page": {
        const project = await this.getProject(parentId);
        return project?.id;
      }
      case "brief":
      case "brief_section":
        return this.getProjectIdForBrief(parentId);
      case "discovery":
      case "discovery_category":
        return this.getProjectIdForDiscoveryCategory(parentId);
      case "deliverable":
      case "deliverable_asset":
        return this.getProjectIdForDeliverable(parentId);
      default:
        return undefined;
    }
  }

  async listCoreQueries(): Promise<CoreQuery[]> {
    return db.select().from(coreQueries).orderBy(asc(coreQueries.locationKey));
  }

  async getCoreQuery(locationKey: string): Promise<CoreQuery | undefined> {
    const [row] = await db.select().from(coreQueries).where(eq(coreQueries.locationKey, locationKey));
    return row;
  }

  async upsertCoreQuery(locationKey: string, contextQuery: string): Promise<CoreQuery> {
    const existing = await this.getCoreQuery(locationKey);
    if (existing) {
      const [row] = await db.update(coreQueries)
        .set({ contextQuery, updatedAt: new Date() })
        .where(eq(coreQueries.locationKey, locationKey))
        .returning();
      return row;
    }
    const [row] = await db.insert(coreQueries)
      .values({ locationKey, contextQuery })
      .returning();
    return row;
  }

  // === Prompt Blocks ===

  async listPromptBlocks(): Promise<PromptBlock[]> {
    return db.select().from(promptBlocks).orderBy(asc(promptBlocks.category), asc(promptBlocks.sortOrder));
  }

  async getPromptBlock(id: string): Promise<PromptBlock | undefined> {
    const [row] = await db.select().from(promptBlocks).where(eq(promptBlocks.id, id));
    return row;
  }

  async createPromptBlock(data: InsertPromptBlock): Promise<PromptBlock> {
    const [row] = await db.insert(promptBlocks).values(data).returning();
    return row;
  }

  async updatePromptBlock(id: string, data: Partial<InsertPromptBlock>): Promise<PromptBlock | undefined> {
    const [row] = await db.update(promptBlocks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(promptBlocks.id, id))
      .returning();
    return row;
  }

  async deletePromptBlock(id: string): Promise<void> {
    await db.delete(promptBlocks).where(eq(promptBlocks.id, id));
  }

  // === Prompt Versions ===

  async listPromptVersions(blockId: string): Promise<PromptVersion[]> {
    return db.select().from(promptVersions)
      .where(eq(promptVersions.blockId, blockId))
      .orderBy(asc(promptVersions.version));
  }

  async createPromptVersion(data: InsertPromptVersion): Promise<PromptVersion> {
    const [row] = await db.insert(promptVersions).values(data).returning();
    return row;
  }

  // === Prompt Locations ===

  async getBlocksForLocation(locationKey: string): Promise<PromptBlockForLocation[]> {
    const rows = await db
      .select({
        category: promptBlocks.category,
        content: promptBlocks.content,
        locationSortOrder: promptLocations.sortOrder,
      })
      .from(promptLocations)
      .innerJoin(promptBlocks, eq(promptLocations.blockId, promptBlocks.id))
      .where(
        and(
          eq(promptLocations.locationKey, locationKey),
          eq(promptLocations.isActive, true),
          eq(promptBlocks.isActive, true),
        ),
      )
      .orderBy(asc(promptLocations.sortOrder));
    return rows;
  }

  async listPromptLocations(locationKey: string): Promise<PromptLocation[]> {
    return db.select().from(promptLocations)
      .where(eq(promptLocations.locationKey, locationKey))
      .orderBy(asc(promptLocations.sortOrder));
  }

  async createPromptLocation(data: InsertPromptLocation): Promise<PromptLocation> {
    const [row] = await db.insert(promptLocations).values(data).returning();
    return row;
  }

  async updatePromptLocation(id: string, data: Partial<InsertPromptLocation>): Promise<PromptLocation | undefined> {
    const [row] = await db.update(promptLocations)
      .set(data)
      .where(eq(promptLocations.id, id))
      .returning();
    return row;
  }

  async deletePromptLocation(id: string): Promise<boolean> {
    const rows = await db.delete(promptLocations).where(eq(promptLocations.id, id)).returning();
    return rows.length > 0;
  }

  async reorderPromptLocations(locationKey: string, ids: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.update(promptLocations)
          .set({ sortOrder: i })
          .where(and(eq(promptLocations.id, ids[i]), eq(promptLocations.locationKey, locationKey)));
      }
    });
  }
}

export const storage = new DatabaseStorage();
