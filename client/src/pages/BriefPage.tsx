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
import { api, type ApiBriefSection, type ApiBucketItem } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { ChatWorkspace } from "@/components/shared/ChatWorkspace";
import { getSelectedProject, subscribeToSelectedProject } from "@/lib/projectStore";
import { Message, Section } from "@/lib/types";
import { ChevronRight, Target, Flag, Users, AlertTriangle, Circle, ChevronDown, StickyNote, Upload, Link2, RefreshCw, Trash2, FileText as FileTextIcon } from "lucide-react";
import { cn, getProgressPercent } from "@/lib/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
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

function getSectionIcon(id: string) {
    switch (id) {
        case 'context': return <Flag className="w-3.5 h-3.5" />;
        case 'objective': return <Target className="w-3.5 h-3.5" />;
        case 'stakeholders': return <Users className="w-3.5 h-3.5" />;
        case 'constraints': return <AlertTriangle className="w-3.5 h-3.5" />;
        default: return <Circle className="w-3.5 h-3.5" />;
    }
}

type LocalSection = Section;

function BriefSectionChat({ sectionId, sectionName }: { sectionId: string; sectionName: string }) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);

  const { data: bucketMsgs } = useQuery({
    queryKey: ["/api/messages", "brief_section", sectionId],
    queryFn: () => api.messages.list("brief_section", sectionId),
    enabled: !!sectionId,
  });

  useEffect(() => {
    if (bucketMsgs) {
      setMessages(bucketMsgs.map(m => ({
        id: m.id,
        role: m.role as "user" | "ai",
        content: m.content,
        timestamp: m.timestamp,
        hasSaveableContent: m.hasSaveableContent,
        saved: m.saved,
      })));
    }
  }, [bucketMsgs]);

  const { streamingMessage, isStreaming, sendMessage } = useChatStream({
    parentId: sectionId,
    parentType: "brief_section",
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

export default function BriefPage() {
  const queryClient = useQueryClient();
  const [activeProject, setActiveProject] = useState(getSelectedProject());

  const { data: briefSections } = useQuery({
    queryKey: ["/api/projects", activeProject.id, "brief"],
    queryFn: () => api.brief.list(activeProject.id),
    enabled: !!activeProject.id,
  });

  const { data: pageMessages } = useQuery({
    queryKey: ["/api/messages", "brief_page", activeProject.id],
    queryFn: () => api.messages.list("brief_page", activeProject.id),
    enabled: !!activeProject.id,
  });

  const { data: projectData } = useQuery({
    queryKey: ["/api/projects", activeProject.id],
    queryFn: () => api.projects.get(activeProject.id),
    enabled: !!activeProject.id,
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [sections, setSections] = useState<LocalSection[]>([]);
  const [sectionItems, setSectionItems] = useState<Record<string, ApiBucketItem[]>>({});
  const sectionRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
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
    if (briefSections) {
      setSections(prev => {
        const openState: Record<string, boolean> = {};
        prev.forEach(s => { openState[s.id] = !!s.isOpen; });

        return briefSections.map(gs => ({
          id: gs.id,
          genericName: gs.genericName,
          subtitle: gs.subtitle,
          completeness: gs.completeness,
          totalItems: gs.totalItems,
          completedItems: gs.completedItems,
          content: gs.content,
          items: (sectionItems[gs.id] || []).map(i => ({
            id: i.id,
            type: i.type as 'doc' | 'link' | 'chat' | 'note' | 'file',
            title: i.title,
            preview: i.preview,
            date: i.date,
            url: i.url || undefined,
            fileName: i.fileName || undefined,
            fileSizeLabel: i.fileSizeLabel || undefined,
          })),
          isOpen: openState[gs.id] || false,
        }));
      });
    }
  }, [briefSections, sectionItems]);

  useEffect(() => {
    const unsub = subscribeToSelectedProject((p) => {
      setActiveProject(p);
      setSectionItems({});
    });
    return () => unsub();
  }, []);

  const fetchSectionItems = useCallback(async (sectionId: string) => {
    if (sectionItems[sectionId]) return;
    try {
      const items = await api.items.list("brief", sectionId);
      setSectionItems(prev => ({ ...prev, [sectionId]: items }));
    } catch {
    }
  }, [sectionItems]);

  const { streamingMessage, isStreaming, sendMessage: sendPageMessage } = useChatStream({
    parentId: activeProject.id,
    parentType: "brief_page",
  });

  const displayMessages = useMemo(() => {
    const result = [...messages];
    if (streamingMessage) result.push(streamingMessage);
    return result;
  }, [messages, streamingMessage]);

  const handleSendMessage = (content: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, {
      id: `local-${Date.now()}`,
      role: 'user' as const,
      content,
      timestamp,
    }]);
    sendPageMessage(content);
  };

  const toggleSection = (id: string) => {
      setSections(prev => prev.map(s => {
        if (s.id === id) {
          const willOpen = !s.isOpen;
          if (willOpen) {
            fetchSectionItems(id);
          }
          return { ...s, isOpen: willOpen };
        }
        return s;
      }));
  };

  const addSectionItem = (sectionId: string, item: NonNullable<Section["items"]>[number]) => {
      setSectionItems(prev => ({
        ...prev,
        [sectionId]: [{ ...item, parentId: sectionId, parentType: "brief", url: (item as any).url || null, fileName: (item as any).fileName || null, fileSizeLabel: (item as any).fileSizeLabel || null, sortOrder: 0 } as ApiBucketItem, ...(prev[sectionId] || [])],
      }));

      api.items.create({
        parentId: sectionId,
        parentType: "brief",
        type: item.type,
        title: item.title,
        preview: item.preview,
        date: item.date,
        url: (item as any).url || null,
        fileName: (item as any).fileName || null,
        fileSizeLabel: (item as any).fileSizeLabel || null,
      }).catch(() => {});
  };

  const deleteSectionItem = (sectionId: string, itemId: string) => {
      setSectionItems(prev => ({
        ...prev,
        [sectionId]: (prev[sectionId] || []).filter(i => i.id !== itemId),
      }));

      api.items.delete(itemId).catch(() => {});
  };

  const scrollToSection = (id: string) => {
      setSections(prev => prev.map(s => {
        if (s.id === id && !s.isOpen) {
          fetchSectionItems(id);
          return { ...s, isOpen: true };
        }
        return s;
      }));
      setTimeout(() => {
          sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);

  function SortableNavRow({ sectionId }: { sectionId: string }) {
    const section = sections.find((s) => s.id === sectionId);
    const sortable = useSortable({ id: sectionId });
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

    if (!section) return null;

    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        data-testid={`nav-row-${section.id}`}
        onClick={() => scrollToSection(section.id)}
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
        {getSectionIcon(section.id)}
        <span className="truncate">{section.genericName}</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">drag</span>
      </div>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    setSections((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const reordered = arrayMove(prev, oldIndex, newIndex);

      api.brief.reorder(activeProject.id, reordered.map(s => s.id)).catch(() => {});

      return reordered;
    });
  };

  const handleAddSection = () => {
    const name = window.prompt("New brief section", "New section");
    if (!name) return;

    const tempId = `section-${Date.now()}`;
    const newSection: LocalSection = {
      id: tempId,
      genericName: name,
      subtitle: "(draft)",
      completeness: 0,
      totalItems: 0,
      completedItems: 0,
      content: "",
      items: [],
      isOpen: true,
    };

    setSections((prev) => [newSection, ...prev]);

    api.brief.create(activeProject.id, {
      genericName: name,
      subtitle: "(draft)",
      completeness: 0,
      totalItems: 0,
      completedItems: 0,
      content: "",
    }).then((created) => {
      setSections(prev => prev.map(s => s.id === tempId ? { ...s, id: created.id } : s));
    }).catch(() => {});

    setTimeout(() => {
      sectionRefs.current[tempId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const summaryStatus = projectData?.dashboardStatus?.status || "Seeded from the project summary. Next: make the brief explicit.";
  const summaryDone = projectData?.dashboardStatus?.done || ["Project seeded"];
  const summaryUndone = projectData?.dashboardStatus?.undone || ["Define objective", "List constraints"];
  const summaryNextSteps = projectData?.dashboardStatus?.nextSteps || ["Create brief sections", "Add stakeholders"];

  const SidebarContent = (
      <div className="space-y-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            {sectionIds.map((id) => (
              <SortableNavRow key={id} sectionId={id} />
            ))}
          </SortableContext>
        </DndContext>

          <Button
            data-testid="button-add-section"
            variant="ghost"
            size="sm"
            className="w-full justify-start px-3 mt-2 text-xs text-muted-foreground hover:text-primary"
            onClick={handleAddSection}
          >
            + Add Brief Section
          </Button>
      </div>
  );

  const getSectionItemsList = (sectionId: string) => sectionItems[sectionId] || [];

  return (
    <AppShell
        navContent={SidebarContent}
        navTitle="Sections"
        statusContent={
            <SummaryCard
                title="Brief Status"
                status={summaryStatus}
                done={summaryDone}
                undone={summaryUndone}
                nextSteps={summaryNextSteps}
            />
        }
        chatContent={
            <ChatWorkspace
                messages={displayMessages}
                onSendMessage={handleSendMessage}
                isStreaming={isStreaming}
                saveDestinations={sections.map((s) => ({ id: s.id, label: s.genericName }))}
                onSaveContent={(messageId, destinationId) => {
                    const msg = messages.find((m) => m.id === messageId);
                    if (!msg) return;

                    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, saved: true } : m)));

                    const noteTitle = msg.content.split("\n")[0]?.slice(0, 80) || "Saved chat";
                    const noteBody = msg.content;

                    addSectionItem(destinationId, {
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
        {/* Bottom: All Brief Sections */}
        <div className="bg-background h-full">
            <ScrollArea className="h-full">
                <div className="flex flex-col gap-3 p-3">
                    {sections.map((section, index) => {
                        const items = getSectionItemsList(section.id);
                        return (
                        <div key={section.id} ref={el => { if (el) sectionRefs.current[section.id] = el; }} className={`bg-background rounded-lg shadow-sm border border-border/40 border-t-[3px] ${ACCENT_COLORS[index % ACCENT_COLORS.length]}`}>
                            <div
                                className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-muted/5 transition-colors group"
                                onClick={() => toggleSection(section.id)}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={cn("text-muted-foreground transition-transform duration-200", section.isOpen ? "rotate-90" : "")}>
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                    <h2 className="text-sm font-bold text-foreground font-heading">{section.genericName}</h2>
                                    <span className="text-sm text-muted-foreground font-normal px-2">—</span>
                                    <span className="text-sm text-muted-foreground">{section.subtitle}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden" data-testid={`progress-${section.id}`}>
                                        <div
                                            className="h-full bg-primary/80"
                                            style={{
                                                width: `${getProgressPercent({
                                                    explicitPercent: section.completeness,
                                                    completedItems: section.completedItems,
                                                    totalItems: section.totalItems,
                                                    itemsCount: items.length,
                                                })}%`,
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            data-testid={`button-note-${section.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const title = window.prompt(`New note in "${section.genericName}"`, "Quick note");
                                                if (!title) return;
                                                const content = window.prompt("Note text", "");

                                                addSectionItem(section.id, {
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
                                            ref={(el) => { fileInputRefs.current[section.id] = el; }}
                                            className="hidden"
                                            data-testid={`input-file-${section.id}`}
                                            type="file"
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                                const file = e.currentTarget.files?.[0];
                                                if (!file) return;

                                                addSectionItem(section.id, {
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
                                            data-testid={`button-upload-${section.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRefs.current[section.id]?.click();
                                            }}
                                            aria-label="Upload a file"
                                            title="Upload a file"
                                            type="button"
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            data-testid={`button-link-${section.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const url = window.prompt("Paste a link (URL)", "https://");
                                                if (!url) return;
                                                const title = window.prompt("Link name", url) || url;

                                                addSectionItem(section.id, {
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
                                            data-testid={`button-update-${section.id}`}
                                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); }}
                                            aria-label="Update section"
                                            title="Update section"
                                            type="button"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence initial={false}>
                                {section.isOpen && (
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
                                                        <BriefSectionChat
                                                            sectionId={section.id}
                                                            sectionName={section.genericName}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Attachments Column */}
                                            <div className="w-[20%] bg-muted/5 border-r border-border/50">
                                                <div className="h-full flex flex-col">
                                                    <div className="px-4 py-3 border-b border-border/50 text-[11px] uppercase tracking-wider text-muted-foreground" data-testid={`text-attachments-title-${section.id}`}>Memory</div>
                                                    <div className="flex-1 overflow-y-auto">
                                                        {items.length === 0 ? (
                                                            <div className="px-4 py-3 text-sm text-muted-foreground" data-testid={`text-attachments-empty-${section.id}`}>No files, links, or notes yet.</div>
                                                        ) : (
                                                            <div className="divide-y">
                                                                {items.map((item) => (
                                                                    <div key={item.id} className="group flex items-start gap-3 px-4 py-3">
                                                                        <div className="mt-0.5 text-muted-foreground group-hover:text-primary transition-colors">
                                                                            {(item.type === 'file' || item.type === 'doc') && <FileTextIcon className="w-4 h-4" />}
                                                                            {item.type === 'link' && <Link2 className="w-4 h-4" />}
                                                                            {item.type === 'note' && <StickyNote className="w-4 h-4" />}
                                                                            {item.type === 'chat' && <ChevronDown className="w-4 h-4" />}
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
                                                                                            deleteSectionItem(section.id, item.id);
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
                        );
                    })}

                    <div className="p-8 text-center">
                        <Button variant="outline" className="text-muted-foreground border-dashed">
                            Add New Brief Section
                        </Button>
                    </div>
                </div>
            </ScrollArea>
        </div>
    </AppShell>
  );
}
