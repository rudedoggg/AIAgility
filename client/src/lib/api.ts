import { apiRequest, getAuthHeaders } from "./queryClient";
import { API_BASE_URL } from "./config";

export type ApiProject = {
  id: string;
  name: string;
  summary: string;
  executiveSummary: string;
  dashboardStatus: {
    status: string;
    done: string[];
    undone: string[];
    nextSteps: string[];
  };
  archivedAt: string | null;
  createdAt: string;
};

export type ApiBriefSection = {
  id: string;
  projectId: string;
  genericName: string;
  subtitle: string;
  completeness: number;
  totalItems: number;
  completedItems: number;
  content: string;
  sortOrder: number;
};

export type ApiDiscoveryCategory = {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
};

export type ApiDeliverable = {
  id: string;
  projectId: string;
  title: string;
  subtitle: string;
  completeness: number;
  status: string;
  content: string;
  engaged: boolean;
  sortOrder: number;
};

export type ApiBucketItem = {
  id: string;
  parentId: string;
  parentType: string;
  type: string;
  title: string;
  preview: string;
  date: string;
  url: string | null;
  fileName: string | null;
  fileSizeLabel: string | null;
  sortOrder: number;
};

export type ApiChatMessage = {
  id: string;
  parentId: string;
  parentType: string;
  role: string;
  content: string;
  timestamp: string;
  hasSaveableContent: boolean;
  saved: boolean;
  sortOrder: number;
};

async function json<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

export async function fetchJson<T>(url: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}${url}`, { headers });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  projects: {
    list: () => fetchJson<ApiProject[]>("/api/projects"),
    get: (id: string) => fetchJson<ApiProject>(`/api/projects/${id}`),
    create: (data: Partial<ApiProject>) => apiRequest("POST", "/api/projects", data).then(json<ApiProject>),
    update: (id: string, data: Partial<ApiProject>) => apiRequest("PATCH", `/api/projects/${id}`, data).then(json<ApiProject>),
    delete: (id: string) => apiRequest("DELETE", `/api/projects/${id}`),
    listArchived: () => fetchJson<ApiProject[]>("/api/projects/archived"),
    restore: (id: string) => apiRequest("PATCH", `/api/projects/${id}/restore`).then(json<ApiProject>),
  },

  brief: {
    list: (projectId: string) => fetchJson<ApiBriefSection[]>(`/api/projects/${projectId}/brief`),
    create: (projectId: string, data: Partial<ApiBriefSection>) => apiRequest("POST", `/api/projects/${projectId}/brief`, data).then(json<ApiBriefSection>),
    update: (id: string, data: Partial<ApiBriefSection>) => apiRequest("PATCH", `/api/brief/${id}`, data).then(json<ApiBriefSection>),
    delete: (id: string) => apiRequest("DELETE", `/api/brief/${id}`),
    reorder: (projectId: string, ids: string[]) => apiRequest("PUT", `/api/projects/${projectId}/brief/reorder`, { ids }),
  },

  discovery: {
    list: (projectId: string) => fetchJson<ApiDiscoveryCategory[]>(`/api/projects/${projectId}/discovery`),
    create: (projectId: string, data: Partial<ApiDiscoveryCategory>) => apiRequest("POST", `/api/projects/${projectId}/discovery`, data).then(json<ApiDiscoveryCategory>),
    update: (id: string, data: Partial<ApiDiscoveryCategory>) => apiRequest("PATCH", `/api/discovery/${id}`, data).then(json<ApiDiscoveryCategory>),
    delete: (id: string) => apiRequest("DELETE", `/api/discovery/${id}`),
    reorder: (projectId: string, ids: string[]) => apiRequest("PUT", `/api/projects/${projectId}/discovery/reorder`, { ids }),
  },

  deliverables: {
    list: (projectId: string) => fetchJson<ApiDeliverable[]>(`/api/projects/${projectId}/deliverables`),
    create: (projectId: string, data: Partial<ApiDeliverable>) => apiRequest("POST", `/api/projects/${projectId}/deliverables`, data).then(json<ApiDeliverable>),
    update: (id: string, data: Partial<ApiDeliverable>) => apiRequest("PATCH", `/api/deliverables/${id}`, data).then(json<ApiDeliverable>),
    delete: (id: string) => apiRequest("DELETE", `/api/deliverables/${id}`),
    reorder: (projectId: string, ids: string[]) => apiRequest("PUT", `/api/projects/${projectId}/deliverables/reorder`, { ids }),
  },

  items: {
    list: (parentType: string, parentId: string) => fetchJson<ApiBucketItem[]>(`/api/items/${parentType}/${parentId}`),
    create: (data: Partial<ApiBucketItem>) => apiRequest("POST", "/api/items", data).then(json<ApiBucketItem>),
    delete: (id: string) => apiRequest("DELETE", `/api/items/${id}`),
  },

  messages: {
    list: (parentType: string, parentId: string) => fetchJson<ApiChatMessage[]>(`/api/messages/${parentType}/${parentId}`),
    create: (data: Partial<ApiChatMessage>) => apiRequest("POST", "/api/messages", data).then(json<ApiChatMessage>),
    update: (id: string, data: Partial<ApiChatMessage>) => apiRequest("PATCH", `/api/messages/${id}`, data).then(json<ApiChatMessage>),
  },

  coreQueries: {
    list: () => fetchJson<ApiCoreQuery[]>("/api/core-queries"),
    listAdmin: () => fetchJson<ApiCoreQuery[]>("/api/admin/core-queries"),
    update: (locationKey: string, contextQuery: string) => apiRequest("PUT", `/api/admin/core-queries/${locationKey}`, { contextQuery }).then(json<ApiCoreQuery>),
  },

  promptBlocks: {
    list: () => fetchJson<ApiPromptBlock[]>("/api/admin/prompt-blocks"),
    get: (id: string) => fetchJson<ApiPromptBlock>(`/api/admin/prompt-blocks/${id}`),
    create: (data: { name: string; category: string; content?: string; description?: string; isActive?: boolean }) =>
      apiRequest("POST", "/api/admin/prompt-blocks", data).then(json<ApiPromptBlock>),
    update: (id: string, data: { name?: string; category?: string; content?: string; description?: string; isActive?: boolean; sortOrder?: number; changeNote?: string }) =>
      apiRequest("PATCH", `/api/admin/prompt-blocks/${id}`, data).then(json<ApiPromptBlock>),
    delete: (id: string) => apiRequest("DELETE", `/api/admin/prompt-blocks/${id}`),
    versions: (blockId: string) => fetchJson<ApiPromptVersion[]>(`/api/admin/prompt-blocks/${blockId}/versions`),
  },

  promptLocations: {
    list: (locationKey: string) => fetchJson<ApiPromptLocation[]>(`/api/admin/prompt-locations/${locationKey}`),
    create: (data: { locationKey: string; blockId: string; sortOrder?: number; isActive?: boolean }) =>
      apiRequest("POST", "/api/admin/prompt-locations", data).then(json<ApiPromptLocation>),
    update: (id: string, data: { sortOrder?: number; isActive?: boolean }) =>
      apiRequest("PATCH", `/api/admin/prompt-locations/${id}`, data).then(json<ApiPromptLocation>),
    delete: (id: string) => apiRequest("DELETE", `/api/admin/prompt-locations/${id}`),
    reorder: (locationKey: string, ids: string[]) =>
      apiRequest("PUT", `/api/admin/prompt-locations/${locationKey}/reorder`, { ids }),
  },

  promptPreview: {
    get: (locationKey: string, provider?: string) =>
      fetchJson<ApiPromptPreview>(`/api/admin/prompt-preview/${locationKey}${provider ? `?provider=${provider}` : ""}`),
  },

  roles: {
    list: () => fetchJson<ApiRoleWithPermissions[]>("/api/admin/roles"),
    get: (id: string) => fetchJson<ApiRoleWithPermissions>(`/api/admin/roles/${id}`),
    create: (data: { name: string; description: string; type: string }) =>
      apiRequest("POST", "/api/admin/roles", data).then(json<ApiRole>),
    update: (id: string, data: { name?: string; description?: string }) =>
      apiRequest("PATCH", `/api/admin/roles/${id}`, data).then(json<ApiRole>),
    delete: (id: string) => apiRequest("DELETE", `/api/admin/roles/${id}`),
    setPermissions: (id: string, permissionIds: string[]) =>
      apiRequest("PUT", `/api/admin/roles/${id}/permissions`, { permissionIds }),
  },

  permissions: {
    list: () => fetchJson<ApiPermission[]>("/api/admin/permissions"),
  },

  userRoles: {
    assign: (userId: string, roleId: string) =>
      apiRequest("PUT", `/api/admin/users/${userId}/role`, { roleId }).then(json<{ success: boolean; role: string }>),
  },

  auditLog: {
    list: (params?: { page?: number; limit?: number; actorId?: string; action?: string; resourceType?: string; startDate?: string; endDate?: string }) => {
      const query = new URLSearchParams();
      if (params?.page) query.set("page", String(params.page));
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.actorId) query.set("actorId", params.actorId);
      if (params?.action) query.set("action", params.action);
      if (params?.resourceType) query.set("resourceType", params.resourceType);
      if (params?.startDate) query.set("startDate", params.startDate);
      if (params?.endDate) query.set("endDate", params.endDate);
      const qs = query.toString();
      return fetchJson<ApiAuditLogPage>(`/api/admin/audit-log${qs ? `?${qs}` : ""}`);
    },
  },
};

export type ApiCoreQuery = {
  id: string;
  locationKey: string;
  contextQuery: string;
  updatedAt: string;
};

export type ApiPromptBlock = {
  id: string;
  name: string;
  category: string;
  content: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiPromptLocation = {
  id: string;
  locationKey: string;
  blockId: string;
  sortOrder: number;
  isActive: boolean;
};

export type ApiPromptVersion = {
  id: string;
  blockId: string;
  content: string;
  version: number;
  changedBy: string;
  changeNote: string;
  createdAt: string;
};

export type ApiPromptPreview = {
  systemMessage: string;
  provider: string;
  tokenEstimate: number;
};

// === RBAC Types ===
export type ApiRole = {
  id: string;
  name: string;
  description: string;
  type: string;
  isBuiltIn: boolean;
  isDefault: boolean;
  createdAt: string;
};

export type ApiPermission = {
  id: string;
  key: string;
  description: string;
  category: string;
};

export type ApiRoleWithPermissions = ApiRole & {
  permissions: ApiPermission[];
};

export type ApiUserWithRoles = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  systemRoles: string[];
  primaryRole: string;
};

export type ApiAuditLogEntry = {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  changes: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actor: { email: string | null; firstName: string | null; lastName: string | null } | null;
};

export type ApiAuditLogPage = {
  entries: ApiAuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
