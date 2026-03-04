import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, FolderOpen, ArrowLeft, UserX, UserCheck, MessageSquare, Shield, ScrollText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Project } from "@shared/schema";
import { fetchJson, api } from "@/lib/api";
import type { ApiUserWithRoles, ApiRoleWithPermissions } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminPage(): React.ReactElement {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: allUsers = [], isError: usersError } = useQuery<ApiUserWithRoles[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => fetchJson("/api/admin/users"),
  });

  const { data: allProjects = [], isError: projectsError } = useQuery<Project[]>({
    queryKey: ["/api/admin/projects"],
    queryFn: () => fetchJson("/api/admin/projects"),
  });

  const { data: stats, isError: statsError } = useQuery<{ totalUsers: number; totalProjects: number }>({
    queryKey: ["/api/admin/stats"],
    queryFn: () => fetchJson("/api/admin/stats"),
  });

  const { data: allRoles = [], isLoading: rolesLoading, isError: rolesError } = useQuery<ApiRoleWithPermissions[]>({
    queryKey: ["/api/admin/roles"],
    queryFn: () => api.roles.list(),
  });

  const systemRoles = allRoles.filter((r) => r.type === "system");

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      return api.userRoles.assign(userId, roleId);
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      const targetUser = allUsers.find((u) => u.id === userId);
      toast({ title: "Role updated", description: `Updated role for ${targetUser?.email || "user"}` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/deactivate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AdminShell>
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
          <div className="flex items-center gap-3">
            <Link href="/admin/coreqs">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-prompt-mgmt">
                <MessageSquare className="w-4 h-4" /> Prompt Management
              </Button>
            </Link>
            <Link href="/admin/auth-users">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-auth-users">
                <Users className="w-4 h-4" /> Auth Users
              </Button>
            </Link>
            <Link href="/admin/roles">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-roles">
                <Shield className="w-4 h-4" /> Roles
              </Button>
            </Link>
            <Link href="/admin/audit">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-audit-log">
                <ScrollText className="w-4 h-4" /> Audit Log
              </Button>
            </Link>
            <div className="text-sm text-muted-foreground" data-testid="text-admin-user">
              Signed in as {user?.firstName || user?.email || "Admin"}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {(usersError || projectsError || statsError || rolesError) && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 text-sm text-destructive" data-testid="admin-error-banner">
            Failed to load some data. Please try refreshing the page.
          </div>
        )}
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
                    {u.isActive === false && (
                      <Badge variant="destructive" data-testid={`badge-deactivated-${u.id}`}>
                        Deactivated
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground" data-testid={`text-user-joined-${u.id}`}>
                      Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                    </span>
                    {u.id !== user?.id ? (
                      <>
                        <Select
                          value={systemRoles.find((r) => r.name === u.primaryRole)?.id || ""}
                          onValueChange={(roleId) => assignRoleMutation.mutate({ userId: u.id, roleId })}
                          disabled={assignRoleMutation.isPending || rolesLoading}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs" data-testid={`select-role-${u.id}`}>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {systemRoles.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deactivateMutation.mutate(u.id)}
                          disabled={deactivateMutation.isPending}
                          data-testid={`button-deactivate-${u.id}`}
                        >
                          {u.isActive === false ? (
                            <><UserCheck className="w-4 h-4 mr-1" /> Reactivate</>
                          ) : (
                            <><UserX className="w-4 h-4 mr-1" /> Deactivate</>
                          )}
                        </Button>
                      </>
                    ) : (
                      <Badge variant="outline" data-testid={`badge-role-${u.id}`}>
                        {u.primaryRole} (you)
                      </Badge>
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
    </AdminShell>
  );
}
