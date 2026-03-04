import { db } from "../db";
import {
  roles, permissions, rolePermissions, userRoles, projectMembers,
  type Role, type Permission, type ProjectMember,
} from "@shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

class RbacStorage {
  /** Get all system permission keys for a user (joins user_roles → role_permissions → permissions). */
  async getUserSystemPermissions(userId: string): Promise<string[]> {
    // Get user's system roles
    const userRoleRows = await db
      .select({ roleId: userRoles.roleId, roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(userRoles.userId, userId), eq(roles.type, "system")));

    if (userRoleRows.length === 0) return [];

    // super_admin gets wildcard
    if (userRoleRows.some((r) => r.roleName === "super_admin")) {
      return ["*"];
    }

    const roleIds = userRoleRows.map((r) => r.roleId);

    const permRows = await db
      .select({ key: permissions.key })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(inArray(rolePermissions.roleId, roleIds));

    return Array.from(new Set(permRows.map((r) => r.key)));
  }

  /** Get user's role for a specific project. */
  async getUserProjectRole(projectId: string, userId: string): Promise<ProjectMember | undefined> {
    const [row] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
    return row;
  }

  /** Get permission keys for a given role ID. */
  async getRolePermissions(roleId: string): Promise<string[]> {
    const permRows = await db
      .select({ key: permissions.key })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(rolePermissions.roleId, roleId));

    return permRows.map((r) => r.key);
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const [row] = await db.select().from(roles).where(eq(roles.name, name));
    return row;
  }

  async getRoleById(id: string): Promise<Role | undefined> {
    const [row] = await db.select().from(roles).where(eq(roles.id, id));
    return row;
  }

  async getDefaultSystemRole(): Promise<Role | undefined> {
    const [row] = await db.select().from(roles)
      .where(and(eq(roles.type, "system"), eq(roles.isDefault, true)));
    return row;
  }

  async getDefaultProjectRole(): Promise<Role | undefined> {
    const [row] = await db.select().from(roles)
      .where(and(eq(roles.type, "project"), eq(roles.isDefault, true)));
    return row;
  }

  async assignUserRole(userId: string, roleId: string): Promise<void> {
    await db.insert(userRoles)
      .values({ userId, roleId })
      .onConflictDoNothing();
  }

  async removeUserRole(userId: string, roleId: string): Promise<void> {
    await db.delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const rows = await db
      .select({ role: roles })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId));
    return rows.map((r) => r.role);
  }

  async addProjectMember(projectId: string, userId: string, roleId: string): Promise<ProjectMember> {
    const [row] = await db.insert(projectMembers)
      .values({ projectId, userId, roleId })
      .onConflictDoUpdate({
        target: [projectMembers.projectId, projectMembers.userId],
        set: { roleId },
      })
      .returning();
    return row;
  }

  async getProjectsForUser(userId: string): Promise<string[]> {
    const rows = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));
    return rows.map((r) => r.projectId);
  }

  async listRoles(): Promise<Role[]> {
    return db.select().from(roles);
  }

  async listPermissions(): Promise<Permission[]> {
    return db.select().from(permissions);
  }

  async listRolePermissions(roleId: string): Promise<Permission[]> {
    const rows = await db
      .select({ permission: permissions })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(rolePermissions.roleId, roleId));
    return rows.map((r) => r.permission);
  }

  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
      if (permissionIds.length > 0) {
        await tx.insert(rolePermissions)
          .values(permissionIds.map((permissionId) => ({ roleId, permissionId })))
          .onConflictDoNothing();
      }
    });
  }

  async createRole(data: { name: string; description: string; type: "system" | "project" }): Promise<Role> {
    const [row] = await db.insert(roles)
      .values({ ...data, isBuiltIn: false, isDefault: false })
      .returning();
    return row;
  }

  async updateRole(id: string, data: { name?: string; description?: string }): Promise<Role | undefined> {
    const [row] = await db.update(roles).set(data).where(eq(roles.id, id)).returning();
    return row;
  }

  async getRoleAssignmentCount(roleId: string): Promise<number> {
    const [ur] = await db.select({ count: sql<number>`count(*)` }).from(userRoles).where(eq(userRoles.roleId, roleId));
    const [pm] = await db.select({ count: sql<number>`count(*)` }).from(projectMembers).where(eq(projectMembers.roleId, roleId));
    return Number(ur.count) + Number(pm.count);
  }

  async deleteRole(id: string): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  /** Set a user's primary system role (removes old system roles, assigns new one + member). */
  async setUserSystemRole(userId: string, roleId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Remove all existing system roles for this user
      const existingSystemRoleIds = await tx
        .select({ urId: userRoles.id })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(and(eq(userRoles.userId, userId), eq(roles.type, "system")));

      for (const row of existingSystemRoleIds) {
        await tx.delete(userRoles).where(eq(userRoles.id, row.urId));
      }

      // Assign the new role
      await tx.insert(userRoles).values({ userId, roleId }).onConflictDoNothing();

      // Ensure member role is always present (unless the new role IS member)
      const [memberRole] = await tx.select().from(roles)
        .where(and(eq(roles.name, "member"), eq(roles.type, "system")));
      if (memberRole && memberRole.id !== roleId) {
        await tx.insert(userRoles).values({ userId, roleId: memberRole.id }).onConflictDoNothing();
      }
    });
  }
}

export const rbacStorage = new RbacStorage();
