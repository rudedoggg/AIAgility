import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const projects = pgTable("projects", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }),
  name: text("name").notNull(),
  summary: text("summary").notNull().default(""),
  executiveSummary: text("executive_summary").notNull().default(""),
  dashboardStatus: jsonb("dashboard_status").$type<{
    status: string;
    done: string[];
    undone: string[];
    nextSteps: string[];
  }>().notNull().default({ status: "", done: [], undone: [], nextSteps: [] }),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const briefSections = pgTable("brief_sections", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id", { length: 64 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  genericName: text("generic_name").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  completeness: integer("completeness").notNull().default(0),
  totalItems: integer("total_items").notNull().default(0),
  completedItems: integer("completed_items").notNull().default(0),
  content: text("content").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const discoveryCategories = pgTable("discovery_categories", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id", { length: 64 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const deliverables = pgTable("deliverables", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id", { length: 64 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  completeness: integer("completeness").notNull().default(0),
  status: text("status").notNull().default("draft"),
  content: text("content").notNull().default(""),
  engaged: boolean("engaged").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const bucketItems = pgTable("bucket_items", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id", { length: 64 }).notNull(),
  parentType: text("parent_type").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  preview: text("preview").notNull().default(""),
  date: text("date").notNull().default(""),
  url: text("url"),
  fileName: text("file_name"),
  fileSizeLabel: text("file_size_label"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id", { length: 64 }).notNull(),
  parentType: text("parent_type").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  timestamp: text("timestamp").notNull(),
  hasSaveableContent: boolean("has_saveable_content").notNull().default(false),
  saved: boolean("saved").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const coreQueries = pgTable("core_queries", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  locationKey: text("location_key").notNull().unique(),
  contextQuery: text("context_query").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, archivedAt: true });
export const insertBriefSectionSchema = createInsertSchema(briefSections).omit({ id: true });
export const insertDiscoveryCategorySchema = createInsertSchema(discoveryCategories).omit({ id: true });
export const insertDeliverableSchema = createInsertSchema(deliverables).omit({ id: true });
export const insertBucketItemSchema = createInsertSchema(bucketItems).omit({ id: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true });

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertBriefSection = z.infer<typeof insertBriefSectionSchema>;
export type BriefSection = typeof briefSections.$inferSelect;
export type InsertDiscoveryCategory = z.infer<typeof insertDiscoveryCategorySchema>;
export type DiscoveryCategory = typeof discoveryCategories.$inferSelect;
export type InsertDeliverable = z.infer<typeof insertDeliverableSchema>;
export type Deliverable = typeof deliverables.$inferSelect;
export type InsertBucketItem = z.infer<typeof insertBucketItemSchema>;
export type BucketItem = typeof bucketItems.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export const insertCoreQuerySchema = createInsertSchema(coreQueries).omit({ id: true, updatedAt: true });
export type InsertCoreQuery = z.infer<typeof insertCoreQuerySchema>;
export type CoreQuery = typeof coreQueries.$inferSelect;
