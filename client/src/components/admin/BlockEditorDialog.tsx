import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiPromptVersion } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, History, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";

const CATEGORIES = [
  { value: "identity", label: "Identity" },
  { value: "role", label: "Role" },
  { value: "constraints", label: "Constraints" },
  { value: "task", label: "Task" },
  { value: "context_template", label: "Context Template" },
];

type BlockEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockId: string | null;
};

export function BlockEditorDialog({ open, onOpenChange, blockId }: BlockEditorDialogProps): React.ReactElement {
  const isEditMode = blockId !== null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("identity");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [showVersions, setShowVersions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: block } = useQuery({
    queryKey: ["admin", "prompt-blocks", blockId],
    queryFn: () => api.promptBlocks.get(blockId!),
    enabled: isEditMode && open,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["admin", "prompt-blocks", blockId, "versions"],
    queryFn: () => api.promptBlocks.versions(blockId!),
    enabled: isEditMode && open && showVersions,
  });

  useEffect(() => {
    if (block && isEditMode) {
      setName(block.name);
      setCategory(block.category);
      setDescription(block.description);
      setContent(block.content);
      setChangeNote("");
      setShowVersions(false);
    }
  }, [block, isEditMode]);

  useEffect(() => {
    if (!open) {
      setName("");
      setCategory("identity");
      setDescription("");
      setContent("");
      setChangeNote("");
      setShowVersions(false);
      setConfirmDelete(false);
    }
  }, [open]);

  function invalidateAll(): void {
    queryClient.invalidateQueries({ queryKey: ["admin", "prompt-blocks"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "prompt-locations"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "prompt-preview"] });
  }

  const createMutation = useMutation({
    mutationFn: () => api.promptBlocks.create({ name, category, content, description }),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Created", description: "Prompt block created." });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create block.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => api.promptBlocks.update(blockId!, { name, category, content, description, changeNote: changeNote || undefined }),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Saved", description: "Prompt block updated." });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update block.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.promptBlocks.delete(blockId!),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Deleted", description: "Prompt block deleted." });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete block.", variant: "destructive" });
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function handleSave(): void {
    if (!name.trim()) {
      toast({ title: "Validation", description: "Name is required.", variant: "destructive" });
      return;
    }
    if (isEditMode) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Block" : "New Block"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="block-name">Name</Label>
              <Input
                id="block-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Core Identity"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="block-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="block-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="block-description">Description</Label>
            <Input
              id="block-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this block's purpose"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="block-content">Content</Label>
              <span className="text-xs text-muted-foreground">
                Use {"{{variable.name}}"} for dynamic values
              </span>
            </div>
            <Textarea
              id="block-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the prompt block content..."
              className="min-h-[200px] resize-y text-sm font-mono"
            />
          </div>

          {isEditMode && (
            <div className="space-y-1.5">
              <Label htmlFor="block-change-note">Change Note</Label>
              <Input
                id="block-change-note"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="What changed and why (optional)"
              />
            </div>
          )}

          {isEditMode && (
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setShowVersions(!showVersions)}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <History className="w-4 h-4 text-muted-foreground" />
                Version History
                {showVersions ? (
                  <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                )}
              </button>

              {showVersions && (
                <div className="border-t px-4 py-3 space-y-3 max-h-[200px] overflow-y-auto">
                  {versions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No previous versions.</p>
                  ) : (
                    versions.map((v: ApiPromptVersion) => (
                      <div key={v.id} className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs shrink-0">
                              v{v.version}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(v.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {v.changeNote && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{v.changeNote}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 gap-1 text-xs"
                          onClick={() => setContent(v.content)}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restore
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          {isEditMode ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  Confirm Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete
              </Button>
            )
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isEditMode ? "Save" : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
