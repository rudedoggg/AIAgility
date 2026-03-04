import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, FolderPlus, LogOut, Settings, User, Shield, MessageSquare, Sun, Moon, Palette, Trash2, ScrollText } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ApiProject } from "@/lib/api";
import { getSelectedProject, setSelectedProject, subscribeToSelectedProject } from "@/lib/projectStore";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePromptDialog } from "@/components/shared/PromptDialogProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function generateTemplateFromSnippet(projectName: string, snippet: string): {
  executiveSummary: string;
  dashboardStatus: { status: string; done: string[]; undone: string[]; nextSteps: string[] };
  brief: Array<{ genericName: string; subtitle: string; completeness: number; totalItems: number; completedItems: number; content: string; sortOrder: number; items: Array<{ type: string; title: string; preview: string; date: string }> }>;
  discovery: Array<{ name: string; sortOrder: number; items: Array<{ type: string; title: string; preview: string; date: string }> }>;
  deliverables: Array<{ title: string; subtitle: string; completeness: number; status: string; content: string; engaged: boolean; sortOrder: number; items: Array<{ type: string; title: string; preview: string; date: string }> }>;
} {
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

export function Header(): React.ReactElement {
  const [location, setLocation] = useLocation();
  const [projectName, setProjectName] = useState(getSelectedProject().name);
  const { user, logout, hasPermission } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { prompt } = usePromptDialog();

  const userInitials = user
    ? ((user.firstName?.[0] || "") + (user.lastName?.[0] || "")).toUpperCase() || (user.email?.[0] || "?").toUpperCase()
    : "?";
  const userDisplayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User"
    : "User";

  const [projectToDelete, setProjectToDelete] = useState<ApiProject | null>(null);

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
        try {
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

          const pageTypes = ["dashboard_page", "brief_page", "discovery_page", "deliverable_page"];
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
        } catch (err) {
          toast({ title: "Warning", description: "Project created but template seeding failed. You can add content manually.", variant: "destructive" });
        }
      }

      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setSelectedProject({ id: project.id, name: project.name });
      setProjectName(project.name);
      toast({ title: "Project created", description: project.name });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: `Failed to create project: ${err.message}`, variant: "destructive" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => api.projects.delete(id),
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      const current = getSelectedProject();
      if (current.id === deletedId) {
        const remaining = projects.filter((p) => p.id !== deletedId);
        if (remaining.length > 0) {
          setSelectedProject({ id: remaining[0].id, name: remaining[0].name });
          setProjectName(remaining[0].name);
        }
      }
      toast({ title: "Project archived", description: "It will be permanently deleted after 30 days." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: `Failed to archive project: ${err.message}`, variant: "destructive" });
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
    <header className="h-[60px] border-b bg-background flex items-center justify-between px-6 fixed top-0 w-full z-50">
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
                <button
                  type="button"
                  className="ml-auto p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  data-testid={`button-delete-project-${p.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setProjectToDelete(p);
                  }}
                  aria-label={`Archive ${p.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              data-testid="menu-project-new"
              onSelect={() => {
                prompt({
                  title: "New Project",
                  fields: [
                    { name: "name", label: "Project name", defaultValue: "New Project" },
                    { name: "summary", label: "Summary", type: "textarea", placeholder: "One paragraph summary..." },
                  ],
                }).then((result) => {
                  if (!result) return;
                  createProjectMutation.mutate({ name: result.name, summary: result.summary });
                });
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
              className={`px-4 py-1.5 text-sm font-medium transition-all cursor-pointer relative ${location === item.path
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
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          data-testid="button-theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

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
            <DropdownMenuItem data-testid="menu-settings-preferences" onSelect={() => setLocation("/settings/preferences")}>Preferences</DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-settings-notifications" onSelect={() => setLocation("/settings/notifications")}>Notifications</DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-settings-billing" onSelect={() => setLocation("/settings/billing")}>Billing</DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-settings-projects" onSelect={() => setLocation("/settings/projects")}>Projects</DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-settings-help" onSelect={() => setLocation("/support")}>Help & Support</DropdownMenuItem>
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
            <DropdownMenuItem data-testid="menu-user-profile" onSelect={() => setLocation("/account/profile")}>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-user-account" onSelect={() => setLocation("/account")}>Account</DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-user-security" onSelect={() => setLocation("/account/security")}>Security</DropdownMenuItem>
            {hasPermission("admin.*") && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="menu-user-admin" onSelect={() => setLocation("/admin")}>
                  <Shield className="w-4 h-4 mr-2" />
                  Admin Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-user-coreqs" onSelect={() => setLocation("/admin/coreqs")}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  CoreQs
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-user-styleguide" onSelect={() => setLocation("/admin/style-guide")}>
                  <Palette className="w-4 h-4 mr-2" />
                  Style Guide
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-user-roles" onSelect={() => setLocation("/admin/roles")}>
                  <Shield className="w-4 h-4 mr-2" />
                  Roles
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-user-audit" onSelect={() => setLocation("/admin/audit")}>
                  <ScrollText className="w-4 h-4 mr-2" />
                  Audit Log
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="menu-user-signout" onSelect={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => { if (!open) setProjectToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive project?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{projectToDelete?.name}</strong> will be archived and permanently deleted after 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => {
                if (projectToDelete) {
                  deleteProjectMutation.mutate(projectToDelete.id);
                  setProjectToDelete(null);
                }
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
