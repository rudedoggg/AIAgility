import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, FolderPlus, LogOut, Settings, User, Shield, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSelectedProject, setSelectedProject, subscribeToSelectedProject } from "@/lib/projectStore";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

function generateTemplateFromSnippet(projectName: string, snippet: string) {
  const cleaned = snippet.replace(/\s+/g, " ").trim();
  const focus = cleaned.split(/[.?!]/)[0]?.slice(0, 140) || cleaned.slice(0, 140);

  const makeDate = () => new Date().toLocaleDateString([], { month: "short", day: "numeric" });

  return {
    executiveSummary: `# Executive Summary — ${projectName}\n\n## Summary (Seed)\n${snippet}\n\n## Standing Question\nGive me a two-page executive summary of this project.\n`,
    dashboardStatus: {
      status: `Seeded from the project summary. Next: turn the narrative into explicit goals + constraints.`,
      done: ["Project seeded"],
      undone: ["Define objective", "List constraints"],
      nextSteps: ["Create 3 brief sections", "Add stakeholders"],
    },
    brief: [
      {
        genericName: "Context",
        subtitle: "What's happening and why now",
        completeness: 35,
        totalItems: 3,
        completedItems: 1,
        content: cleaned,
        sortOrder: 0,
        items: [{ type: "note", title: "Seed summary", preview: snippet, date: makeDate() }],
      },
      {
        genericName: "Objective",
        subtitle: "What outcome are we driving",
        completeness: 10,
        totalItems: 3,
        completedItems: 0,
        content: focus ? `Draft objective: ${focus}` : "Draft objective (TBD)",
        sortOrder: 1,
        items: [],
      },
      {
        genericName: "Stakeholders",
        subtitle: "Who must agree / who is impacted",
        completeness: 0,
        totalItems: 3,
        completedItems: 0,
        content: "(TBD)",
        sortOrder: 2,
        items: [],
      },
      {
        genericName: "Constraints",
        subtitle: "Budget, timing, non-negotiables",
        completeness: 0,
        totalItems: 3,
        completedItems: 0,
        content: "(TBD)",
        sortOrder: 3,
        items: [],
      },
    ],
    discovery: [
      {
        name: "Sources + Evidence",
        sortOrder: 0,
        items: [{ type: "note", title: "What we know so far", preview: snippet, date: makeDate() }],
      },
      {
        name: "Open Questions",
        sortOrder: 1,
        items: [{ type: "note", title: "Questions to answer", preview: "(TBD)", date: makeDate() }],
      },
    ],
    deliverables: [
      {
        title: "Decision / Plan Draft",
        subtitle: "Seeded from summary",
        completeness: 15,
        status: "draft",
        content: `# ${projectName}\n\n## Seed Summary\n${snippet}\n\n## Draft\n(TBD)\n`,
        engaged: true,
        sortOrder: 0,
        items: [{ type: "note", title: "Seed summary", preview: snippet, date: makeDate() }],
      },
    ],
  };
}

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [location] = useLocation();
  const [projectName, setProjectName] = useState(getSelectedProject().name);
  const { user } = useAuth();

  const userInitials = user
    ? ((user.firstName?.[0] || "") + (user.lastName?.[0] || "")).toUpperCase() || (user.email?.[0] || "?").toUpperCase()
    : "?";
  const userDisplayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User"
    : "User";

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => api.projects.list(),
  });

  useEffect(() => {
    if (projects.length > 0) {
      const current = getSelectedProject();
      const exists = projects.some((p) => p.id === current.id);
      if (!exists) {
        const first = projects[0];
        setSelectedProject({ id: first.id, name: first.name });
        setProjectName(first.name);
      }
    }
  }, [projects]);

  const createProjectMutation = useMutation({
    mutationFn: async ({ name, summary }: { name: string; summary: string }) => {
      const snippet = summary.trim();
      const template = snippet ? generateTemplateFromSnippet(name, snippet) : null;

      const project = await api.projects.create({
        name,
        summary,
        executiveSummary: template?.executiveSummary || "",
        dashboardStatus: template?.dashboardStatus || {
          status: "New project created.",
          done: [],
          undone: [],
          nextSteps: [],
        },
      });

      if (template) {
        for (const section of template.brief) {
          const { items, ...sectionData } = section;
          const createdSection = await api.brief.create(project.id, sectionData);
          for (const item of items) {
            await api.items.create({
              parentId: createdSection.id,
              parentType: "brief",
              ...item,
            });
          }
        }

        for (const category of template.discovery) {
          const { items, ...categoryData } = category;
          const createdCategory = await api.discovery.create(project.id, categoryData);
          for (const item of items) {
            await api.items.create({
              parentId: createdCategory.id,
              parentType: "discovery",
              ...item,
            });
          }
        }

        for (const deliverable of template.deliverables) {
          const { items, ...delivData } = deliverable;
          const createdDeliv = await api.deliverables.create(project.id, delivData);
          for (const item of items) {
            await api.items.create({
              parentId: createdDeliv.id,
              parentType: "deliverable",
              ...item,
            });
          }
        }

        const pageTypes = ["dashboard", "brief", "discovery", "deliverables"];
        for (const pageType of pageTypes) {
          await api.messages.create({
            parentId: project.id,
            parentType: pageType,
            role: "assistant",
            content: `Welcome to ${name}! I'm ready to help you with your ${pageType}. Ask me anything.`,
            timestamp: new Date().toISOString(),
            hasSaveableContent: false,
            saved: false,
            sortOrder: 0,
          });
        }
      }

      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setSelectedProject({ id: project.id, name: project.name });
    },
  });

  useEffect(() => {
    return subscribeToSelectedProject((p) => setProjectName(p.name));
  }, []);

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Brief", path: "/" },
    { label: "Discovery", path: "/discovery" },
    { label: "Deliverables", path: "/deliverables" },
  ];

  return (
    <header className="h-[60px] border-b bg-white flex items-center justify-between px-6 fixed top-0 w-full z-50">
      <div className="flex items-center gap-3 font-bold text-lg tracking-tight font-heading">
        <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground" data-testid="img-app-mark">
          A
        </div>
        <span data-testid="text-app-name">AgilityAI</span>

        <div className="hidden md:block h-6 w-px bg-border/70" aria-hidden="true" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-testid="dropdown-project-trigger"
              className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border/50 bg-background/60 hover:bg-muted/40 transition-colors max-w-[280px]"
              title={projectName}
            >
              <span className="text-sm font-semibold text-foreground/90 truncate">{projectName}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-72">
            <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground" data-testid="text-project-switcher-label">
              Active projects
            </div>

            {projects.map((p) => (
              <DropdownMenuItem
                key={p.id}
                data-testid={`menu-project-${p.id}`}
                onSelect={() => setSelectedProject({ id: p.id, name: p.name })}
              >
                <span className="truncate">{p.name}</span>
                {p.name === projectName && (
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground" data-testid={`text-project-active-${p.id}`}>
                    active
                  </span>
                )}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              data-testid="menu-project-new"
              onSelect={() => {
                const name = window.prompt("Project name", "New Project");
                if (!name) return;

                const summary = window.prompt("Project summary (one paragraph)", "");
                if (summary === null) return;

                createProjectMutation.mutate({ name, summary });
              }}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              New Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex items-center gap-1">
        {navItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <div
              className={`px-4 py-1.5 text-sm font-medium transition-all cursor-pointer relative ${
                location === item.path
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${item.label.toLowerCase()}`}
            >
              {item.label}
              {location === item.path && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />
              )}
            </div>
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground" data-testid="text-settings-menu-label">
              Settings
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="menu-settings-preferences" onSelect={() => (window.location.href = "/settings/preferences")}>Preferences</DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-settings-notifications" onSelect={() => (window.location.href = "/settings/notifications")}>Notifications</DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-settings-billing" onSelect={() => (window.location.href = "/settings/billing")}>Billing</DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-settings-projects" onSelect={() => (window.location.href = "/settings/projects")}>Projects</DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-settings-help" onSelect={() => (window.location.href = "/support")}>Help & Support</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-8 w-8 bg-accent rounded-full flex items-center justify-center text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity overflow-hidden"
              data-testid="button-user"
              aria-label="User menu"
            >
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-2">
              <div className="text-sm font-semibold" data-testid="text-user-name">{userDisplayName}</div>
              <div className="text-xs text-muted-foreground" data-testid="text-user-email">{user?.email || ""}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="menu-user-profile" onSelect={() => (window.location.href = "/account/profile")}>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-user-account" onSelect={() => (window.location.href = "/account")}>Account</DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-user-security" onSelect={() => (window.location.href = "/account/security")}>Security</DropdownMenuItem>
            {user?.isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="menu-user-admin" onSelect={() => (window.location.href = "/admin")}>
                  <Shield className="w-4 h-4 mr-2" />
                  Admin Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-user-coreqs" onSelect={() => (window.location.href = "/admin/coreqs")}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  CoreQs
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="menu-user-signout" onSelect={() => (window.location.href = "/api/logout")}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
