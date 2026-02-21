import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type ApiDiscoveryBucket, type ApiBucketItem, type ApiChatMessage } from "@/lib/api";
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
import { Message, Bucket } from "@/lib/types";
import { FileText, Link as LinkIcon, MessageSquare, StickyNote, FolderOpen, Folder, Plus, ChevronRight, Upload, Link2, RefreshCw, Trash2 } from "lucide-react";
import { cn, getBucketProgressPercent } from "@/lib/utils";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { ScopedHistory } from "@/components/shared/ScopedHistory";
import { useCoreQueries } from "@/hooks/use-core-queries";

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

type BucketWithMessages = Bucket & { bucketMessages: Message[] };

export default function DiscoveryPage() {
  const { prependContext } = useCoreQueries();
  const [activeProject, setActiveProject] = useState(getSelectedProject());
  const [buckets, setBuckets] = useState<BucketWithMessages[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const bucketRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: apiBuckets } = useQuery({
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

  useEffect(() => {
    if (!apiBuckets || !Array.isArray(apiBuckets)) return;

    setBuckets(prev => {
      const prevMap = new Map(prev.map(b => [b.id, b]));
      return apiBuckets.map(ab => {
        const existing = prevMap.get(ab.id);
        return {
          id: ab.id,
          name: ab.name,
          items: existing?.items || [],
          isOpen: existing?.isOpen || false,
          bucketMessages: existing?.bucketMessages || [],
        };
      });
    });

    apiBuckets.forEach(ab => {
      api.items.list("discovery", ab.id).then(items => {
        setBuckets(prev => prev.map(b => {
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

      api.messages.list("discovery_bucket", ab.id).then(msgs => {
        setBuckets(prev => prev.map(b => {
          if (b.id !== ab.id) return b;
          return {
            ...b,
            bucketMessages: msgs.map(m => ({
              id: m.id,
              role: m.role as 'user' | 'ai',
              content: m.content,
              timestamp: m.timestamp,
              hasSaveableContent: m.hasSaveableContent,
              saved: m.saved,
            })),
          };
        }));
      }).catch(() => {});
    });
  }, [apiBuckets]);

  useEffect(() => {
    const unsub = subscribeToSelectedProject((p) => {
      setActiveProject(p);
    });
    return () => unsub();
  }, []);

  const toggleBucket = (id: string) => {
      setBuckets(prev => prev.map(b => b.id === id ? { ...b, isOpen: !b.isOpen } : b));
  };

  const addBucketItem = (bucketId: string, item: Bucket["items"][number]) => {
      setBuckets(prev => prev.map(b => b.id === bucketId ? { ...b, items: [item, ...b.items] } : b));

      api.items.create({
        parentId: bucketId,
        parentType: "discovery",
        type: item.type,
        title: item.title,
        preview: item.preview,
        date: item.date,
        url: (item as any).url || null,
        fileName: (item as any).fileName || null,
        fileSizeLabel: (item as any).fileSizeLabel || null,
      }).then(created => {
        setBuckets(prev => prev.map(b => {
          if (b.id !== bucketId) return b;
          return {
            ...b,
            items: b.items.map(i => i.id === item.id ? { ...i, id: created.id } : i),
          };
        }));
      }).catch(() => {});
  };

  const deleteBucketItem = (bucketId: string, itemId: string) => {
      setBuckets(prev => prev.map(b => b.id === bucketId ? { ...b, items: b.items.filter(i => i.id !== itemId) } : b));

      api.items.delete(itemId).catch(() => {});
  };

  const scrollToBucket = (id: string) => {
      setBuckets(prev => prev.map(b => b.id === id ? { ...b, isOpen: true } : b));
      setTimeout(() => {
          bucketRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const bucketIds = useMemo(() => buckets.map((b) => b.id), [buckets]);

  function SortableNavRow({ bucketId }: { bucketId: string }) {
    const bucket = buckets.find((b) => b.id === bucketId);
    const sortable = useSortable({ id: bucketId });
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

    if (!bucket) return null;

    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        data-testid={`nav-row-${bucket.id}`}
        onClick={() => scrollToBucket(bucket.id)}
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
        <span className="truncate flex-1">{bucket.name}</span>
        <span className="text-[10px] bg-sidebar-border px-1.5 rounded-sm">{bucket.items.length}</span>
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

            setBuckets((prev) => {
              const oldIndex = prev.findIndex((b) => b.id === active.id);
              const newIndex = prev.findIndex((b) => b.id === over.id);
              if (oldIndex === -1 || newIndex === -1) return prev;
              const reordered = arrayMove(prev, oldIndex, newIndex);

              api.discovery.reorder(activeProject.id, reordered.map(b => b.id)).catch(() => {});

              return reordered;
            });
          }}
        >
          <SortableContext items={bucketIds} strategy={verticalListSortingStrategy}>
            {bucketIds.map((id) => (
              <SortableNavRow key={id} bucketId={id} />
            ))}
          </SortableContext>
        </DndContext>

          <Button
            data-testid="button-add-bucket"
            variant="ghost"
            size="sm"
            className="w-full justify-start px-3 mt-2 text-xs text-muted-foreground hover:text-primary"
            onClick={() => {
              const name = window.prompt("New knowledge bucket", "New bucket");
              if (!name) return;

              const id = `bucket-${Date.now()}`;
              setBuckets((prev) => [
                {
                  id,
                  name,
                  isOpen: true,
                  items: [],
                  bucketMessages: [],
                },
                ...prev,
              ]);

              api.discovery.create(activeProject.id, { name }).then(created => {
                setBuckets(prev => prev.map(b => b.id === id ? { ...b, id: created.id, name: created.name } : b));
              }).catch(() => {});

              setTimeout(() => {
                bucketRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 50);
            }}
          >
            + New Knowledge Bucket
          </Button>
      </div>
  );

  return (
    <AppShell 
        navContent={SidebarContent} 
        navTitle="Knowledge Buckets"
        statusContent={
            <SummaryCard 
                title="Discovery Status"
                status="Seeded from the project summary. Next: capture evidence and open questions."
                done={[]}
                undone={["Add first evidence bucket"]}
                nextSteps={["Add sources", "Log assumptions"]}
            />
        }
        chatContent={
            <ChatWorkspace
                messages={messages}
                onSendMessage={(content) => {
                  const userMsg: Message = {
                    id: Date.now().toString(),
                    role: "user",
                    content,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  };
                  setMessages(prev => [...prev, userMsg]);

                  api.messages.create({
                    parentId: activeProject.id,
                    parentType: "discovery_page",
                    role: "user",
                    content: prependContext("discovery_page", content),
                    timestamp: userMsg.timestamp,
                  }).catch(() => {});
                }}
                saveDestinations={buckets.map((b) => ({ id: b.id, label: b.name }))}
                onSaveContent={(messageId, destinationId) => {
                    const msg = messages.find((m) => m.id === messageId);
                    if (!msg) return;

                    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, saved: true } : m)));

                    api.messages.update(messageId, { saved: true }).catch(() => {});

                    const noteTitle = msg.content.split("\n")[0]?.slice(0, 80) || "Saved chat";
                    const noteBody = msg.content;

                    addBucketItem(destinationId, {
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
                    {buckets.map((bucket, index) => (
                        <div key={bucket.id} ref={el => { if (el) bucketRefs.current[bucket.id] = el; }} className={`bg-background rounded-lg shadow-sm border border-border/40 border-t-[3px] ${ACCENT_COLORS[index % ACCENT_COLORS.length]}`}>
                            <div 
                                className="flex items-center px-6 py-3 cursor-pointer hover:bg-muted/5 transition-colors group"
                                onClick={() => toggleBucket(bucket.id)}
                            >
                                <div className={cn("text-muted-foreground transition-transform duration-200 mr-2", bucket.isOpen ? "rotate-90" : "")}>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                                <h2 className="text-sm font-bold font-heading text-foreground flex-1">
                                    {bucket.name}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden" data-testid={`progress-${bucket.id}`}>
                                        <div
                                            className="h-full bg-primary/80"
                                            style={{
                                                width: `${getBucketProgressPercent({
                                                    itemsCount: bucket.items.length,
                                                })}%`,
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            data-testid={`button-note-${bucket.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const title = window.prompt(`New note in "${bucket.name}"`, "Quick note");
                                                if (!title) return;
                                                const content = window.prompt("Note text", "");

                                                addBucketItem(bucket.id, {
                                                    id: `${Date.now()}`,
                                                    type: 'note',
                                                    title,
                                                    preview: (content || "").slice(0, 80) || "(empty)",
                                                    date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })
                                                });
                                            }}
                                            aria-label="Make a note"
                                            title="Make a note"
                                            type="button"
                                        >
                                            <StickyNote className="w-3.5 h-3.5" />
                                        </button>

                                        <input
                                            ref={(el) => { fileInputRefs.current[bucket.id] = el; }}
                                            className="hidden"
                                            data-testid={`input-file-${bucket.id}`}
                                            type="file"
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                                const file = e.currentTarget.files?.[0];
                                                if (!file) return;

                                                addBucketItem(bucket.id, {
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
                                            data-testid={`button-upload-${bucket.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRefs.current[bucket.id]?.click();
                                            }}
                                            aria-label="Upload a file"
                                            title="Upload a file"
                                            type="button"
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                            data-testid={`button-link-${bucket.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const url = window.prompt("Paste a link (URL)", "https://");
                                                if (!url) return;
                                                const title = window.prompt("Link name", url) || url;

                                                addBucketItem(bucket.id, {
                                                    id: `${Date.now()}`,
                                                    type: 'link',
                                                    title,
                                                    preview: url,
                                                    date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
                                                    url
                                                });
                                            }}
                                            aria-label="Link a file"
                                            title="Link a file"
                                            type="button"
                                        >
                                            <Link2 className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                            data-testid={`button-update-${bucket.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); }}
                                            aria-label="Update bucket"
                                            title="Update bucket"
                                            type="button"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <AnimatePresence initial={false}>
                                {bucket.isOpen && (
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
                                                        <ChatWorkspace
                                                            messages={(bucket.bucketMessages || []) as any}
                                                            onSendMessage={(content) => {
                                                                const userMsg: Message = {
                                                                    id: Date.now().toString(),
                                                                    role: "user",
                                                                    content,
                                                                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                                                };

                                                                const contextLines = [
                                                                    `Bucket: ${bucket.name}`,
                                                                    "Attachments:",
                                                                    ...((bucket.items || []).slice(0, 8).map((i) => `- [${i.type}] ${i.title}`)),
                                                                ].filter(Boolean);

                                                                const aiMsg: Message = {
                                                                    id: (Date.now() + 1).toString(),
                                                                    role: "ai",
                                                                    content: `Got it. I'm only using this bucket's context:\n\n${contextLines.join("\n")}\n\nYou said: ${content}`,
                                                                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                                                };

                                                                setBuckets((prev) =>
                                                                    prev.map((b) =>
                                                                        b.id === bucket.id
                                                                            ? {
                                                                                  ...b,
                                                                                  bucketMessages: [...(b.bucketMessages || []), userMsg, aiMsg],
                                                                              }
                                                                            : b
                                                                    )
                                                                );

                                                                api.messages.create({
                                                                  parentId: bucket.id,
                                                                  parentType: "discovery_bucket",
                                                                  role: "user",
                                                                  content: prependContext("discovery_bucket", content),
                                                                  timestamp: userMsg.timestamp,
                                                                }).catch(() => {});

                                                                api.messages.create({
                                                                  parentId: bucket.id,
                                                                  parentType: "discovery_bucket",
                                                                  role: "ai",
                                                                  content: aiMsg.content,
                                                                  timestamp: aiMsg.timestamp,
                                                                }).catch(() => {});
                                                            }}
                                                            className="h-full"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Attachments Column */}
                                            <div className="w-[20%] bg-muted/5 border-r border-border/50">
                                                <div className="h-full flex flex-col">
                                                    <div className="px-4 py-3 border-b border-border/50 text-[11px] uppercase tracking-wider text-muted-foreground" data-testid={`text-attachments-title-${bucket.id}`}>Memory</div>
                                                    <div className="flex-1 overflow-y-auto">
                                                        {(bucket.items || []).length === 0 ? (
                                                            <div className="px-4 py-3 text-sm text-muted-foreground" data-testid={`text-attachments-empty-${bucket.id}`}>No files, links, or notes yet.</div>
                                                        ) : (
                                                            <div className="divide-y">
                                                                {(bucket.items || []).map((item) => (
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
                                                                                            deleteBucketItem(bucket.id, item.id);
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
