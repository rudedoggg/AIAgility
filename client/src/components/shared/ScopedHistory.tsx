import { Clock, Circle, User, Bot, FileEdit, FolderPlus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface HistoryItem {
    id: string;
    action: string;
    user: string; // "AI" or "User Name"
    timestamp: string;
    type: 'edit' | 'add' | 'comment' | 'create';
}

interface ScopedHistoryProps {
    items?: HistoryItem[];
    className?: string;
}

const defaultItems: HistoryItem[] = [
    { id: '1', action: "Updated content", user: "AI", timestamp: "2m ago", type: 'edit' },
    { id: '2', action: "Refined details", user: "JD", timestamp: "15m ago", type: 'edit' },
    { id: '3', action: "Added item", user: "JD", timestamp: "1h ago", type: 'add' },
    { id: '4', action: "Created section", user: "JD", timestamp: "2h ago", type: 'create' },
];

export function ScopedHistory({ items = defaultItems, className }: ScopedHistoryProps) {
  return (
    <div className={cn("h-full flex flex-col bg-muted/5 border-l", className)}>
        <div className="p-3 border-b h-[40px] flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Activity History</h3>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
                {items.map((item, index) => (
                    <div key={item.id} className="relative pl-4 group">
                        {/* Timeline line */}
                        {index !== items.length - 1 && (
                            <div className="absolute left-[5px] top-2 bottom-[-24px] w-[1px] bg-border group-hover:bg-primary/30 transition-colors" />
                        )}
                        
                        {/* Dot */}
                        <div className={cn(
                            "absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full border-2 transition-colors z-10",
                            item.user === 'AI' 
                                ? "bg-background border-primary" 
                                : "bg-primary border-primary"
                        )} />
                        
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-foreground">{item.action}</span>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <span className={cn("font-medium", item.user === "AI" ? "text-primary" : "")}>{item.user}</span>
                                <span>•</span>
                                <span>{item.timestamp}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    </div>
  );
}
