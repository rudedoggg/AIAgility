import { db } from "../db";
import { users, roles, userRoles, projects, projectMembers } from "@shared/schema";
import { sql } from "drizzle-orm";
import { log } from "../index";

export async function migrateExistingData(): Promise<void> {
  const allRoles = await db.select().from(roles);
  const roleByName = new Map(allRoles.map((r) => [r.name, r]));
  const superAdminRole = roleByName.get("super_admin");
  const memberRole = roleByName.get("member");
  const ownerRole = roleByName.get("owner");

  if (!superAdminRole || !memberRole || !ownerRole) {
    log("RBAC migration skipped — roles not seeded yet", "rbac");
    return;
  }

  // Migrate users → user_roles (idempotent via onConflictDoNothing)
  const [existingUserRoles] = await db.select({ count: sql<number>`count(*)` }).from(userRoles);
  if (Number(existingUserRoles.count) === 0) {
    const allUsers = await db.select().from(users);
    let usersMigrated = 0;
    for (const user of allUsers) {
      await db.insert(userRoles)
        .values({ userId: user.id, roleId: memberRole.id })
        .onConflictDoNothing();
      if (user.isAdmin) {
        await db.insert(userRoles)
          .values({ userId: user.id, roleId: superAdminRole.id })
          .onConflictDoNothing();
      }
      usersMigrated++;
    }
    log(`RBAC migration: ${usersMigrated} users migrated to roles`, "rbac");
  }

  // Migrate projects → project_members (idempotent via onConflictDoNothing)
  const [existingMembers] = await db.select({ count: sql<number>`count(*)` }).from(projectMembers);
  if (Number(existingMembers.count) === 0) {
    const allProjects = await db.select().from(projects);
    let projectsMigrated = 0;
    for (const project of allProjects) {
      if (!project.userId) continue;
      await db.insert(projectMembers)
        .values({ projectId: project.id, userId: project.userId, roleId: ownerRole.id })
        .onConflictDoNothing();
      projectsMigrated++;
    }
    log(`RBAC migration: ${projectsMigrated} projects migrated to members`, "rbac");
  }
}
