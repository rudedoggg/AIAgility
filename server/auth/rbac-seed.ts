import { db } from "../db";
import { roles, permissions, rolePermissions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { log } from "../index";

const SYSTEM_ROLES = [
  { name: "super_admin", description: "Full system access", type: "system" as const, isBuiltIn: true, isDefault: false },
  { name: "admin", description: "Admin panel access", type: "system" as const, isBuiltIn: true, isDefault: false },
  { name: "member", description: "Standard user", type: "system" as const, isBuiltIn: true, isDefault: true },
];

const PROJECT_ROLES = [
  { name: "owner", description: "Full project control", type: "project" as const, isBuiltIn: true, isDefault: false },
  { name: "editor", description: "Can edit project content", type: "project" as const, isBuiltIn: true, isDefault: false },
  { name: "viewer", description: "Read-only project access", type: "project" as const, isBuiltIn: true, isDefault: true },
];

const SYSTEM_PERMISSIONS = [
  { key: "admin.users.manage", description: "View and manage users", category: "admin" },
  { key: "admin.users.roles", description: "Assign system roles", category: "admin" },
  { key: "admin.projects.view", description: "View all projects", category: "admin" },
  { key: "admin.stats.view", description: "View admin statistics", category: "admin" },
  { key: "admin.prompts.manage", description: "Manage prompt blocks and locations", category: "admin" },
  { key: "admin.core-queries.manage", description: "Manage core queries", category: "admin" },
  { key: "admin.auth-users.view", description: "View Supabase auth users", category: "admin" },
  { key: "admin.audit.view", description: "View audit log", category: "admin" },
  { key: "admin.roles.view", description: "View roles and permissions", category: "admin" },
  { key: "admin.roles.manage", description: "Create and edit roles", category: "admin" },
];

const PROJECT_PERMISSIONS = [
  { key: "project.view", description: "View project", category: "project" },
  { key: "project.edit", description: "Edit project settings", category: "project" },
  { key: "project.delete", description: "Delete project", category: "project" },
  { key: "project.members.manage", description: "Manage project members", category: "project" },
  { key: "project.brief.edit", description: "Edit brief sections", category: "project" },
  { key: "project.discovery.edit", description: "Edit discovery categories", category: "project" },
  { key: "project.deliverables.edit", description: "Edit deliverables", category: "project" },
  { key: "project.chat.use", description: "Use AI chat", category: "project" },
];

// Role → permission key mappings
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  // super_admin gets wildcard — handled via '*' in permission check logic
  super_admin: ["*"],
  admin: [
    "admin.users.manage", "admin.users.roles", "admin.projects.view",
    "admin.stats.view", "admin.prompts.manage", "admin.core-queries.manage",
    "admin.auth-users.view", "admin.audit.view", "admin.roles.view", "admin.roles.manage",
  ],
  // member has no system permissions
  member: [],
  owner: [
    "project.view", "project.edit", "project.delete", "project.members.manage",
    "project.brief.edit", "project.discovery.edit", "project.deliverables.edit", "project.chat.use",
  ],
  editor: [
    "project.view", "project.edit", "project.brief.edit",
    "project.discovery.edit", "project.deliverables.edit", "project.chat.use",
  ],
  viewer: ["project.view"],
};

/**
 * Seeds default RBAC roles and permissions. Uses onConflictDoNothing for idempotency,
 * which means changes to descriptions or permission mappings here will NOT update
 * existing records. To modify existing defaults, use a separate migration.
 */
export async function seedRbacDefaults(): Promise<void> {
  const allRoles = [...SYSTEM_ROLES, ...PROJECT_ROLES];
  const allPermissions = [...SYSTEM_PERMISSIONS, ...PROJECT_PERMISSIONS];

  // Upsert roles
  for (const role of allRoles) {
    await db.insert(roles).values(role).onConflictDoNothing({ target: roles.name });
  }

  // Upsert permissions
  for (const perm of allPermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing({ target: permissions.key });
  }

  // Seed role_permissions (idempotent)
  const allDbRoles = await db.select().from(roles);
  const allDbPerms = await db.select().from(permissions);
  const permByKey = new Map(allDbPerms.map((p) => [p.key, p]));

  for (const role of allDbRoles) {
    const permKeys = ROLE_PERMISSION_MAP[role.name];
    if (!permKeys || permKeys.length === 0 || permKeys[0] === "*") continue;

    for (const key of permKeys) {
      const perm = permByKey.get(key);
      if (!perm) continue;
      await db.insert(rolePermissions)
        .values({ roleId: role.id, permissionId: perm.id })
        .onConflictDoNothing();
    }
  }

  log("RBAC defaults seeded", "rbac");
}
