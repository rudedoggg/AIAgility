import { useState, useMemo } from "react";
import type { ApiPromptBlock } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Search, Info } from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "identity", label: "Identity" },
  { value: "role", label: "Role" },
  { value: "constraints", label: "Constraints" },
  { value: "task", label: "Task" },
  { value: "context_template", label: "Context Template" },
];

const CATEGORY_INFO: Record<string, { label: string; tip: string }> = {
  identity: { label: "Identity", tip: "Sets who the AI is — its name and persona. Most locations need exactly one." },
  role: { label: "Role", tip: "Defines the AI's expertise and responsibilities for this context." },
  constraints: { label: "Constraints", tip: "Rules the AI must follow — tone, length limits, topics to avoid." },
  task: { label: "Task", tip: "The specific job the AI should do when users chat in this location." },
  context_template: { label: "Context Template", tip: "Injects live project data at runtime via {{variable}} placeholders." },
};

type BlockLibraryProps = {
  blocks: ApiPromptBlock[];
  isLoading: boolean;
  onEditBlock: (id: string) => void;
  onCreateBlock: () => void;
};

export function BlockLibrary({ blocks, isLoading, onEditBlock, onCreateBlock }: BlockLibraryProps): React.ReactElement {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = useMemo(() => {
    return blocks.filter((b) => {
      const matchesSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || b.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [blocks, search, categoryFilter]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ApiPromptBlock[]>();
    for (const block of filtered) {
      const cat = block.category;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(block);
    }
    return groups;
  }, [filtered]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Block Library</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Reusable building blocks that shape AI behavior. Click any block to edit it.
            </p>
          </div>
          <Button size="sm" className="gap-1.5 h-7 text-xs shrink-0" onClick={onCreateBlock}>
            <Plus className="w-3.5 h-3.5" />
            New Block
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search blocks..."
              className="h-8 text-xs pl-8"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value} className="text-xs">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-10">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-10 px-6">
            {blocks.length === 0 ? (
              <div className="space-y-2">
                <p className="font-medium text-foreground">No blocks yet</p>
                <p className="text-xs">Create your first block to start customizing how AI assistants behave. Start with an Identity block to give the AI a persona, then add Role and Task blocks.</p>
              </div>
            ) : (
              "No blocks match your filters."
            )}
          </div>
        ) : (
          <div className="py-1">
            {Array.from(grouped.entries()).map(([cat, catBlocks]) => (
              <div key={cat}>
                <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground border-b flex items-center gap-1.5">
                  {CATEGORY_INFO[cat]?.label ?? cat}
                  {CATEGORY_INFO[cat]?.tip && (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground/60 hover:text-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[220px] text-xs">
                          {CATEGORY_INFO[cat].tip}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                {catBlocks.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => onEditBlock(block.id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{block.name}</span>
                      {!block.isActive && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {block.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{block.description}</p>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
