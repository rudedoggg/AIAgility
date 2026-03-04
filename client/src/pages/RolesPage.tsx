import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Lock } from "lucide-react";
import { Link } from "wouter";
import { api } from "@/lib/api";
import type { ApiRoleWithPermissions } from "@/lib/api";
import { AdminShell } from "@/components/admin/AdminShell";

export default function RolesPage(): React.ReactElement {
  // Permission check handled by AdminRoute in App.tsx

  const { data: allRoles = [], isLoading, isError } = useQuery<ApiRoleWithPermissions[]>({
    queryKey: ["/api/admin/roles"],
    queryFn: () => api.roles.list(),
  });

  const systemRoles = allRoles.filter((r) => r.type === "system");
  const projectRoles = allRoles.filter((r) => r.type === "project");

  return (
    <AdminShell>
      <div className="border-b bg-background">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-roles-back">
                <ArrowLeft className="w-4 h-4" /> Admin Dashboard
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="font-bold text-lg" data-testid="text-roles-title">Roles & Permissions</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : isError ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 text-sm text-destructive" data-testid="roles-error-banner">
            Failed to load roles. Please try refreshing the page.
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold mb-4">System Roles</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {systemRoles.map((role) => (
                  <RoleCard key={role.id} role={role} />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Project Roles</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projectRoles.map((role) => (
                  <RoleCard key={role.id} role={role} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function RoleCard({ role }: { role: ApiRoleWithPermissions }): React.ReactElement {
  const isSuperAdmin = role.name === "super_admin";

  return (
    <Card data-testid={`card-role-${role.name}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {role.name}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">{role.type}</Badge>
            {role.isBuiltIn && (
              <Badge variant="secondary" className="text-[10px]">
                <Lock className="w-2.5 h-2.5 mr-0.5" /> built-in
              </Badge>
            )}
            {role.isDefault && (
              <Badge className="text-[10px]">default</Badge>
            )}
          </div>
        </div>
        {role.description && (
          <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-xs font-medium text-muted-foreground mb-2">Permissions</div>
        {isSuperAdmin ? (
          <Badge variant="default" className="text-[10px]">* (all permissions)</Badge>
        ) : role.permissions.length === 0 ? (
          <span className="text-xs text-muted-foreground">No explicit permissions</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {role.permissions.map((p) => (
              <Badge key={p.id} variant="outline" className="text-[10px] font-mono">
                {p.key}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
