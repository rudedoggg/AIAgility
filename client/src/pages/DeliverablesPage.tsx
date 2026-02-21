import { useEffect, useMemo, useState, useRef, useCallback } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiDeliverable, type ApiBucketItem, type ApiChatMessage } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { ChatWorkspace } from "@/components/shared/ChatWorkspace";
import { getSelectedProject, subscribeToSelectedProject } from "@/lib/projectStore";
import { Message, Deliverable } from "@/lib/types";
import { FileText, Download, Share2, CheckSquare, Edit3, ChevronRight, StickyNote, Upload, Link2, RefreshCw, Trash2, FileText as FileTextIcon } from "lucide-react";
import { cn, getProgressPercent } from "@/lib/utils";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type LocalDeliverable = Deliverable & { isOpen?: boolean; assetMessages?: Message[] };

export default function DeliverablesPage() {
  const queryClient = useQueryClient();
  const { prependContext } = useCoreQueries();
  const [activeProject, setActiveProject] = useState(getSelectedProject());

  const { data: apiDeliverables } = useQuery({
    queryKey: ["/api/projects", activeProject.id, "deliverables"],
    queryFn: () => api.deliverables.list(activeProject.id),
    enabled: !!activeProject.id,
  });

  const { data: pageMessages } = useQuery({
    queryKey: ["/api/messages", "deliverable_page", activeProject.id],
    queryFn: () => api.messages.list("deliverable_page", activeProject.id),
    enabled: !!activeProject.id,
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [deliverables, setDeliverables] = useState<LocalDeliverable[]>([]);
  const [deliverableItems, setDeliverableItems] = useState<Record<string, ApiBucketItem[]>>({});
  const [assetMessages, setAssetMessages] = useState<Record<string, Message[]>>({});
  const deliverableRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (pageMessages) {
      setMessages(pageMessages.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'ai',
        content: m.content,
        timestamp: m.timestamp,
        hasSaveableContent: m.hasSaveableContent,
        saved: m.saved,
      })));
    }
  }, [pageMessages]);

  useEffect(() => {
    if (apiDeliverables) {
      setDeliverables(prev => {
        const openState: Record<string, boolean> = {};
        prev.forEach(d => { openState[d.id] = !!d.isOpen; });

        return apiDeliverables.map(ad => ({
          id: ad.id,
          title: ad.title,
          subtitle: ad.subtitle,
          completeness: ad.completeness,
          status: ad.status as 'draft' | 'review' | 'final',
          lastEdited: "Recently",
          content: ad.content,
          engaged: ad.engaged,
          items: (deliverableItems[ad.id] || []).map(i => ({
            id: i.id,
            type: i.type as 'doc' | 'link' | 'chat' | 'note' | 'file',
            title: i.title,
            preview: i.preview,
            date: i.date,
            url: i.url || undefined,
            fileName: i.fileName || undefined,
            fileSizeLabel: i.fileSizeLabel || undefined,
          })),
          isOpen: openState[ad.id] ?? true,
          assetMessages: assetMessages[ad.id] || [],
        }));
      });
    }
  }, [apiDeliverables, deliverableItems, assetMessages]);

  useEffect(() => {
    const unsub = subscribeToSelectedProject((p) => {
      setActiveProject(p);
      setDeliverableItems({});
      setAssetMessages({});
    });
    return () => unsub();
  }, []);

  const fetchDeliverableItems = useCallback(async (deliverableId: string) => {
    if (deliverableItems[deliverableId]) return;
    try {
      const items = await api.items.list("deliverable", deliverableId);
      setDeliverableItems(prev => ({ ...prev, [deliverableId]: items }));
    } catch {
    }
  }, [deliverableItems]);

  const fetchAssetMessages = useCallback(async (deliverableId: string) => {
    if (assetMessages[deliverableId]) return;
    try {
      const msgs = await api.messages.list("deliverable_asset", deliverableId);
      setAssetMessages(prev => ({
        ...prev,
        [deliverableId]: msgs.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'ai',
          content: m.content,
          timestamp: m.timestamp,
          hasSaveableContent: m.hasSaveableContent,
          saved: m.saved,
        })),
      }));
    } catch {
    }
  }, [assetMessages]);

  const toggleDeliverable = (id: string) => {
    setDeliverables(prev => prev.map(d => 
        d.id === id ? { ...d, isOpen: !d.isOpen } : d
    ));
    const doc = deliverables.find(d => d.id === id);
    if (doc && !doc.isOpen) {
      fetchDeliverableItems(id);
      fetchAssetMessages(id);
    }
  };

  const addDeliverableItem = (deliverableId: string, item: NonNullable<Deliverable["items"]>[number]) => {
    setDeliverableItems(prev => ({
      ...prev,
      [deliverableId]: [
        {
          id: item.id,
          parentId: deliverableId,
          parentType: "deliverable",
          type: item.type,
          title: item.title,
          preview: item.preview,
          date: item.date,
          url: (item as any).url || null,
          fileName: (item as any).fileName || null,
          fileSizeLabel: (item as any).fileSizeLabel || null,
          sortOrder: 0,
        },
        ...(prev[deliverableId] || []),
      ],
    }));

    api.items.create({
      parentId: deliverableId,
      parentType: "deliverable",
      type: item.type,
      title: item.title,
      preview: item.preview,
      date: item.date,
      url: (item as any).url || null,
      fileName: (item as any).fileName || null,
      fileSizeLabel: (item as any).fileSizeLabel || null,
    }).catch(() => {});
  };

  const deleteDeliverableItem = (deliverableId: string, itemId: string) => {
    setDeliverableItems(prev => ({
      ...prev,
      [deliverableId]: (prev[deliverableId] || []).filter(i => i.id !== itemId),
    }));

    api.items.delete(itemId).catch(() => {});
  };

  const handleSendMessage = async (content: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp,
    };

    setMessages(prev => [...prev, newMessage]);

    api.messages.create({
      parentId: activeProject.id,
      parentType: "deliverable_page",
      role: "user",
      content: prependContext("deliverable_page", content),
      timestamp,
      hasSaveableContent: false,
      saved: false,
    }).catch(() => {});

    setTimeout(() => {
      const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "I've updated the deliverable with those details.",
        timestamp: aiTimestamp,
        hasSaveableContent: true,
      };
      setMessages(prev => [...prev, aiMessage]);

      api.messages.create({
        parentId: activeProject.id,
        parentType: "deliverable_page",
        role: "ai",
        content: aiMessage.content,
        timestamp: aiTimestamp,
        hasSaveableContent: true,
        saved: false,
      }).catch(() => {});
    }, 1000);
  };

  const scrollToDeliverable = (id: string) => {
      setDeliverables(prev => prev.map(d => d.id === id ? { ...d, isOpen: true } : d));
      fetchDeliverableItems(id);
      fetchAssetMessages(id);
      setTimeout(() => {
          deliverableRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const deliverableIds = useMemo(() => deliverables.map((d) => d.id), [deliverables]);

  function SortableNavRow({ deliverableId }: { deliverableId: string }) {
    const doc = deliverables.find((d) => d.id === deliverableId);
    const sortable = useSortable({ id: deliverableId });
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

    if (!doc) return null;

    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        data-testid={`nav-row-${doc.id}`}
        onClick={() => scrollToDeliverable(doc.id)}
        className={cn(
          "flex flex-col gap-0.5 px-3 py-2 rounded-sm cursor-pointer transition-colors border-l-2 select-none",
          "border-transparent text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50",
          isDragging && "bg-sidebar-accent/60 text-foreground"
        )}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.85 : 1,
        }}
      >
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="truncate">{doc.title}</span>
          {doc.engaged && <CheckSquare className="w-3 h-3 text-primary shrink-0" />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-wider">{doc.status}</span>
        </div>
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

            setDeliverables((prev) => {
              const oldIndex = prev.findIndex((d) => d.id === active.id);
              const newIndex = prev.findIndex((d) => d.id === over.id);
              if (oldIndex === -1 || newIndex === -1) return prev;
              const reordered = arrayMove(prev, oldIndex, newIndex);
              api.deliverables.reorder(activeProject.id, reordered.map(d => d.id)).catch(() => {});
              return reordered;
            });
          }}
        >
          <SortableContext items={deliverableIds} strategy={verticalListSortingStrategy}>
            {deliverableIds.map((id) => (
              <SortableNavRow key={id} deliverableId={id} />
            ))}
          </SortableContext>
        </DndContext>

          <Button
            data-testid="button-add-asset"
            variant="ghost"
            size="sm"
            className="w-full justify-start px-3 mt-2 text-xs text-muted-foreground hover:text-primary"
            onClick={() => {
              const name = window.prompt("New deliverable", "New deliverable");
              if (!name) return;

              const tempId = `deliv-${Date.now()}`;
              const newDeliverable: LocalDeliverable = {
                id: tempId,
                title: name,
                subtitle: "(draft)",
                completeness: 0,
                status: "draft",
                lastEdited: "Just now",
                content: "# " + name + "\n\n(TBD)",
                items: [],
                engaged: false,
                isOpen: true,
                assetMessages: [],
              };

              setDeliverables((prev) => [newDeliverable, ...prev]);

              api.deliverables.create(activeProject.id, {
                title: name,
                subtitle: "(draft)",
                completeness: 0,
                status: "draft",
                content: "# " + name + "\n\n(TBD)",
                engaged: false,
              }).then((created) => {
                setDeliverables(prev => prev.map(d => d.id === tempId ? { ...d, id: created.id } : d));
              }).catch(() => {});

              setTimeout(() => {
                deliverableRefs.current[tempId]?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 50);
            }}
          >
            + New Deliverable
          </Button>
      </div>
  );

  return (
    <AppShell 
        navContent={SidebarContent} 
        navTitle="Assets"
        statusContent={
            <SummaryCard 
                title="Deliverables Status"
                status="Seeded from the project summary. Next: draft the first deliverable."
                done={[]}
                undone={["Create deliverable outline"]}
                nextSteps={["Draft v1", "Attach memory items"]}
            />
        }
        chatContent={
            <ChatWorkspace
                messages={messages}
                onSendMessage={handleSendMessage}
                saveDestinations={deliverables.map((d) => ({ id: d.id, label: d.title }))}
                onSaveContent={(messageId, destinationId) => {
                    const msg = messages.find((m) => m.id === messageId);
                    if (!msg) return;

                    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, saved: true } : m)));

                    api.messages.update(messageId, { saved: true }).catch(() => {});

                    const now = new Date();
                    const label = now.toLocaleDateString([], { month: "short", day: "numeric" });
                    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    const firstLine = msg.content.split("\n")[0]?.trim();

                    addDeliverableItem(destinationId, {
                        id: `ver-${Date.now()}`,
                        type: "doc",
                        title: `v${Date.now()} • ${time}${firstLine ? ` • ${firstLine.slice(0, 48)}` : ""}`,
                        preview: msg.content,
                        date: label,
                    } as any);
                }}
                className="flex-1 min-h-0"
            />
        }
    >
         <div className="bg-background h-full">
             <ScrollArea className="h-full">
                 <div className="flex flex-col gap-3 p-3">
                    {deliverables.map((doc, index) => (
                        <div key={doc.id} ref={el => { if (el) deliverableRefs.current[doc.id] = el; }} className={`bg-background rounded-lg shadow-sm border border-border/40 border-t-[3px] ${ACCENT_COLORS[index % ACCENT_COLORS.length]}`}>
                            <div 
                                className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-muted/5 transition-colors group bg-background sticky top-0 z-10"
                                onClick={() => toggleDeliverable(doc.id)}
                            >
                                <div className={cn("text-muted-foreground transition-transform duration-200 mr-2", doc.isOpen ? "rotate-90" : "")}>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <FileText className="w-4 h-4 text-primary shrink-0" />
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-bold font-heading text-foreground truncate" data-testid={`text-asset-title-${doc.id}`}>{doc.title}</h2>
                                        {doc.subtitle ? (
                                            <div className="text-xs text-muted-foreground truncate" data-testid={`text-asset-subtitle-${doc.id}`}>{doc.subtitle}</div>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden" data-testid={`progress-${doc.id}`}>
                                        <div
                                            className="h-full bg-primary/80"
                                            style={{
                                                width: `${getProgressPercent({
                                                    explicitPercent: doc.completeness,
                                                    itemsCount: ((doc.items || []) as any[]).length,
                                                })}%`,
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            data-testid={`button-note-${doc.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const title = window.prompt(`New note in "${doc.title}"`, "Quick note");
                                                if (!title) return;
                                                const content = window.prompt("Note text", "");

                                                addDeliverableItem(doc.id, {
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
                                            ref={(el) => { fileInputRefs.current[doc.id] = el; }}
                                            className="hidden"
                                            data-testid={`input-file-${doc.id}`}
                                            type="file"
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                                const file = e.currentTarget.files?.[0];
                                                if (!file) return;

                                                addDeliverableItem(doc.id, {
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
                                            data-testid={`button-upload-${doc.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRefs.current[doc.id]?.click();
                                            }}
                                            aria-label="Upload a file"
                                            title="Upload a file"
                                            type="button"
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                            data-testid={`button-link-${doc.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const url = window.prompt("Paste a link (URL)", "https://");
                                                if (!url) return;
                                                const title = window.prompt("Link name", url) || url;

                                                addDeliverableItem(doc.id, {
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
                                            data-testid={`button-update-${doc.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); }}
                                            aria-label="Update asset"
                                            title="Update asset"
                                            type="button"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence initial={false}>
                                {(doc.isOpen) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="flex h-[500px] border-t border-border/50">
                                            {/* Left Content Column */}
                                            <div className="w-[60%] border-r border-border/50">
                                                <div className="h-full flex flex-col">
                                                    <div className="flex-1 min-h-0">
                                                        <ChatWorkspace
                                                            messages={((doc.assetMessages || []) as any)}
                                                            onSendMessage={(content) => {
                                                                const userMsg = {
                                                                    id: Date.now().toString(),
                                                                    role: "user" as const,
                                                                    content,
                                                                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                                                };

                                                                const versions = (((doc.items || []) as any[]).filter((i: any) => i.type === 'doc' || i.type === 'link'));
                                                                const current = versions[0];

                                                                const contextLines = [
                                                                    `Deliverable: ${doc.title}`,
                                                                    doc.subtitle ? `Subtitle: ${doc.subtitle}` : null,
                                                                    `Status: ${doc.status}`,
                                                                    current ? `Current version: ${current.title}` : "Current version: (none yet)",
                                                                    "Deliverable versions:",
                                                                    ...versions.slice(0, 8).map((i: any) => `- [${i.type}] ${i.title}`),
                                                                    "\nInstruction: This asset chat is for editing the deliverable. Propose changes as a patch or a new version.",
                                                                ].filter(Boolean);

                                                                const aiMsg = {
                                                                    id: (Date.now() + 1).toString(),
                                                                    role: "ai" as const,
                                                                    content: `I'll help edit this deliverable. I'm only using this deliverable's versions + context:\n\n${contextLines.join("\n")}\n\nYou said: ${content}\n\nIf you want, reply with "save as new version" and I'll format the update to paste into a new version.`,
                                                                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                                                };

                                                                setAssetMessages(prev => ({
                                                                    ...prev,
                                                                    [doc.id]: [...(prev[doc.id] || []), userMsg, aiMsg],
                                                                }));

                                                                api.messages.create({
                                                                    parentId: doc.id,
                                                                    parentType: "deliverable_asset",
                                                                    role: "user",
                                                                    content: prependContext("deliverable_asset", content),
                                                                    timestamp: userMsg.timestamp,
                                                                    hasSaveableContent: false,
                                                                    saved: false,
                                                                }).catch(() => {});

                                                                api.messages.create({
                                                                    parentId: doc.id,
                                                                    parentType: "deliverable_asset",
                                                                    role: "ai",
                                                                    content: aiMsg.content,
                                                                    timestamp: aiMsg.timestamp,
                                                                    hasSaveableContent: false,
                                                                    saved: false,
                                                                }).catch(() => {});
                                                            }}
                                                            className="h-full"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Deliverable Column */}
                                            <div className="w-[20%] bg-muted/5 border-r border-border/50">
                                                <div className="h-full flex flex-col">
                                                    <div className="px-4 py-3 border-b border-border/50 text-[11px] uppercase tracking-wider text-muted-foreground" data-testid={`text-deliverable-title-${doc.id}`}>Deliverable</div>
                                                    <div className="flex-1 overflow-y-auto">
                                                        {((doc.items || []) as any[]).length === 0 ? (
                                                            <div className="px-4 py-3 text-sm text-muted-foreground" data-testid={`text-deliverable-empty-${doc.id}`}>No versions yet. Use chat to draft and save the first version.</div>
                                                        ) : (
                                                            <div className="divide-y">
                                                                {((doc.items || []) as any[])
                                                                    .filter((i: any) => i.type === 'doc' || i.type === 'link')
                                                                    .map((item: any, idx: number) => (
                                                                    <div key={item.id} className="group flex items-start gap-3 px-4 py-3">
                                                                        <div className="mt-0.5 text-muted-foreground group-hover:text-primary transition-colors">
                                                                            {item.type === 'doc' && <FileTextIcon className="w-4 h-4" />}
                                                                            {item.type === 'link' && <Link2 className="w-4 h-4" />}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <div className="min-w-0">
                                                                                    <div className="text-sm font-medium text-foreground truncate" data-testid={`text-deliverable-version-name-${item.id}`}>{item.title}</div>
                                                                                    <div className="text-[10px] text-muted-foreground" data-testid={`text-deliverable-version-meta-${item.id}`}>Version {((doc.items || []) as any[]).filter((v: any) => v.type === 'doc' || v.type === 'link').length - idx} • {item.date}</div>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 shrink-0">
                                                                                    <button
                                                                                        data-testid={`button-delete-version-${item.id}`}
                                                                                        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            deleteDeliverableItem(doc.id, item.id);
                                                                                        }}
                                                                                        aria-label="Delete version"
                                                                                        title="Delete version"
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

                                            {/* Right Content: History */}
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
