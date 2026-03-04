import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";
import { rbacStorage } from "./rbac-storage";
import { log } from "../index";

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Use advisory lock to prevent TOCTOU race on first-user check
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(42)`);

      const [countResult] = await tx.select({ count: sql<number>`count(*)` }).from(users);
      const isFirstUser = Number(countResult.count) === 0;

      const [user] = await tx
        .insert(users)
        .values({
          ...userData,
          isAdmin: isFirstUser ? true : undefined,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          },
        })
        .returning();

      return { user, isFirstUser };
    });

    // Assign RBAC roles outside transaction (idempotent via onConflictDoNothing)
    try {
      const memberRole = await rbacStorage.getRoleByName("member");
      if (memberRole) {
        await rbacStorage.assignUserRole(result.user.id, memberRole.id);
      }
      if (result.isFirstUser) {
        const superAdminRole = await rbacStorage.getRoleByName("super_admin");
        if (superAdminRole) {
          await rbacStorage.assignUserRole(result.user.id, superAdminRole.id);
        }
      }
    } catch (err) {
      log(`RBAC role assignment failed for user ${result.user.id}: ${(err as Error).message}`, "auth");
    }

    return result.user;
  }
}

export const authStorage = new AuthStorage();
