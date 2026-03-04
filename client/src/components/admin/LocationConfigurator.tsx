import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api, type ApiPromptBlock, type ApiPromptLocation } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PromptPreview } from "./PromptPreview";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GripVertical, Plus, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type LocationDef = {
  key: string;
  label: string;
  description: string;
  page: string;
  scope: string;
};

type LocationConfiguratorProps = {
  locations: LocationDef[];
  allBlocks: ApiPromptBlock[];
};

function SortableBlockRow({
  location,
  block,
  onToggleActive,
  onRemove,
}: {
  location: ApiPromptLocation;
  block: ApiPromptBlock | undefined;
  onToggleActive: (id: string, isActive: boolean) => void;
  onRemove: (id: string) => void;
}): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: location.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.85 : 1,
      }}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 border rounded-md bg-card",
        isDragging && "bg-muted/60 shadow-sm"
      )}
    >
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
              <GripVertical className="w-4 h-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">Drag to reorder — blocks higher in the list appear first in the prompt</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{block?.name ?? "Unknown Block"}</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
            {block?.category ?? "?"}
          </Badge>
        </div>
      </div>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Switch
                checked={location.isActive}
                onCheckedChange={(checked) => onToggleActive(location.id, checked)}
                className="shrink-0"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {location.isActive ? "Active — included in the AI prompt" : "Inactive — excluded from the AI prompt without removing it"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => onRemove(location.id)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Remove this block from the location</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function LocationTab({
  locationKey,
  allBlocks,
}: {
  locationKey: string;
  allBlocks: ApiPromptBlock[];
}): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["/api/admin/prompt-locations", locationKey],
    queryFn: () => api.promptLocations.list(locationKey),
  });

  const blockMap = useMemo(() => new Map(allBlocks.map((b) => [b.id, b])), [allBlocks]);
  const assignedBlockIds = useMemo(() => new Set(assignments.map((a) => a.blockId)), [assignments]);
  const availableBlocks = useMemo(
    () => allBlocks.filter((b) => b.isActive && !assignedBlockIds.has(b.id)),
    [allBlocks, assignedBlockIds]
  );
  const sortedIds = useMemo(() => assignments.map((a) => a.id), [assignments]);

  function invalidateLocation(): void {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/prompt-locations", locationKey] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/prompt-preview", locationKey] });
  }

  const addMutation = useMutation({
    mutationFn: (blockId: string) =>
      api.promptLocations.create({ locationKey, blockId, sortOrder: assignments.length }),
    onSuccess: () => {
      invalidateLocation();
      setPopoverOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add block.", variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.promptLocations.delete(id),
    onSuccess: () => invalidateLocation(),
    onError: () => {
      toast({ title: "Error", description: "Failed to remove block.", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.promptLocations.update(id, { isActive }),
    onSuccess: () => invalidateLocation(),
    onError: () => {
      toast({ title: "Error", description: "Failed to toggle block.", variant: "destructive" });
    },
  });

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = assignments.findIndex((a) => a.id === active.id);
    const newIndex = assignments.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(assignments, oldIndex, newIndex);
    queryClient.setQueryData(
      ["/api/admin/prompt-locations", locationKey],
      reordered
    );
    api.promptLocations.reorder(locationKey, reordered.map((a) => a.id)).catch(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/prompt-locations", locationKey] });
      toast({ title: "Error", description: "Failed to reorder. Reverting.", variant: "destructive" });
    });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/prompt-preview", locationKey] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
              <Plus className="w-3.5 h-3.5" />
              Add Block
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0">
            <ScrollArea className="max-h-[240px]">
              {availableBlocks.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4 px-3">
                  All active blocks are already assigned.
                </div>
              ) : (
                availableBlocks.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => addMutation.mutate(block.id)}
                    disabled={addMutation.isPending}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm truncate">{block.name}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
                        {block.category}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 h-7 text-xs ml-auto"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPreview ? "Hide Preview" : "Preview"}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[220px]">
              See the fully assembled prompt the AI receives — includes all active blocks with templates resolved
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-6">Loading...</div>
      ) : assignments.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6 px-4 border rounded-md border-dashed space-y-1.5">
          <p className="font-medium text-foreground">No blocks assigned to this location</p>
          <p className="text-xs">Click "Add Block" above to assign prompt blocks. The AI will use the combined content of all active blocks here as its system instructions when users chat in this location.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {assignments.map((loc) => (
                <SortableBlockRow
                  key={loc.id}
                  location={loc}
                  block={blockMap.get(loc.blockId)}
                  onToggleActive={(id, isActive) => toggleMutation.mutate({ id, isActive })}
                  onRemove={(id) => removeMutation.mutate(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showPreview && (
        <div className="pt-2 border-t">
          <PromptPreview locationKey={locationKey} />
        </div>
      )}
    </div>
  );
}

export function LocationConfigurator({ locations, allBlocks }: LocationConfiguratorProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState(locations[0]?.key ?? "");

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">Location Configurator</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Each tab is a place in the app where users chat with AI. Assign blocks to control what the AI knows and how it responds.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b px-4">
            <TabsList className="h-9 bg-transparent p-0 gap-0">
              {locations.map((loc) => (
                <TabsTrigger
                  key={loc.key}
                  value={loc.key}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-1.5 text-xs data-[state=active]:shadow-none"
                >
                  {loc.page}
                  <span className="text-muted-foreground ml-1 hidden sm:inline">/ {loc.scope}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <ScrollArea className="flex-1">
            {locations.map((loc) => (
              <TabsContent key={loc.key} value={loc.key} className="p-4 mt-0">
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground">{loc.description}</p>
                </div>
                <LocationTab locationKey={loc.key} allBlocks={allBlocks} />
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
