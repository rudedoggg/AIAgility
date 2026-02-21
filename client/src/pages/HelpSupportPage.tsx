import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function HelpSupportPage() {
  return (
    <div className="h-screen w-screen bg-background text-foreground font-sans flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 pt-[60px] overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground" data-testid="text-help-label">
              Support
            </div>
            <div className="text-2xl font-bold font-heading" data-testid="text-help-title">
              Help & Support
            </div>
            <div className="text-sm text-muted-foreground mt-1" data-testid="text-help-subtitle">
              Quick answers, keyboard shortcuts, and a way to contact support.
            </div>
          </div>

          <Card className="p-5 space-y-4">
            <div className="text-sm font-semibold" data-testid="text-help-search-title">Search</div>
            <div className="space-y-2">
              <Label data-testid="label-help-search">What do you need?</Label>
              <Input data-testid="input-help-search" placeholder="Search topics (mock)…" />
            </div>
            <div className="flex gap-2">
              <Button data-testid="button-help-search">Search</Button>
              <Button data-testid="button-help-contact" variant="outline">Contact support</Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 space-y-2">
              <div className="text-sm font-semibold" data-testid="text-help-faq-title">FAQ</div>
              <ul className="text-sm text-muted-foreground space-y-1" data-testid="list-help-faq">
                <li>How do projects work?</li>
                <li>What is Memory?</li>
                <li>How do I structure a decision?</li>
                <li>How do scoped chats stay focused?</li>
              </ul>
            </Card>
            <Card className="p-5 space-y-2">
              <div className="text-sm font-semibold" data-testid="text-help-shortcuts-title">Shortcuts</div>
              <div className="text-sm text-muted-foreground" data-testid="text-help-shortcuts-desc">
                Press <span className="font-mono">/</span> to search (coming soon).
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
