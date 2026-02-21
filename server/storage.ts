import { eq, asc, and } from "drizzle-orm";
import { db } from "./db";
import {
  projects, briefSections, discoveryBuckets, deliverables, bucketItems, chatMessages, coreQueries,
  type InsertProject, type Project,
  type InsertBriefSection, type BriefSection,
  type InsertDiscoveryBucket, type DiscoveryBucket,
  type InsertDeliverable, type Deliverable,
  type InsertBucketItem, type BucketItem,
  type InsertChatMessage, type ChatMessage,
  type CoreQuery,
} from "@shared/schema";

export interface IStorage {
  listProjects(userId?: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
  listAllProjects(): Promise<Project[]>;

  listBriefSections(projectId: string): Promise<BriefSection[]>;
  getBriefSection(id: string): Promise<BriefSection | undefined>;
  createBriefSection(data: InsertBriefSection): Promise<BriefSection>;
  updateBriefSection(id: string, data: Partial<InsertBriefSection>): Promise<BriefSection | undefined>;
  deleteBriefSection(id: string): Promise<void>;
  reorderBriefSections(projectId: string, ids: string[]): Promise<void>;

  listDiscoveryBuckets(projectId: string): Promise<DiscoveryBucket[]>;
  getDiscoveryBucket(id: string): Promise<DiscoveryBucket | undefined>;
  createDiscoveryBucket(data: InsertDiscoveryBucket): Promise<DiscoveryBucket>;
  updateDiscoveryBucket(id: string, data: Partial<InsertDiscoveryBucket>): Promise<DiscoveryBucket | undefined>;
  deleteDiscoveryBucket(id: string): Promise<void>;
  reorderDiscoveryBuckets(projectId: string, ids: string[]): Promise<void>;

  listDeliverables(projectId: string): Promise<Deliverable[]>;
  getDeliverable(id: string): Promise<Deliverable | undefined>;
  createDeliverable(data: InsertDeliverable): Promise<Deliverable>;
  updateDeliverable(id: string, data: Partial<InsertDeliverable>): Promise<Deliverable | undefined>;
  deleteDeliverable(id: string): Promise<void>;
  reorderDeliverables(projectId: string, ids: string[]): Promise<void>;

  listBucketItems(parentId: string, parentType: string): Promise<BucketItem[]>;
  createBucketItem(data: InsertBucketItem): Promise<BucketItem>;
  deleteBucketItem(id: string): Promise<void>;

  listChatMessages(parentId: string, parentType: string): Promise<ChatMessage[]>;
  createChatMessage(data: InsertChatMessage): Promise<ChatMessage>;
  updateChatMessage(id: string, data: Partial<InsertChatMessage>): Promise<ChatMessage | undefined>;

  getProjectIdForBrief(briefId: string): Promise<string | undefined>;
  getProjectIdForDiscoveryBucket(bucketId: string): Promise<string | undefined>;
  getProjectIdForDeliverable(deliverableId: string): Promise<string | undefined>;

  listCoreQueries(): Promise<CoreQuery[]>;
  getCoreQuery(locationKey: string): Promise<CoreQuery | undefined>;
  upsertCoreQuery(locationKey: string, contextQuery: string): Promise<CoreQuery>;
}

export class DatabaseStorage implements IStorage {
  async listProjects(userId?: string): Promise<Project[]> {
    if (userId) {
      return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(asc(projects.createdAt));
    }
    return db.select().from(projects).orderBy(asc(projects.createdAt));
  }

  async listAllProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(asc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [row] = await db.select().from(projects).where(eq(projects.id, id));
    return row;
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
    await db.delete(projects).where(eq(projects.id, id));
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
    for (let i = 0; i < ids.length; i++) {
      await db.update(briefSections).set({ sortOrder: i }).where(and(eq(briefSections.id, ids[i]), eq(briefSections.projectId, projectId)));
    }
  }

  async listDiscoveryBuckets(projectId: string): Promise<DiscoveryBucket[]> {
    return db.select().from(discoveryBuckets).where(eq(discoveryBuckets.projectId, projectId)).orderBy(asc(discoveryBuckets.sortOrder));
  }

  async getDiscoveryBucket(id: string): Promise<DiscoveryBucket | undefined> {
    const [row] = await db.select().from(discoveryBuckets).where(eq(discoveryBuckets.id, id));
    return row;
  }

  async createDiscoveryBucket(data: InsertDiscoveryBucket): Promise<DiscoveryBucket> {
    const [row] = await db.insert(discoveryBuckets).values(data).returning();
    return row;
  }

  async updateDiscoveryBucket(id: string, data: Partial<InsertDiscoveryBucket>): Promise<DiscoveryBucket | undefined> {
    const [row] = await db.update(discoveryBuckets).set(data).where(eq(discoveryBuckets.id, id)).returning();
    return row;
  }

  async deleteDiscoveryBucket(id: string): Promise<void> {
    await db.delete(discoveryBuckets).where(eq(discoveryBuckets.id, id));
  }

  async reorderDiscoveryBuckets(projectId: string, ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i++) {
      await db.update(discoveryBuckets).set({ sortOrder: i }).where(and(eq(discoveryBuckets.id, ids[i]), eq(discoveryBuckets.projectId, projectId)));
    }
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
    for (let i = 0; i < ids.length; i++) {
      await db.update(deliverables).set({ sortOrder: i }).where(and(eq(deliverables.id, ids[i]), eq(deliverables.projectId, projectId)));
    }
  }

  async listBucketItems(parentId: string, parentType: string): Promise<BucketItem[]> {
    return db.select().from(bucketItems)
      .where(and(eq(bucketItems.parentId, parentId), eq(bucketItems.parentType, parentType)))
      .orderBy(asc(bucketItems.sortOrder));
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

  async getProjectIdForDiscoveryBucket(bucketId: string): Promise<string | undefined> {
    const [row] = await db.select({ projectId: discoveryBuckets.projectId }).from(discoveryBuckets).where(eq(discoveryBuckets.id, bucketId));
    return row?.projectId;
  }

  async getProjectIdForDeliverable(deliverableId: string): Promise<string | undefined> {
    const [row] = await db.select({ projectId: deliverables.projectId }).from(deliverables).where(eq(deliverables.id, deliverableId));
    return row?.projectId;
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
}

export const storage = new DatabaseStorage();
