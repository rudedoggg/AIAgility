import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { api, type ApiCoreQuery } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Target, Beaker, FileText, MessageSquare, FolderOpen, LayoutDashboard } from "lucide-react";

const LOCATIONS = [
  {
    key: "dashboard_page",
    label: "Dashboard — Page-Level AI",
    description: "This context is prepended to every user message in the AI chat area on the Dashboard page.",
    icon: LayoutDashboard,
    page: "Dashboard",
    scope: "Page Chat",
  },
  {
    key: "brief_page",
    label: "Brief — Page-Level AI",
    description: "This context is prepended to every user message in the main chat area at the top of the Brief page.",
    icon: Target,
    page: "Brief",
    scope: "Page Chat",
  },
  {
    key: "brief_section",
    label: "Brief — Section-Level AI",
    description: "This context is prepended to every user message inside any individual brief section's expandable chat.",
    icon: FolderOpen,
    page: "Brief",
    scope: "Section Chat",
  },
  {
    key: "discovery_page",
    label: "Discovery — Page-Level AI",
    description: "This context is prepended to every user message in the main chat area at the top of the Discovery page.",
    icon: Beaker,
    page: "Discovery",
    scope: "Page Chat",
  },
  {
    key: "discovery_category",
    label: "Discovery — Category-Level AI",
    description: "This context is prepended to every user message inside any individual discovery category's expandable chat.",
    icon: FolderOpen,
    page: "Discovery",
    scope: "Category Chat",
  },
  {
    key: "deliverable_page",
    label: "Deliverables — Page-Level AI",
    description: "This context is prepended to every user message in the main chat area at the top of the Deliverables page.",
    icon: FileText,
    page: "Deliverables",
    scope: "Page Chat",
  },
  {
    key: "deliverable_asset",
    label: "Deliverables — Asset-Level AI",
    description: "This context is prepended to every user message inside any individual deliverable asset's expandable chat.",
    icon: FolderOpen,
    page: "Deliverables",
    scope: "Asset Chat",
  },
];

function CoreQueryCard({
  location,
  savedQuery,
  onSave,
  isSaving,
}: {
  location: (typeof LOCATIONS)[0];
  savedQuery: string;
  onSave: (key: string, query: string) => void;
  isSaving: boolean;
}) {
  const [value, setValue] = useState(savedQuery);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setValue(savedQuery);
    setDirty(false);
  }, [savedQuery]);

  const handleChange = (newVal: string) => {
    setValue(newVal);
    setDirty(newVal !== savedQuery);
  };

  const Icon = location.icon;

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4" data-testid={`card-coreq-${location.key}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base" data-testid={`text-coreq-label-${location.key}`}>
              {location.label}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {location.page}
              </span>
              <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {location.scope}
              </span>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          disabled={!dirty || isSaving}
          onClick={() => onSave(location.key, value)}
          className="gap-1.5 shrink-0"
          data-testid={`button-save-coreq-${location.key}`}
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </Button>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {location.description}
      </p>
      <Textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Enter the AI context query that will be prepended to every user message in this location..."
        className="min-h-[120px] resize-y text-sm"
        data-testid={`input-coreq-${location.key}`}
      />
      {dirty && (
        <p className="text-xs text-amber-600 font-medium" data-testid={`text-coreq-unsaved-${location.key}`}>
          Unsaved changes
        </p>
      )}
    </div>
  );
}

export default function CoreQsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: coreQueries = [], isLoading } = useQuery({
    queryKey: ["/api/admin/core-queries"],
    queryFn: () => api.coreQueries.listAdmin(),
  });

  const saveMutation = useMutation({
    mutationFn: ({ key, query }: { key: string; query: string }) =>
      api.coreQueries.update(key, query),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/core-queries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/core-queries"] });
      toast({ title: "Saved", description: "Context query updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save context query.", variant: "destructive" });
    },
  });

  const queryMap = new Map<string, string>();
  coreQueries.forEach((q: ApiCoreQuery) => queryMap.set(q.locationKey, q.contextQuery));

  return (
    <div className="h-screen w-screen bg-background text-foreground font-sans flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 pt-[60px] overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold font-heading" data-testid="text-coreqs-title">
                CoreQs
              </h1>
            </div>
            <p className="text-muted-foreground" data-testid="text-coreqs-description">
              Define the AI context queries that get prepended to every user message at each interaction point.
              These queries shape how the AI responds across the application.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground" data-testid="loading-coreqs">
              Loading...
            </div>
          ) : (
            <div className="space-y-6">
              {LOCATIONS.map((loc) => (
                <CoreQueryCard
                  key={loc.key}
                  location={loc}
                  savedQuery={queryMap.get(loc.key) || ""}
                  onSave={(key, query) => saveMutation.mutate({ key, query })}
                  isSaving={saveMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
