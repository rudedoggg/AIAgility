import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderOpen, ShieldCheck, ShieldOff, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { User } from "@shared/models/auth";
import type { Project } from "@shared/schema";
import { fetchJson } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";

export default function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => fetchJson("/api/admin/users"),
  });

  const { data: allProjects = [] } = useQuery<Project[]>({
    queryKey: ["/api/admin/projects"],
    queryFn: () => fetchJson("/api/admin/projects"),
  });

  const { data: stats } = useQuery<{ totalUsers: number; totalProjects: number }>({
    queryKey: ["/api/admin/stats"],
    queryFn: () => fetchJson("/api/admin/stats"),
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/toggle-admin`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  return (
    <div className="min-h-screen bg-background" data-testid="admin-page">
      <div className="border-b bg-background">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-admin-back">
                <ArrowLeft className="w-4 h-4" /> Back to App
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="font-bold text-lg" data-testid="text-admin-title">Admin Dashboard</h1>
          </div>
          <div className="text-sm text-muted-foreground" data-testid="text-admin-user">
            Signed in as {user?.firstName || user?.email || "Admin"}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid md:grid-cols-2 gap-4">
          <Card data-testid="card-stat-users">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="text-stat-users">{stats?.totalUsers ?? "..."}</div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-projects">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="text-stat-projects">{stats?.totalProjects ?? "..."}</div>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-user-list">
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {allUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-3" data-testid={`row-user-${u.id}`}>
                  <div className="flex items-center gap-3">
                    {u.profileImageUrl ? (
                      <img src={u.profileImageUrl} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {(u.firstName?.[0] || u.email?.[0] || "?").toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium" data-testid={`text-user-name-${u.id}`}>
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground" data-testid={`text-user-email-${u.id}`}>
                        {u.email || "No email"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={u.isAdmin ? "default" : "outline"} data-testid={`badge-role-${u.id}`}>
                      {u.isAdmin ? "Admin" : "User"}
                    </Badge>
                    <span className="text-xs text-muted-foreground" data-testid={`text-user-joined-${u.id}`}>
                      Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                    </span>
                    {u.id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAdminMutation.mutate(u.id)}
                        disabled={toggleAdminMutation.isPending}
                        data-testid={`button-toggle-admin-${u.id}`}
                      >
                        {u.isAdmin ? (
                          <><ShieldOff className="w-4 h-4 mr-1" /> Remove Admin</>
                        ) : (
                          <><ShieldCheck className="w-4 h-4 mr-1" /> Make Admin</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {allUsers.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">No users yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-all-projects">
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {allProjects.map((p) => {
                const owner = allUsers.find((u) => u.id === p.userId);
                return (
                  <div key={p.id} className="flex items-center justify-between py-3" data-testid={`row-project-${p.id}`}>
                    <div>
                      <div className="text-sm font-medium" data-testid={`text-project-name-${p.id}`}>{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Owner: {owner ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim() || owner.email : "Unknown"}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                );
              })}
              {allProjects.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">No projects yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
