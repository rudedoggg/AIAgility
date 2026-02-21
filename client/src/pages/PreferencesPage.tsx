import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PreferencesPage() {
  return (
    <div className="h-screen w-screen bg-background text-foreground font-sans flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 pt-[60px] overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground" data-testid="text-preferences-label">
              Settings
            </div>
            <div className="text-2xl font-bold font-heading" data-testid="text-preferences-title">
              Preferences
            </div>
            <div className="text-sm text-muted-foreground mt-1" data-testid="text-preferences-subtitle">
              Tune the app experience for focus, readability, and workflow.
            </div>
          </div>

          <Card className="p-5 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold" data-testid="text-pref-compact-title">Compact mode</div>
                <div className="text-sm text-muted-foreground" data-testid="text-pref-compact-desc">Tighter spacing in buckets and sidebars.</div>
              </div>
              <Switch data-testid="switch-compact-mode" />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold" data-testid="text-pref-animations-title">Reduce motion</div>
                <div className="text-sm text-muted-foreground" data-testid="text-pref-animations-desc">Minimize UI animations and transitions.</div>
              </div>
              <Switch data-testid="switch-reduce-motion" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label data-testid="label-pref-density">Content density</Label>
                <Select defaultValue="comfortable">
                  <SelectTrigger data-testid="select-density">
                    <SelectValue placeholder="Choose density" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label data-testid="label-pref-start-page">Start page</Label>
                <Select defaultValue="dashboard">
                  <SelectTrigger data-testid="select-start-page">
                    <SelectValue placeholder="Choose start page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="goals">Brief</SelectItem>
                    <SelectItem value="lab">Discovery</SelectItem>
                    <SelectItem value="deliverables">Deliverables</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
