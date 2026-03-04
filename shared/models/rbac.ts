import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === ROLES ===
export const roles = pgTable("roles", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description").notNull().default(""),
  type: varchar("type", { length: 20 }).notNull(), // 'system' | 'project'
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === PERMISSIONS ===
export const permissions = pgTable("permissions", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  description: text("description").notNull().default(""),
  category: varchar("category", { length: 50 }).notNull(), // 'admin' | 'project'
});

// === ROLE_PERMISSIONS (junction) ===
export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id", { length: 64 }).notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: varchar("permission_id", { length: 64 }).notNull().references(() => permissions.id, { onDelete: "cascade" }),
}, (table) => [
  uniqueIndex("role_permissions_role_perm_idx").on(table.roleId, table.permissionId),
]);

// === USER_ROLES (system roles assigned to users) ===
export const userRoles = pgTable("user_roles", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull(),
  roleId: varchar("role_id", { length: 64 }).notNull().references(() => roles.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_roles_user_role_idx").on(table.userId, table.roleId),
  index("user_roles_user_id_idx").on(table.userId),
]);

// === AUDIT LOG ===
export const auditLog = pgTable("audit_log", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id", { length: 255 }),
  action: varchar("action", { length: 50 }).notNull(), // 'create' | 'update' | 'delete'
  resourceType: varchar("resource_type", { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 255 }),
  changes: jsonb("changes"),
  ip: varchar("ip", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("audit_log_actor_id_idx").on(table.actorId),
  index("audit_log_resource_type_idx").on(table.resourceType),
  index("audit_log_created_at_idx").on(table.createdAt),
]);

// === Zod Schemas ===
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true });
export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true });
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ id: true });
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true, assignedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true, createdAt: true });

// === Types ===
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLogEntry = z.infer<typeof insertAuditLogSchema>;
