import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { api } from "@/lib/api";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AdminBanner } from "@/components/admin/AdminBanner";
import { BlockLibrary } from "@/components/admin/BlockLibrary";
import { LocationConfigurator } from "@/components/admin/LocationConfigurator";
import { BlockEditorDialog } from "@/components/admin/BlockEditorDialog";
import { Blocks, HelpCircle, ChevronRight } from "lucide-react";

const LOCATIONS = [
  {
    key: "dashboard_page",
    label: "Dashboard — Page-Level AI",
    description: "This context is prepended to every user message in the AI chat area on the Dashboard page.",
    page: "Dashboard",
    scope: "Page Chat",
  },
  {
    key: "brief_page",
    label: "Brief — Page-Level AI",
    description: "This context is prepended to every user message in the main chat area at the top of the Brief page.",
    page: "Brief",
    scope: "Page Chat",
  },
  {
    key: "brief_section",
    label: "Brief — Section-Level AI",
    description: "This context is prepended to every user message inside any individual brief section's expandable chat.",
    page: "Brief",
    scope: "Section Chat",
  },
  {
    key: "discovery_page",
    label: "Discovery — Page-Level AI",
    description: "This context is prepended to every user message in the main chat area at the top of the Discovery page.",
    page: "Discovery",
    scope: "Page Chat",
  },
  {
    key: "discovery_category",
    label: "Discovery — Category-Level AI",
    description: "This context is prepended to every user message inside any individual discovery category's expandable chat.",
    page: "Discovery",
    scope: "Category Chat",
  },
  {
    key: "deliverable_page",
    label: "Deliverables — Page-Level AI",
    description: "This context is prepended to every user message in the main chat area at the top of the Deliverables page.",
    page: "Deliverables",
    scope: "Page Chat",
  },
  {
    key: "deliverable_asset",
    label: "Deliverables — Asset-Level AI",
    description: "This context is prepended to every user message inside any individual deliverable asset's expandable chat.",
    page: "Deliverables",
    scope: "Asset Chat",
  },
];

export default function CoreQsPage(): React.ReactElement {
  // Permission check handled by AdminRoute in App.tsx
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["/api/admin/prompt-blocks"],
    queryFn: () => api.promptBlocks.list(),
  });

  function handleEditBlock(id: string): void {
    setSelectedBlockId(id);
    setEditDialogOpen(true);
  }

  function handleCreateBlock(): void {
    setSelectedBlockId(null);
    setEditDialogOpen(true);
  }

  return (
    <div className="h-screen w-screen bg-background text-foreground font-sans flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 pt-[60px] flex flex-col overflow-hidden">
        <AdminBanner />

        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Blocks className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold font-heading" data-testid="text-coreqs-title">
              Prompt Block Editor
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-coreqs-description">
            Control how AI assistants behave across the app. Create blocks on the left, then assign them to chat locations on the right.
          </p>

          <Collapsible open={helpOpen} onOpenChange={setHelpOpen} className="mt-3">
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${helpOpen ? "rotate-90" : ""}`} />
              <HelpCircle className="w-3.5 h-3.5" />
              How does this work?
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 text-sm text-muted-foreground space-y-4 max-w-3xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Quick Start</h3>
                  <ol className="space-y-1 text-xs leading-relaxed list-decimal list-inside">
                    <li>Create an <strong className="text-foreground">Identity</strong> block (e.g. "You are Agility, a project management AI").</li>
                    <li>Create a <strong className="text-foreground">Role</strong> block describing the AI's expertise.</li>
                    <li>Add <strong className="text-foreground">Constraints</strong> for tone, length, and topics to avoid.</li>
                    <li>Add a <strong className="text-foreground">Task</strong> block for each location's specific job.</li>
                    <li>Switch to the right panel, pick a location tab, and assign your blocks.</li>
                    <li>Use <strong className="text-foreground">Preview</strong> to see the final assembled prompt.</li>
                  </ol>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Prompt Categories</h3>
                  <ul className="space-y-1 text-xs leading-relaxed">
                    <li><strong className="text-foreground">Identity</strong> — Who the AI is. Sets the persona and name.</li>
                    <li><strong className="text-foreground">Role</strong> — What the AI does. Describes expertise and responsibilities.</li>
                    <li><strong className="text-foreground">Constraints</strong> — Rules the AI must follow. Tone, length limits, forbidden topics.</li>
                    <li><strong className="text-foreground">Task</strong> — The specific job for this location. What output the user expects.</li>
                    <li><strong className="text-foreground">Context Template</strong> — Dynamic data injected at runtime via {"{{variable}}"} placeholders.</li>
                  </ul>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">How Assembly Works</h3>
                  <p className="text-xs leading-relaxed">
                    When a user sends a message, the system collects all active blocks assigned to that chat location.
                    Blocks are assembled in category order (identity → role → constraints → task → context_template),
                    template variables are resolved from live project data, and the final prompt is sent to the AI.
                    Use the toggle switch on each block to temporarily disable it without removing the assignment.
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Tips for Better AI Responses</h3>
                  <ul className="space-y-1 text-xs leading-relaxed">
                    <li>Be <strong className="text-foreground">specific</strong> — "Respond in 2-3 sentences" beats "Keep it short".</li>
                    <li><strong className="text-foreground">Reuse blocks</strong> across locations — assign the same Identity block everywhere for a consistent persona.</li>
                    <li>Use <strong className="text-foreground">Preview</strong> after changes to verify the assembled prompt reads naturally.</li>
                    <li><strong className="text-foreground">Drag to reorder</strong> blocks within a location if you need to change emphasis.</li>
                  </ul>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Locations</h3>
                <p className="text-xs leading-relaxed">
                  Each tab on the right corresponds to a chat location in the app. <strong className="text-foreground">Page-level</strong> locations
                  power the main chat on each page (Dashboard, Brief, Discovery, Deliverables).{" "}
                  <strong className="text-foreground">Section/Category/Asset-level</strong> locations power the
                  expandable chat inside individual items. You can assign different blocks to each location to tailor
                  the AI's behavior per context — for example, a Discovery chat might emphasize research skills while a
                  Deliverables chat focuses on writing and formatting.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={38} minSize={25}>
              <BlockLibrary
                blocks={blocks}
                isLoading={isLoading}
                onEditBlock={handleEditBlock}
                onCreateBlock={handleCreateBlock}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={62} minSize={35}>
              <LocationConfigurator locations={LOCATIONS} allBlocks={blocks} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <BlockEditorDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        blockId={selectedBlockId}
      />
    </div>
  );
}
