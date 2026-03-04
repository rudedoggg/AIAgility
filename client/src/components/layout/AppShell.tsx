import { Header } from "./Header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface AppShellProps {
    children: React.ReactNode;
    /** @deprecated Nav content is no longer rendered in the new 2-column layout. */
    navContent?: React.ReactNode;
    /** @deprecated Nav title is no longer rendered in the new 2-column layout. */
    navTitle?: string;
    statusContent: React.ReactNode;
    chatContent: React.ReactNode;
}

export function AppShell({ children, statusContent, chatContent }: AppShellProps) {
  return (
    <div className="h-screen w-screen bg-gray-100 text-foreground font-sans flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 pt-[60px] h-full overflow-hidden w-full">
        <div className="h-full w-full p-2">
         <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-2">
            {/* Left Column: Status & Main Content Items */}
            <ResizablePanel defaultSize={35} minSize={25}>
              <div className="h-full flex flex-col gap-2">
                 <div className="shrink-0 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                    {/* The SummaryCard doesn't need ScrollArea because it doesn't grow infinitely */}
                    {statusContent}
                 </div>
                 
                 <div className="flex-1 min-h-0 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                    {children}
                 </div>
              </div>
            </ResizablePanel>

            <ResizableHandle className="bg-transparent hover:bg-border/50 transition-colors w-[3px]" />

            {/* Right Column: AI Chat */}
            <ResizablePanel defaultSize={65} minSize={40}>
                <div className="h-full bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col min-h-0">
                    {chatContent}
                </div>
            </ResizablePanel>
         </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}
