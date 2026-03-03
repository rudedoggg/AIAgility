import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type PromptPreviewProps = {
  locationKey: string;
};

export function PromptPreview({ locationKey }: PromptPreviewProps): React.ReactElement {
  const { data: preview, isLoading } = useQuery({
    queryKey: ["admin", "prompt-preview", locationKey],
    queryFn: () => api.promptPreview.get(locationKey),
  });

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">Loading preview...</div>
    );
  }

  if (!preview || !preview.systemMessage) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center italic">(empty)</div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          ~{preview.tokenEstimate} tokens
        </Badge>
        <Badge variant="outline" className="text-xs">
          {preview.provider}
        </Badge>
      </div>
      <ScrollArea className="h-[300px] rounded-md border">
        <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
          {preview.systemMessage}
        </pre>
      </ScrollArea>
    </div>
  );
}
