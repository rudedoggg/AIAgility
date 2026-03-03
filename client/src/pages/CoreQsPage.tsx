import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { api } from "@/lib/api";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { BlockLibrary } from "@/components/admin/BlockLibrary";
import { LocationConfigurator } from "@/components/admin/LocationConfigurator";
import { BlockEditorDialog } from "@/components/admin/BlockEditorDialog";
import { Blocks } from "lucide-react";

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["admin", "prompt-blocks"],
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
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Blocks className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold font-heading" data-testid="text-coreqs-title">
              Prompt Block Editor
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-coreqs-description">
            Create reusable prompt blocks and assign them to AI chat locations across the application.
          </p>
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
