import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, ScrollText, ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { api } from "@/lib/api";
import type { ApiAuditLogPage } from "@/lib/api";
import { AdminShell } from "@/components/admin/AdminShell";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  sync: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function AuditLogPage(): React.ReactElement {
  // Permission check handled by AdminRoute in App.tsx
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading, isError } = useQuery<ApiAuditLogPage>({
    queryKey: ["/api/admin/audit-log", page, actionFilter, resourceTypeFilter, startDate, endDate],
    queryFn: () => api.auditLog.list({
      page,
      limit: 50,
      action: actionFilter || undefined,
      resourceType: resourceTypeFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
  });

  return (
    <AdminShell>
      <div className="border-b bg-background">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-audit-back">
                <ArrowLeft className="w-4 h-4" /> Admin Dashboard
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="font-bold text-lg" data-testid="text-audit-title">Audit Log</h1>
          </div>
          <span className="text-sm text-muted-foreground">
            {data?.total ?? 0} entries
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-[130px] h-8 text-xs" data-testid="select-audit-action">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="sync">Sync</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="text"
                placeholder="Resource type..."
                value={resourceTypeFilter}
                onChange={(e) => { setResourceTypeFilter(e.target.value); setPage(1); }}
                className="w-[160px] h-8 text-xs"
                data-testid="input-audit-resource-type"
              />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-[140px] h-8 text-xs"
                placeholder="Start date"
                data-testid="input-audit-start-date"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-[140px] h-8 text-xs"
                placeholder="End date"
                data-testid="input-audit-end-date"
              />
              {(actionFilter || resourceTypeFilter || startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { setActionFilter(""); setResourceTypeFilter(""); setStartDate(""); setEndDate(""); setPage(1); }}
                  data-testid="button-audit-clear-filters"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-audit-log">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : isError ? (
              <div className="py-8 text-center text-sm text-destructive">Failed to load audit log. Please try refreshing.</div>
            ) : !data || data.entries.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">No audit log entries</div>
            ) : (
              <div className="divide-y">
                {data.entries.map((entry) => (
                  <Collapsible key={entry.id} data-testid={`row-audit-${entry.id}`}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge
                          className={`text-[10px] shrink-0 ${ACTION_COLORS[entry.action] || ACTION_COLORS.sync}`}
                          variant="secondary"
                        >
                          {entry.action}
                        </Badge>
                        <span className="text-sm font-mono text-muted-foreground shrink-0">{entry.resourceType}</span>
                        {entry.resourceId && (
                          <span className="text-xs font-mono text-muted-foreground/60 truncate">{entry.resourceId.slice(0, 8)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {entry.actor
                            ? `${entry.actor.firstName || ""} ${entry.actor.lastName || ""}`.trim() || entry.actor.email || "Unknown"
                            : "System"
                          }
                        </span>
                        <span className="text-[11px] text-muted-foreground/70 font-mono">
                          {new Date(entry.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-90" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-3 pt-0">
                        <div className="bg-muted/50 rounded p-3 text-xs font-mono overflow-auto max-h-48">
                          {entry.changes ? (
                            <pre>{JSON.stringify(entry.changes, null, 2)}</pre>
                          ) : (
                            <span className="text-muted-foreground">No change details recorded</span>
                          )}
                          {entry.ip && (
                            <div className="mt-2 text-muted-foreground">IP: {entry.ip}</div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              data-testid="button-audit-prev-page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground" data-testid="text-audit-page-info">
              Page {data.page} of {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              data-testid="button-audit-next-page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
