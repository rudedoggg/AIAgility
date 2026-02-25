import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiDiscoveryCategory, type ApiBucketItem } from "@/lib/api";
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
import { AppShell } from "@/components/layout/AppShell";
import { ChatWorkspace } from "@/components/shared/ChatWorkspace";
import { getSelectedProject, subscribeToSelectedProject } from "@/lib/projectStore";
import { Message, Category } from "@/lib/types";
import { FileText, Link as LinkIcon, MessageSquare, StickyNote, FolderOpen, Folder, Plus, ChevronRight, Upload, Link2, RefreshCw, Trash2 } from "lucide-react";
import { cn, getProgressPercent } from "@/lib/utils";
import { usePromptDialog } from "@/components/shared/PromptDialogProvider";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { ScopedHistory } from "@/components/shared/ScopedHistory";
import { useChatStream } from "@/hooks/use-chat-stream";

const ACCENT_COLORS = [
  "border-t-violet-400",
  "border-t-sky-400",
  "border-t-emerald-400",
  "border-t-amber-400",
  "border-t-rose-400",
  "border-t-indigo-400",
  "border-t-teal-400",
  "border-t-orange-400",
];

function DiscoveryCategoryChat({ categoryId }: { categoryId: string }) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);

  const { data: categoryMsgs } = useQuery({
    queryKey: ["/api/messages", "discovery_category", categoryId],
    queryFn: () => api.messages.list("discovery_category", categoryId),
    enabled: !!categoryId,
  });

  useEffect(() => {
    if (categoryMsgs) {
      setMessages(categoryMsgs.map(m => ({
        id: m.id,
        role: m.role as "user" | "ai",
        content: m.content,
        timestamp: m.timestamp,
        hasSaveableContent: m.hasSaveableContent,
        saved: m.saved,
      })));
    }
  }, [categoryMsgs]);

  const { streamingMessage, isStreaming, sendMessage } = useChatStream({
    parentId: categoryId,
    parentType: "discovery_category",
  });

  const displayMessages = useMemo(() => {
    const result = [...messages];
    if (streamingMessage) result.push(streamingMessage);
    return result;
  }, [messages, streamingMessage]);

  const handleSend = (content: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages(prev => [...prev, {
      id: `local-${Date.now()}`,
      role: "user" as const,
      content,
      timestamp,
    }]);
    sendMessage(content);
  };

  return (
    <ChatWorkspace
      messages={displayMessages}
      onSendMessage={handleSend}
      isStreaming={isStreaming}
      className="h-full"
    />
  );
}

type LocalCategory = Category;

export default function DiscoveryPage() {
  const queryClient = useQueryClient();
  const { prompt } = usePromptDialog();
  const [activeProject, setActiveProject] = useState(getSelectedProject());
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const categoryRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: apiCategories } = useQuery({
    queryKey: ["/api/projects", activeProject.id, "discovery"],
    queryFn: () => api.discovery.list(activeProject.id),
    enabled: !!activeProject.id,
  });

  const { data: apiPageMessages } = useQuery({
    queryKey: ["/api/messages", "discovery_page", activeProject.id],
    queryFn: () => api.messages.list("discovery_page", activeProject.id),
    enabled: !!activeProject.id,
  });

  useEffect(() => {
    if (apiPageMessages) {
      setMessages(apiPageMessages.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'ai',
        content: m.content,
        timestamp: m.timestamp,
        hasSaveableContent: m.hasSaveableContent,
        saved: m.saved,
      })));
    }
  }, [apiPageMessages]);

  const { streamingMessage, isStreaming, sendMessage: sendPageMessage } = useChatStream({
    parentId: activeProject.id,
    parentType: "discovery_page",
  });

  const displayMessages = useMemo(() => {
    const result = [...messages];
    if (streamingMessage) result.push(streamingMessage);
    return result;
  }, [messages, streamingMessage]);

  useEffect(() => {
    if (!apiCategories || !Array.isArray(apiCategories)) return;

    setCategories(prev => {
      const prevMap = new Map(prev.map(b => [b.id, b]));
      return apiCategories.map(ab => {
        const existing = prevMap.get(ab.id);
        return {
          id: ab.id,
          name: ab.name,
          items: existing?.items || [],
          isOpen: existing?.isOpen || false,
        };
      });
    });

    apiCategories.forEach(ab => {
      api.items.list("discovery", ab.id).then(items => {
        setCategories(prev => prev.map(b => {
          if (b.id !== ab.id) return b;
          return {
            ...b,
            items: items.map(i => ({
              id: i.id,
              type: i.type as any,
              title: i.title,
              preview: i.preview,
              date: i.date,
              url: i.url || undefined,
              fileName: i.fileName || undefined,
              fileSizeLabel: i.fileSizeLabel || undefined,
            })),
          };
        }));
      }).catch(() => {});
    });
  }, [apiCategories]);

  useEffect(() => {
    const unsub = subscribeToSelectedProject((p) => {
      setActiveProject(p);
    });
    return () => unsub();
  }, []);

  const toggleCategory = (id: string) => {
      setCategories(prev => prev.map(b => b.id === id ? { ...b, isOpen: !b.isOpen } : b));
  };

  const addCategoryItem = (categoryId: string, item: Category["items"][number]) => {
      setCategories(prev => prev.map(b => b.id === categoryId ? { ...b, items: [item, ...b.items] } : b));

      api.items.create({
        parentId: categoryId,
        parentType: "discovery",
        type: item.type,
        title: item.title,
        preview: item.preview,
        date: item.date,
        url: (item as any).url || null,
        fileName: (item as any).fileName || null,
        fileSizeLabel: (item as any).fileSizeLabel || null,
      }).then(created => {
        setCategories(prev => prev.map(b => {
          if (b.id !== categoryId) return b;
          return {
            ...b,
            items: b.items.map(i => i.id === item.id ? { ...i, id: created.id } : i),
          };
        }));
      }).catch(() => {});
  };

  const deleteCategoryItem = (categoryId: string, itemId: string) => {
      setCategories(prev => prev.map(b => b.id === categoryId ? { ...b, items: b.items.filter(i => i.id !== itemId) } : b));

      api.items.delete(itemId).catch(() => {});
  };

  const scrollToCategory = (id: string) => {
      setCategories(prev => prev.map(b => b.id === id ? { ...b, isOpen: true } : b));
      setTimeout(() => {
          categoryRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const categoryIds = useMemo(() => categories.map((b) => b.id), [categories]);

  function SortableNavRow({ categoryId }: { categoryId: string }) {
    const category = categories.find((b) => b.id === categoryId);
    const sortable = useSortable({ id: categoryId });
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

    if (!category) return null;

    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        data-testid={`nav-row-${category.id}`}
        onClick={() => scrollToCategory(category.id)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm font-medium border-l-2 cursor-pointer transition-colors select-none",
          "border-transparent text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50",
          isDragging && "bg-sidebar-accent/60 text-foreground"
        )}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.85 : 1,
        }}
      >
        <Folder className="w-3.5 h-3.5" />
        <span className="truncate flex-1">{category.name}</span>
        <span className="text-[10px] bg-sidebar-border px-1.5 rounded-sm">{category.items.length}</span>
      </div>
    );
  }

  const SidebarContent = (
      <div className="space-y-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event: DragEndEvent) => {
            const { active, over } = event;
            if (!over) return;
            if (active.id === over.id) return;

            setCategories((prev) => {
              const oldIndex = prev.findIndex((b) => b.id === active.id);
              const newIndex = prev.findIndex((b) => b.id === over.id);
              if (oldIndex === -1 || newIndex === -1) return prev;
              const reordered = arrayMove(prev, oldIndex, newIndex);

              api.discovery.reorder(activeProject.id, reordered.map(b => b.id)).catch(() => {});

              return reordered;
            });
          }}
        >
          <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
            {categoryIds.map((id) => (
              <SortableNavRow key={id} categoryId={id} />
            ))}
          </SortableContext>
        </DndContext>

          <Button
            data-testid="button-add-category"
            variant="ghost"
            size="sm"
            className="w-full justify-start px-3 mt-2 text-xs text-muted-foreground hover:text-primary"
            onClick={() => {
              prompt({
                title: "New Category",
                fields: [
                  { name: "name", label: "Category name", defaultValue: "New category" },
                ],
              }).then((result) => {
                if (!result) return;
                const name = result.name;

                const id = `category-${Date.now()}`;
                setCategories((prev) => [
                  {
                    id,
                    name,
                    isOpen: true,
                    items: [],
                  },
                  ...prev,
                ]);

                api.discovery.create(activeProject.id, { name }).then(created => {
                  setCategories(prev => prev.map(b => b.id === id ? { ...b, id: created.id, name: created.name } : b));
                }).catch(() => {});

                setTimeout(() => {
                  categoryRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 50);
              });
            }}
          >
            + New Category
          </Button>
      </div>
  );

  return (
    <AppShell 
        navContent={SidebarContent} 
        navTitle="Categories"
        statusContent={
            <SummaryCard 
                title="Discovery Status"
                status="Seeded from the project summary. Next: capture evidence and open questions."
                done={[]}
                undone={["Add first evidence category"]}
                nextSteps={["Add sources", "Log assumptions"]}
            />
        }
        chatContent={
            <ChatWorkspace
                messages={displayMessages}
                onSendMessage={(content) => {
                  const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  setMessages(prev => [...prev, {
                    id: `local-${Date.now()}`,
                    role: "user" as const,
                    content,
                    timestamp,
                  }]);
                  sendPageMessage(content);
                }}
                isStreaming={isStreaming}
                saveDestinations={categories.map((b) => ({ id: b.id, label: b.name }))}
                onSaveContent={(messageId, destinationId) => {
                    const msg = messages.find((m) => m.id === messageId);
                    if (!msg) return;

                    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, saved: true } : m)));

                    api.messages.update(messageId, { saved: true }).catch(() => {});

                    const noteTitle = msg.content.split("\n")[0]?.slice(0, 80) || "Saved chat";
                    const noteBody = msg.content;

                    addCategoryItem(destinationId, {
                        id: `chat-${Date.now()}`,
                        type: 'note',
                        title: noteTitle,
                        preview: noteBody,
                        date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
                    });
                }}
                className="flex-1 min-h-0"
            />
        }
    >
         <div className="bg-background h-full">
             <ScrollArea className="h-full">
                <div className="flex flex-col gap-3 p-3">
                    {categories.map((category, index) => (
                        <div key={category.id} ref={el => { if (el) categoryRefs.current[category.id] = el; }} className={`bg-background rounded-lg shadow-sm border border-border/40 border-t-[3px] ${ACCENT_COLORS[index % ACCENT_COLORS.length]}`}>
                            <div 
                                className="flex items-center px-6 py-3 cursor-pointer hover:bg-muted/5 transition-colors group"
                                onClick={() => toggleCategory(category.id)}
                            >
                                <div className={cn("text-muted-foreground transition-transform duration-200 mr-2", category.isOpen ? "rotate-90" : "")}>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                                <h2 className="text-sm font-bold font-heading text-foreground flex-1">
                                    {category.name}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden" data-testid={`progress-${category.id}`}>
                                        <div
                                            className="h-full bg-primary/80"
                                            style={{
                                                width: `${getProgressPercent({
                                                    itemsCount: category.items.length,
                                                })}%`,
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            data-testid={`button-note-${category.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                prompt({
                                                    title: `New Note in "${category.name}"`,
                                                    fields: [
                                                        { name: "title", label: "Title", defaultValue: "Quick note" },
                                                        { name: "content", label: "Content", type: "textarea" },
                                                    ],
                                                }).then((result) => {
                                                    if (!result) return;
                                                    addCategoryItem(category.id, {
                                                        id: `${Date.now()}`,
                                                        type: 'note',
                                                        title: result.title,
                                                        preview: (result.content || "").slice(0, 80) || "(empty)",
                                                        date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })
                                                    });
                                                });
                                            }}
                                            aria-label="Make a note"
                                            title="Make a note"
                                            type="button"
                                        >
                                            <StickyNote className="w-3.5 h-3.5" />
                                        </button>

                                        <input
                                            ref={(el) => { fileInputRefs.current[category.id] = el; }}
                                            className="hidden"
                                            data-testid={`input-file-${category.id}`}
                                            type="file"
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                                const file = e.currentTarget.files?.[0];
                                                if (!file) return;

                                                addCategoryItem(category.id, {
                                                    id: `${Date.now()}`,
                                                    type: 'file',
                                                    title: file.name,
                                                    preview: `${Math.round(file.size / 1024)} KB`,
                                                    date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
                                                    fileName: file.name,
                                                    fileSizeLabel: `${Math.round(file.size / 1024)} KB`
                                                });

                                                e.currentTarget.value = "";
                                            }}
                                        />

                                        <button
                                            data-testid={`button-upload-${category.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRefs.current[category.id]?.click();
                                            }}
                                            aria-label="Upload a file"
                                            title="Upload a file"
                                            type="button"
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                            data-testid={`button-link-${category.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                prompt({
                                                    title: "Add Link",
                                                    fields: [
                                                        { name: "url", label: "URL", type: "url", placeholder: "https://" },
                                                        { name: "title", label: "Link name" },
                                                    ],
                                                }).then((result) => {
                                                    if (!result) return;
                                                    const url = result.url;
                                                    const title = result.title || url;
                                                    addCategoryItem(category.id, {
                                                        id: `${Date.now()}`,
                                                        type: 'link',
                                                        title,
                                                        preview: url,
                                                        date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
                                                        url
                                                    });
                                                });
                                            }}
                                            aria-label="Link a file"
                                            title="Link a file"
                                            type="button"
                                        >
                                            <Link2 className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                            data-testid={`button-update-${category.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); }}
                                            aria-label="Update category"
                                            title="Update category"
                                            type="button"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <AnimatePresence initial={false}>
                                {category.isOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="flex h-[400px] border-t border-border/50">
                                            {/* Left Content Column */}
                                            <div className="w-[60%] border-r border-border/50">
                                                <div className="h-full flex flex-col">
                                                    <div className="flex-1 min-h-0">
                                                        <DiscoveryCategoryChat
                                                            categoryId={category.id}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Attachments Column */}
                                            <div className="w-[20%] bg-muted/5 border-r border-border/50">
                                                <div className="h-full flex flex-col">
                                                    <div className="px-4 py-3 border-b border-border/50 text-[11px] uppercase tracking-wider text-muted-foreground" data-testid={`text-attachments-title-${category.id}`}>Memory</div>
                                                    <div className="flex-1 overflow-y-auto">
                                                        {(category.items || []).length === 0 ? (
                                                            <div className="px-4 py-3 text-sm text-muted-foreground" data-testid={`text-attachments-empty-${category.id}`}>No files, links, or notes yet.</div>
                                                        ) : (
                                                            <div className="divide-y">
                                                                {(category.items || []).map((item) => (
                                                                    <div key={item.id} className="group flex items-start gap-3 px-4 py-3">
                                                                        <div className="mt-0.5 text-muted-foreground group-hover:text-primary transition-colors">
                                                                            {(item.type === 'file' || item.type === 'doc') && <FileText className="w-4 h-4" />}
                                                                            {item.type === 'link' && <LinkIcon className="w-4 h-4" />}
                                                                            {item.type === 'note' && <StickyNote className="w-4 h-4" />}
                                                                            {item.type === 'chat' && <MessageSquare className="w-4 h-4" />}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <div className="text-sm font-medium text-foreground truncate" data-testid={`text-attachment-name-${item.id}`}>{item.title}</div>
                                                                                <div className="flex items-center gap-2 shrink-0">
                                                                                    <div className="text-[10px] text-muted-foreground" data-testid={`text-attachment-date-${item.id}`}>{item.date}</div>
                                                                                    <button
                                                                                        data-testid={`button-delete-item-${item.id}`}
                                                                                        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            deleteCategoryItem(category.id, item.id);
                                                                                        }}
                                                                                        aria-label="Delete item"
                                                                                        title="Delete item"
                                                                                        type="button"
                                                                                    >
                                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right History Column */}
                                            <div className="w-[20%] bg-muted/5">
                                                <ScopedHistory />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
             </ScrollArea>
         </div>
    </AppShell>
  );
}
