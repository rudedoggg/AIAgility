import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ArrowLeft, Mail, Calendar, ShieldCheck, Smartphone } from "lucide-react";
import { Link } from "wouter";
import { fetchJson } from "@/lib/api";
import { AdminShell } from "@/components/admin/AdminShell";

type AuthUser = {
  id: string;
  email: string;
  phone: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  phone_confirmed_at: string | null;
  user_metadata: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string;
    picture?: string;
  };
  app_metadata: {
    provider?: string;
    providers?: string[];
  };
  identities?: Array<{
    provider: string;
    identity_data?: {
      email?: string;
      full_name?: string;
      avatar_url?: string;
    };
  }>;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getUserName(u: AuthUser): string {
  const meta = u.user_metadata;
  if (meta.full_name) return meta.full_name;
  if (meta.first_name || meta.last_name) {
    return [meta.first_name, meta.last_name].filter(Boolean).join(" ");
  }
  return u.email || u.phone || "Unknown";
}

function getAvatar(u: AuthUser): string | undefined {
  return u.user_metadata.avatar_url || u.user_metadata.picture || undefined;
}

export default function AuthUsersPage(): React.ReactElement {
  // Permission check handled by AdminRoute in App.tsx
  const { data: authUsers = [], isLoading, isError } = useQuery<AuthUser[]>({
    queryKey: ["/api/admin/auth-users"],
    queryFn: () => fetchJson("/api/admin/auth-users"),
  });

  return (
    <AdminShell>
      <div className="border-b bg-background">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-auth-users-back">
                <ArrowLeft className="w-4 h-4" /> Admin Dashboard
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="font-bold text-lg" data-testid="text-auth-users-title">Supabase Auth Users</h1>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground" data-testid="text-auth-users-count">
              {authUsers.length} user{authUsers.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <Card data-testid="card-auth-users">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Registered Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : isError ? (
              <div className="py-8 text-center text-sm text-destructive">Failed to load auth users. Please try refreshing.</div>
            ) : (
              <div className="divide-y">
                {authUsers.map((u) => {
                  const name = getUserName(u);
                  const avatar = getAvatar(u);
                  const providers = u.app_metadata.providers || (u.app_metadata.provider ? [u.app_metadata.provider] : []);

                  return (
                    <div key={u.id} className="flex items-center justify-between py-4" data-testid={`row-auth-user-${u.id}`}>
                      <div className="flex items-center gap-3">
                        {avatar ? (
                          <img src={avatar} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                            {(name[0] || "?").toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium" data-testid={`text-auth-user-name-${u.id}`}>
                            {name}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {u.email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-auth-user-email-${u.id}`}>
                                <Mail className="w-3 h-3" />
                                {u.email}
                              </div>
                            )}
                            {u.phone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Smartphone className="w-3 h-3" />
                                {u.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          {providers.map((p) => (
                            <Badge key={p} variant="outline" className="text-[10px]" data-testid={`badge-provider-${u.id}-${p}`}>
                              {p}
                            </Badge>
                          ))}
                          {u.email_confirmed_at && (
                            <Badge variant="default" className="text-[10px]" data-testid={`badge-email-confirmed-${u.id}`}>
                              Email verified
                            </Badge>
                          )}
                        </div>

                        <div className="text-right min-w-[140px]">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-auth-user-created-${u.id}`}>
                            <Calendar className="w-3 h-3" />
                            Joined {formatDate(u.created_at)}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5" data-testid={`text-auth-user-last-sign-in-${u.id}`}>
                            Last sign-in: {formatDate(u.last_sign_in_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {authUsers.length === 0 && !isLoading && (
                  <div className="py-8 text-center text-muted-foreground text-sm">No auth users found</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
