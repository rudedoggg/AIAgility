import type { Request, RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { authStorage } from "./storage";
import { rbacStorage } from "./rbac-storage";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      _systemPermissions?: string[];
      _projectPermissions?: Map<string, string[]>;
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL must be set");
}

const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${SUPABASE_URL}/auth/v1`,
    });
    if (!payload.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.userId = payload.sub;

    const user = await authStorage.getUser(payload.sub);
    if (user && user.isActive === false) {
      return res.status(403).json({ message: "Account deactivated" });
    }

    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

/** @deprecated Use requirePermission() instead */
export const isAdmin: RequestHandler = async (req, res, next) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const user = await authStorage.getUser(userId);
  if (!user?.isAdmin) return res.status(403).json({ message: "Forbidden" });
  next();
};

/** Check if a permission key matches against a set of granted permissions (supports wildcards). */
function permissionMatches(required: string, granted: string[]): boolean {
  if (granted.includes("*")) return true;
  if (granted.includes(required)) return true;
  // Check wildcard prefixes: "admin.*" matches "admin.users.manage"
  const parts = required.split(".");
  for (let i = 1; i < parts.length; i++) {
    const wildcard = parts.slice(0, i).join(".") + ".*";
    if (granted.includes(wildcard)) return true;
  }
  return false;
}

/** Load and cache system permissions on the request object. */
async function getSystemPermissions(req: Request): Promise<string[]> {
  if (req._systemPermissions) return req._systemPermissions;
  if (!req.userId) return [];
  req._systemPermissions = await rbacStorage.getUserSystemPermissions(req.userId);
  return req._systemPermissions;
}

/** Load and cache project permissions on the request object. */
async function getProjectPermissions(req: Request, projectId: string): Promise<string[]> {
  if (!req._projectPermissions) {
    req._projectPermissions = new Map();
  }
  const cached = req._projectPermissions.get(projectId);
  if (cached) return cached;
  if (!req.userId) return [];

  const membership = await rbacStorage.getUserProjectRole(projectId, req.userId);
  if (!membership) {
    req._projectPermissions.set(projectId, []);
    return [];
  }

  const perms = await rbacStorage.getRolePermissions(membership.roleId);
  req._projectPermissions.set(projectId, perms);
  return perms;
}

/**
 * Middleware factory: requires the user to have a specific system permission.
 * Replaces `isAdmin` for admin routes.
 */
export function requirePermission(key: string): RequestHandler {
  return async (req, res, next) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const perms = await getSystemPermissions(req);
    if (!permissionMatches(key, perms)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

/**
 * Middleware factory: requires the user to have a specific project permission.
 * Reads projectId from req.params[paramName] (default: "projectId").
 * Falls back to legacy ownership check for backward compat.
 */
export function requireProjectPermission(key: string, paramName = "projectId"): RequestHandler {
  return async (req, res, next) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const projectId = req.params[paramName] as string;
    if (!projectId) return res.status(400).json({ message: "Missing project ID" });

    const allowed = await checkProjectPermission(req, projectId, userId, key);
    if (!allowed) return res.status(404).json({ message: "Not found" });
    next();
  };
}

/**
 * Helper: checks project permission for cases where projectId is resolved from a child resource.
 * Returns true if the user has the required permission via project_members, or is a system super_admin.
 */
export async function checkProjectPermission(
  req: Request,
  projectId: string,
  userId: string,
  key: string,
): Promise<boolean> {
  // Check system-level admin override (super_admin can access all projects)
  const sysPerms = await getSystemPermissions(req);
  if (sysPerms.includes("*")) return true;

  // Check project membership permissions
  const projectPerms = await getProjectPermissions(req, projectId);
  if (permissionMatches(key, projectPerms)) return true;

  return false;
}
