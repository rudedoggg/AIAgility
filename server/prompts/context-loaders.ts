import { storage } from "../storage";
import type { Project, BriefSection, DiscoveryCategory, Deliverable, BucketItem } from "@shared/schema";

export type ContextData = Record<string, string>;
export type ContextParams = { parentId: string; parentType: string; projectId: string };

/**
 * Load project context data for a chat location.
 * Returns a flat key→value map of template variables (e.g. "project.name" → "Office Relocation").
 */
export async function loadContextForLocation(params: ContextParams): Promise<ContextData> {
  switch (params.parentType) {
    case "dashboard_page":
      return loadDashboardPage(params);
    case "brief_page":
      return loadBriefPage(params);
    case "brief_section":
      return loadBriefSection(params);
    case "discovery_page":
      return loadDiscoveryPage(params);
    case "discovery_category":
      return loadDiscoveryCategory(params);
    case "deliverable_page":
      return loadDeliverablePage(params);
    case "deliverable_asset":
      return loadDeliverableAsset(params);
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Per-location loaders
// ---------------------------------------------------------------------------

async function loadDashboardPage(params: ContextParams): Promise<ContextData> {
  const [project, sections, categories, deliverables] = await Promise.all([
    storage.getProject(params.projectId),
    storage.listBriefSections(params.projectId),
    storage.listDiscoveryCategories(params.projectId),
    storage.listDeliverables(params.projectId),
  ]);
  if (!project) return {};

  return {
    "project.name": project.name,
    "project.summary": project.summary,
    "project.executiveSummary": project.executiveSummary,
    "project.dashboardStatus": formatDashboardStatus(project),
    "brief.sectionsList": formatBriefSectionsList(sections),
    "discovery.categoriesList": formatCategoriesList(categories),
    "deliverables.list": formatDeliverablesList(deliverables),
  };
}

async function loadBriefPage(params: ContextParams): Promise<ContextData> {
  const [project, sections] = await Promise.all([
    storage.getProject(params.projectId),
    storage.listBriefSections(params.projectId),
  ]);
  if (!project) return {};

  return {
    "project.name": project.name,
    "brief.sectionsDetail": formatBriefSectionsDetail(sections),
  };
}

async function loadBriefSection(params: ContextParams): Promise<ContextData> {
  const [project, section, allSections, items] = await Promise.all([
    storage.getProject(params.projectId),
    storage.getBriefSection(params.parentId),
    storage.listBriefSections(params.projectId),
    storage.listBucketItems(params.parentId, "brief"),
  ]);
  if (!project || !section) return {};

  const siblingNames = allSections
    .filter((s) => s.id !== section.id)
    .map((s) => s.genericName);

  return {
    "project.name": project.name,
    "section.name": section.genericName,
    "section.content": section.content,
    "section.completeness": `${section.completeness}%`,
    "section.items": formatBucketItemsList(items),
    "section.siblingNames": siblingNames.join(", "),
  };
}

async function loadDiscoveryPage(params: ContextParams): Promise<ContextData> {
  const [project, categories] = await Promise.all([
    storage.getProject(params.projectId),
    storage.listDiscoveryCategories(params.projectId),
  ]);
  if (!project) return {};

  const categoriesWithCounts = await Promise.all(
    categories.map(async (cat) => {
      const items = await storage.listBucketItems(cat.id, "discovery");
      return `- ${cat.name} (${items.length} items)`;
    }),
  );

  return {
    "project.name": project.name,
    "discovery.categoriesWithCounts": categoriesWithCounts.join("\n"),
  };
}

async function loadDiscoveryCategory(params: ContextParams): Promise<ContextData> {
  const [project, category, allCategories, items] = await Promise.all([
    storage.getProject(params.projectId),
    storage.getDiscoveryCategory(params.parentId),
    storage.listDiscoveryCategories(params.projectId),
    storage.listBucketItems(params.parentId, "discovery"),
  ]);
  if (!project || !category) return {};

  const siblingNames = allCategories
    .filter((c) => c.id !== category.id)
    .map((c) => c.name);

  return {
    "project.name": project.name,
    "category.name": category.name,
    "category.items": formatBucketItemsList(items),
    "category.siblingNames": siblingNames.join(", "),
  };
}

async function loadDeliverablePage(params: ContextParams): Promise<ContextData> {
  const [project, deliverables] = await Promise.all([
    storage.getProject(params.projectId),
    storage.listDeliverables(params.projectId),
  ]);
  if (!project) return {};

  return {
    "project.name": project.name,
    "deliverables.detail": formatDeliverablesDetail(deliverables),
  };
}

async function loadDeliverableAsset(params: ContextParams): Promise<ContextData> {
  const [project, deliverable, allDeliverables, items] = await Promise.all([
    storage.getProject(params.projectId),
    storage.getDeliverable(params.parentId),
    storage.listDeliverables(params.projectId),
    storage.listBucketItems(params.parentId, "deliverable"),
  ]);
  if (!project || !deliverable) return {};

  const siblingTitles = allDeliverables
    .filter((d) => d.id !== deliverable.id)
    .map((d) => d.title);

  return {
    "project.name": project.name,
    "deliverable.title": deliverable.title,
    "deliverable.status": deliverable.status,
    "deliverable.completeness": `${deliverable.completeness}%`,
    "deliverable.content": deliverable.content,
    "deliverable.items": formatBucketItemsList(items),
    "deliverable.siblingTitles": siblingTitles.join(", "),
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatDashboardStatus(project: Project): string {
  const ds = project.dashboardStatus;
  if (!ds) return "";
  const parts: string[] = [];
  if (ds.status) parts.push(`Status: ${ds.status}`);
  if (ds.done.length > 0) parts.push(`Done: ${ds.done.join("; ")}`);
  if (ds.undone.length > 0) parts.push(`Remaining: ${ds.undone.join("; ")}`);
  if (ds.nextSteps.length > 0) parts.push(`Next steps: ${ds.nextSteps.join("; ")}`);
  return parts.join("\n");
}

function formatBriefSectionsList(sections: BriefSection[]): string {
  return sections
    .map((s) => `- ${s.genericName} (${s.completeness}% complete)`)
    .join("\n");
}

function formatBriefSectionsDetail(sections: BriefSection[]): string {
  return sections
    .map((s) => {
      const header = `### ${s.genericName} (${s.completeness}%)`;
      return s.content ? `${header}\n${s.content}` : header;
    })
    .join("\n\n");
}

function formatCategoriesList(categories: DiscoveryCategory[]): string {
  return categories.map((c) => `- ${c.name}`).join("\n");
}

function formatDeliverablesList(deliverables: Deliverable[]): string {
  return deliverables
    .map((d) => `- ${d.title} [${d.status}] (${d.completeness}%)`)
    .join("\n");
}

function formatDeliverablesDetail(deliverables: Deliverable[]): string {
  return deliverables
    .map((d) => {
      const header = `### ${d.title} [${d.status}] (${d.completeness}%)`;
      return d.content ? `${header}\n${d.content}` : header;
    })
    .join("\n\n");
}

function formatBucketItemsList(items: BucketItem[]): string {
  return items
    .map((item) => {
      const preview = item.preview ? `: ${item.preview.slice(0, 120)}` : "";
      return `- [${item.type}] ${item.title}${preview}`;
    })
    .join("\n");
}
