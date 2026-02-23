export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface AIProvider {
  streamCompletion(messages: AIMessage[]): AsyncIterable<string>;
}

export type ChatRequest = {
  parentId: string;
  parentType: string;
  content: string;
};
