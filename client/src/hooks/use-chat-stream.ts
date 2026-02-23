import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/queryClient";
import { API_BASE_URL } from "@/lib/config";
import type { Message } from "@/lib/types";

type UseChatStreamOptions = {
  parentId: string;
  parentType: string;
  onMessageComplete?: () => void;
};

type UseChatStreamReturn = {
  streamingMessage: Message | null;
  isStreaming: boolean;
  sendMessage: (content: string) => void;
};

export function useChatStream({
  parentId,
  parentType,
  onMessageComplete,
}: UseChatStreamOptions): UseChatStreamReturn {
  const queryClient = useQueryClient();
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isStreaming || !parentId) return;

      setIsStreaming(true);

      const streamId = `stream-${Date.now()}`;
      setStreamingMessage({
        id: streamId,
        role: "ai",
        content: "",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isStreaming: true,
      });

      try {
        const headers = await getAuthHeaders();
        const controller = new AbortController();
        abortRef.current = controller;

        const response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ parentId, parentType, content }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Chat request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr) as
                | { type: "token"; text: string }
                | { type: "done"; userMessageId: string; aiMessageId: string }
                | { type: "error"; message: string };

              if (event.type === "token") {
                accumulated += event.text;
                setStreamingMessage({
                  id: streamId,
                  role: "ai",
                  content: accumulated,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  isStreaming: true,
                });
              } else if (event.type === "done") {
                setStreamingMessage(null);
                setIsStreaming(false);
                queryClient.invalidateQueries({
                  queryKey: ["/api/messages", parentType, parentId],
                });
                onMessageComplete?.();
              } else if (event.type === "error") {
                setStreamingMessage({
                  id: streamId,
                  role: "ai",
                  content: `Sorry, I encountered an error: ${event.message}`,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  isStreaming: false,
                });
                setIsStreaming(false);
              }
            } catch {
              // skip malformed JSON lines
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStreamingMessage({
          id: `error-${Date.now()}`,
          role: "ai",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isStreaming: false,
        });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, parentId, parentType, queryClient, onMessageComplete]
  );

  return { streamingMessage, isStreaming, sendMessage };
}
