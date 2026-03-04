import type { Request } from "express";
import { db } from "../db";
import { auditLog } from "@shared/schema";
import { log } from "../index";

/**
 * Fire-and-forget audit log writer.
 * Never blocks the response, never throws.
 */
export function audit(
  req: Request,
  action: string,
  resourceType: string,
  resourceId?: string,
  changes?: Record<string, unknown>,
): void {
  const actorId = req.userId || null;
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || req.socket.remoteAddress
    || null;

  db.insert(auditLog)
    .values({
      actorId,
      action,
      resourceType,
      resourceId: resourceId || null,
      changes: changes || null,
      ip,
    })
    .then(() => {})
    .catch((err) => {
      log(`Audit log write failed: ${(err as Error).message}`, "audit");
    });
}
