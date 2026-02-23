import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function NotificationsPage() {
  return (
    <div className="h-screen w-screen bg-background text-foreground font-sans flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 pt-[60px] overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground" data-testid="text-notifications-label">
              Settings
            </div>
            <div className="text-2xl font-bold font-heading" data-testid="text-notifications-title">
              Notifications
            </div>
            <div className="text-sm text-muted-foreground mt-1" data-testid="text-notifications-subtitle">
              Control when the app nudges you and where.
            </div>
          </div>

          <Card className="p-5 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold" data-testid="text-notif-digest-title">Daily digest</div>
                <div className="text-sm text-muted-foreground" data-testid="text-notif-digest-desc">Summary of changes across your active project.</div>
              </div>
              <Switch data-testid="switch-notif-digest" />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold" data-testid="text-notif-goals-title">Brief reminders</div>
                <div className="text-sm text-muted-foreground" data-testid="text-notif-goals-desc">Remind me when brief sections are missing constraints or owners.</div>
              </div>
              <Switch data-testid="switch-notif-goals" defaultChecked />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold" data-testid="text-notif-deliverables-title">Deliverables deadlines</div>
                <div className="text-sm text-muted-foreground" data-testid="text-notif-deliverables-desc">Alerts for deliverables approaching their due dates.</div>
              </div>
              <Switch data-testid="switch-notif-deadlines" defaultChecked />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold" data-testid="text-notif-security-title">Security alerts</div>
                <div className="text-sm text-muted-foreground" data-testid="text-notif-security-desc">Login and access changes.</div>
              </div>
              <Switch data-testid="switch-notif-security" defaultChecked />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
