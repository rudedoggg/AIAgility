export { isAuthenticated, requirePermission, requireProjectPermission, checkProjectPermission } from "./middleware";
export { authStorage, type IAuthStorage } from "./storage";
export { rbacStorage } from "./rbac-storage";

/** @deprecated Use requirePermission() */
export { isAdmin } from "./middleware";
