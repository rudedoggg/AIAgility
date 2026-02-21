import { Header } from "./Header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface AppShellProps {
    children: React.ReactNode;
    navContent: React.ReactNode;
    navTitle?: string;
    statusContent: React.ReactNode;
    chatContent: React.ReactNode;
}

export function AppShell({ children, navContent, navTitle, statusContent, chatContent }: AppShellProps) {
  return (
    <div className="h-screen w-screen bg-muted/60 text-foreground font-sans flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 pt-[60px] h-full overflow-hidden w-full">
         <ResizablePanelGroup direction="vertical" className="h-full w-full p-2 gap-2">
            {/* Top Section: Status (left) & AI Chat (right) */}
            <ResizablePanel defaultSize={45} minSize={30} maxSize={60}>
                <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-2">
                    <ResizablePanel defaultSize={18} minSize={12} maxSize={28} className="flex flex-col h-full">
                        <div className="flex-1 flex flex-col min-h-0 bg-background rounded-lg shadow-sm border border-border/40 overflow-hidden">
                            <ScrollArea className="flex-1">
                                {statusContent}
                            </ScrollArea>
                        </div>
                    </ResizablePanel>
                    
                    <ResizableHandle className="bg-transparent hover:bg-border/50 transition-colors w-[3px]" />

                    <ResizablePanel defaultSize={82} className="flex flex-col h-full">
                        <div className="flex-1 min-h-0 bg-background rounded-lg shadow-sm border border-border/40 overflow-hidden flex flex-col">
                            {chatContent}
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle className="bg-transparent hover:bg-border/50 transition-colors h-[3px]" />

            {/* Bottom Section: Nav (left) & Content (right) */}
            <ResizablePanel defaultSize={55}>
                <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-2">
                    <ResizablePanel defaultSize={18} minSize={12} maxSize={28} className="flex flex-col h-full">
                        <div className="flex-1 flex flex-col min-h-0 bg-background rounded-lg shadow-sm border border-border/40 overflow-hidden">
                            <div className="px-4 py-3 border-b bg-muted/20 h-[40px] flex items-center shrink-0">
                                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{navTitle || "Navigation"}</h2>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-2">
                                    {navContent}
                                </div>
                            </ScrollArea>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle className="bg-transparent hover:bg-border/50 transition-colors w-[3px]" />

                    <ResizablePanel defaultSize={82}>
                        <div className="h-full bg-background rounded-lg shadow-sm border border-border/40 overflow-hidden">
                            {children}
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </ResizablePanel>
         </ResizablePanelGroup>
      </div>
    </div>
  );
}
