import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { ChatWorkspace } from "@/components/shared/ChatWorkspace";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw } from "lucide-react";
import { getSelectedProject, subscribeToSelectedProject } from "@/lib/projectStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiProject } from "@/lib/api";
import { Message } from "@/lib/types";
import { useCoreQueries } from "@/hooks/use-core-queries";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { prependContext } = useCoreQueries();

  const { data: projects = [] } = useQuery<ApiProject[]>({
    queryKey: ["/api/projects"],
  });

  const initialSelected = getSelectedProject();
  const [activeProjectId, setActiveProjectId] = useState<string>(initialSelected.id);
  const [messages, setMessages] = useState<Message[]>([]);

  const { data: pageMessages } = useQuery({
    queryKey: ["/api/messages", "dashboard_page", activeProjectId],
    queryFn: () => api.messages.list("dashboard_page", activeProjectId),
    enabled: !!activeProjectId,
  });

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
    const unsub = subscribeToSelectedProject((p) => {
      setActiveProjectId(p.id);
      setMessages([]);
    });
    return () => unsub();
  }, []);

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  const executiveSummary = activeProject?.executiveSummary || "";
  const dashboardStatus = activeProject?.dashboardStatus;

  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!activeProject) return;
      const refreshed = (activeProject.executiveSummary || "")
        .replace("(Draft)", "(Draft • refreshed)")
        .replace("## Standing Question", `## Standing Question\n(Refreshed ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`);
      await api.projects.update(activeProject.id, { executiveSummary: refreshed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const handleSendMessage = async (content: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp,
    };

    setMessages(prev => [...prev, newMessage]);

    if (!activeProjectId) return;

    api.messages.create({
      parentId: activeProjectId,
      parentType: "dashboard_page",
      role: "user",
      content: prependContext("dashboard_page", content),
      timestamp,
      hasSaveableContent: false,
      saved: false,
    }).catch(() => {});

    setTimeout(() => {
      const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "I've noted that for the project dashboard.",
        timestamp: aiTimestamp,
        hasSaveableContent: false,
      };
      setMessages(prev => [...prev, aiMessage]);

      api.messages.create({
        parentId: activeProjectId,
        parentType: "dashboard_page",
        role: "ai",
        content: aiMessage.content,
        timestamp: aiTimestamp,
        hasSaveableContent: false,
        saved: false,
      }).catch(() => {});
    }, 1000);
  };

  return (
    <div className="h-screen w-screen bg-white text-foreground font-sans flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 pt-[60px] h-full overflow-hidden w-full">
        <div className="h-full w-full p-2">
          <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-2">
            <ResizablePanel defaultSize={60} minSize={40}>
              <div className="h-full flex flex-col gap-2">
                <div className="bg-background rounded-lg shadow-sm border border-border/40 overflow-hidden shrink-0">
                  <div className="p-4 border-b">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground" data-testid="text-dashboard-label">
                      Dashboard
                    </div>
                    <div className="text-xl font-bold font-heading truncate" data-testid="text-dashboard-project-title">
                      {activeProject?.name || "Project"}
                    </div>
                  </div>
                  <SummaryCard
                    title="Project Status"
                    status={dashboardStatus?.status || "No status available."}
                    done={dashboardStatus?.done || []}
                    undone={dashboardStatus?.undone || []}
                    nextSteps={dashboardStatus?.nextSteps || []}
                  />
                </div>

                <div className="flex-1 min-h-0 bg-background rounded-lg shadow-sm border border-border/40 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="text-sm font-bold font-heading" data-testid="text-exec-summary-title">
                          Executive Summary
                        </div>
                        <Button
                          data-testid="button-refresh-exec-summary"
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={() => refreshMutation.mutate()}
                          disabled={refreshMutation.isPending || !activeProject}
                        >
                          <RefreshCw className={`w-4 h-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                          Refresh
                        </Button>
                      </div>

                      <div
                        className="prose prose-sm max-w-none prose-headings:font-heading prose-headings:font-bold prose-h1:text-xl prose-h2:text-base prose-p:text-muted-foreground prose-p:leading-relaxed"
                        data-testid="text-exec-summary-body"
                      >
                        {!executiveSummary && (
                          <p className="text-sm text-muted-foreground">
                            This project is currently empty. Create Brief sections, Discovery categories, and Deliverable assets to get an executive summary.
                          </p>
                        )}
                        {!!executiveSummary && executiveSummary.split("\n").map((line, i) => {
                          if (line.startsWith("# ")) return <h1 key={i} className="mb-4">{line.replace("# ", "")}</h1>;
                          if (line.startsWith("## ")) return <h2 key={i} className="mt-6 mb-2 text-foreground">{line.replace("## ", "")}</h2>;
                          if (line.match(/^\d\./)) return <div key={i} className="ml-4 font-medium text-foreground py-1">{line}</div>;
                          if (!line.trim()) return <div key={i} className="h-2" />;
                          return <p key={i} className="my-2 text-sm">{line}</p>;
                        })}
                      </div>

                      <div className="mt-4 text-xs text-muted-foreground" data-testid="text-exec-summary-constraint">
                        Constrained to ~2 pages (placeholder). Output is generated from the standing prompt.
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle className="bg-transparent hover:bg-border/50 transition-colors w-[3px]" />

            <ResizablePanel defaultSize={40} minSize={25}>
              <div className="h-full bg-background rounded-lg shadow-sm border border-border/40 overflow-hidden flex flex-col">
                <ChatWorkspace
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  className="flex-1 min-h-0"
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}
