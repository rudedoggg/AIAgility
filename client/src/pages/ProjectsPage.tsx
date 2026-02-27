import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSelectedProject, setSelectedProject } from "@/lib/projectStore";
import { api, type ApiProject } from "@/lib/api";
import { Trash2 } from "lucide-react";
import { Link } from "wouter";

export default function ProjectsPage() {
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery<ApiProject[]>({
    queryKey: ["/api/projects"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.projects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const [query, setQuery] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ApiProject | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, query]);

  const active = getSelectedProject();

  const requestDelete = (p: ApiProject) => {
    setPendingDelete(p);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;

    const toDelete = pendingDelete;
    setConfirmOpen(false);
    setPendingDelete(null);

    deleteMutation.mutate(toDelete.id, {
      onSuccess: () => {
        if (active?.id === toDelete.id) {
          const remaining = projects.filter((p) => p.id !== toDelete.id);
          const fallback = remaining[0] || { id: "p-1", name: "Office Location Decision" };
          setSelectedProject(fallback);
        }
      },
    });
  };

  return (
    <div className="h-screen w-screen bg-background text-foreground font-sans flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 pt-[60px] overflow-y-auto">
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground" data-testid="text-projects-label">
                Settings
              </div>
              <div className="text-2xl font-bold font-heading" data-testid="text-projects-title">
                Projects
              </div>
              <div className="text-sm text-muted-foreground mt-1" data-testid="text-projects-subtitle">
                Manage your projects.
              </div>
            </div>
            <Link href="/settings/projects/trash">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-view-trash">
                <Trash2 className="w-4 h-4" /> View Trash
              </Button>
            </Link>
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Input
                data-testid="input-projects-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects…"
                className="max-w-sm"
              />
              <div className="text-sm text-muted-foreground" data-testid="text-projects-count">
                {filtered.length} project{filtered.length === 1 ? "" : "s"}
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            {filtered.map((p) => {
              const isActive = p.id === active?.id;
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold truncate" data-testid={`text-project-name-${p.id}`}>
                          {p.name}
                        </div>
                        {isActive && (
                          <div
                            className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                            data-testid={`badge-project-active-${p.id}`}
                          >
                            Active
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1" data-testid={`text-project-id-${p.id}`}>
                        ID: {p.id}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        data-testid={`button-project-open-${p.id}`}
                        variant={isActive ? "secondary" : "outline"}
                        onClick={() => setSelectedProject({ id: p.id, name: p.name })}
                      >
                        {isActive ? "Current" : "Open"}
                      </Button>
                      <Button
                        data-testid={`button-project-delete-${p.id}`}
                        variant="destructive"
                        onClick={() => requestDelete(p)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {!filtered.length && (
              <Card className="p-8 text-center">
                <div className="text-sm font-semibold" data-testid="text-projects-empty-title">No projects found</div>
                <div className="text-sm text-muted-foreground mt-1" data-testid="text-projects-empty-subtitle">
                  Try a different search.
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-delete-project-title">Delete project?</DialogTitle>
            <DialogDescription data-testid="text-delete-project-desc">
              This will remove the project from your list and delete its saved prototype data for this browser.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="text-sm font-semibold" data-testid="text-delete-project-name">
              {pendingDelete?.name || ""}
            </div>
            <div className="text-xs text-muted-foreground" data-testid="text-delete-project-id">
              {pendingDelete?.id ? `ID: ${pendingDelete.id}` : ""}
            </div>
          </div>

          <DialogFooter>
            <Button data-testid="button-delete-cancel" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button data-testid="button-delete-confirm" variant="destructive" onClick={confirmDelete}>
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
