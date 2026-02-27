import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";

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
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const isFirstUser = Number(countResult.count) === 0;

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        isAdmin: isFirstUser ? true : undefined,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
