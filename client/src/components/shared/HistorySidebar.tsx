import { useState } from "react";
import { Clock, Circle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

export function HistorySidebar({ compact = false }: { compact?: boolean }) {
  const historyItems = [
    { id: 1, action: "Added Context", time: "2m ago", details: "Lease expiry update" },
    { id: 2, action: "Brief Refined", time: "15m ago", details: "Success criteria set" },
    { id: 3, action: "Saved to Discovery", time: "1h ago", details: "Competitor map link" },
    { id: 4, action: "Session Started", time: "2h ago", details: "Office relocation" },
    { id: 5, action: "Viewed Brief", time: "3h ago", details: "Context" },
    { id: 6, action: "Session Ended", time: "Yesterday", details: "Drafting" },
  ];

  return (
    <ScrollArea className="h-full">
        <div className="p-0 space-y-0">
            {historyItems.map((item, index) => (
                <div key={item.id} className="relative group px-4 py-3 hover:bg-sidebar-accent/50 transition-colors border-b border-sidebar-border/40 last:border-0 cursor-default">
                    <div className="flex items-start gap-3">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sidebar-primary/40 group-hover:bg-sidebar-primary transition-colors shrink-0" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-medium text-sidebar-foreground truncate">{item.action}</span>
                            <span className="text-[10px] text-muted-foreground truncate">{item.details}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/50 ml-auto shrink-0">{item.time}</span>
                    </div>
                </div>
            ))}
        </div>
    </ScrollArea>
  );
}
