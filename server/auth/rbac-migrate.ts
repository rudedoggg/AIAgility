import { db } from "../db";
import { users, roles, userRoles, projects, projectMembers } from "@shared/schema";
import { sql } from "drizzle-orm";
import { log } from "../index";

export async function migrateExistingData(): Promise<void> {
  // Skip if migration already applied (user_roles exist)
  const [existing] = await db.select({ count: sql<number>`count(*)` }).from(userRoles);
  if (Number(existing.count) > 0) {
    log("RBAC migration already applied, skipping", "rbac");
    return;
  }

  const allUsers = await db.select().from(users);
  const allRoles = await db.select().from(roles);

  const roleByName = new Map(allRoles.map((r) => [r.name, r]));
  const superAdminRole = roleByName.get("super_admin");
  const memberRole = roleByName.get("member");
  const ownerRole = roleByName.get("owner");

  if (!superAdminRole || !memberRole || !ownerRole) {
    log("RBAC migration skipped — roles not seeded yet", "rbac");
    return;
  }

  let usersMigrated = 0;
  let projectsMigrated = 0;

  // Migrate users → user_roles
  for (const user of allUsers) {
    // Everyone gets member role
    await db.insert(userRoles)
      .values({ userId: user.id, roleId: memberRole.id })
      .onConflictDoNothing();

    // Admins also get super_admin
    if (user.isAdmin) {
      await db.insert(userRoles)
        .values({ userId: user.id, roleId: superAdminRole.id })
        .onConflictDoNothing();
    }
    usersMigrated++;
  }

  // Migrate projects → project_members (owner)
  const allProjects = await db.select().from(projects);
  for (const project of allProjects) {
    if (!project.userId) continue;
    await db.insert(projectMembers)
      .values({ projectId: project.id, userId: project.userId, roleId: ownerRole.id })
      .onConflictDoNothing();
    projectsMigrated++;
  }

  log(`RBAC migration: ${usersMigrated} users, ${projectsMigrated} projects`, "rbac");
}
