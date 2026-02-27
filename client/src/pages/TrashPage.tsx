import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, type ApiProject } from "@/lib/api";
import { Undo2, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

function daysRemaining(archivedAt: string | null): number {
  if (!archivedAt) return 30;
  const archived = new Date(archivedAt).getTime();
  const expiry = archived + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiry - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function TrashPage() {
  const queryClient = useQueryClient();

  const { data: archivedProjects = [] } = useQuery<ApiProject[]>({
    queryKey: ["/api/projects/archived"],
    queryFn: () => api.projects.listArchived(),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.projects.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/archived"] });
    },
  });

  return (
    <div className="h-screen w-screen bg-background text-foreground font-sans flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 pt-[60px] overflow-y-auto">
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground" data-testid="text-trash-label">
                Settings
              </div>
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-muted-foreground" />
                <div className="text-2xl font-bold font-heading" data-testid="text-trash-title">
                  Trash
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-1" data-testid="text-trash-subtitle">
                Deleted projects are kept for 30 days before permanent removal.
              </div>
            </div>
            <Link href="/settings/projects">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-to-projects">
                <ArrowLeft className="w-4 h-4" /> Back to Projects
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {archivedProjects.map((p) => {
              const days = daysRemaining(p.archivedAt);
              return (
                <Card key={p.id} className="p-4" data-testid={`card-trash-project-${p.id}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" data-testid={`text-trash-project-name-${p.id}`}>
                        {p.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1" data-testid={`text-trash-project-meta-${p.id}`}>
                        Deleted {p.archivedAt ? new Date(p.archivedAt).toLocaleDateString() : "recently"}
                        {" \u00B7 "}
                        {days} day{days === 1 ? "" : "s"} remaining
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => restoreMutation.mutate(p.id)}
                      disabled={restoreMutation.isPending}
                      data-testid={`button-restore-${p.id}`}
                    >
                      <Undo2 className="w-4 h-4" /> Restore
                    </Button>
                  </div>
                </Card>
              );
            })}

            {archivedProjects.length === 0 && (
              <Card className="p-8 text-center" data-testid="card-trash-empty">
                <div className="text-sm font-semibold">Trash is empty</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Deleted projects will appear here for 30 days.
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
