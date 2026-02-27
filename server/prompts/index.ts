import type { AIMessage } from "../ai/types";
import { assembleSystemPrompt } from "./assembler";
import { windowConversationHistory } from "./token-budget";
import type { ContextParams } from "./context-loaders";

export type AssemblePromptOptions = {
  locationKey: string;
  conversationHistory: AIMessage[];
  providerName: string;
  fallbackPrompt?: string;
  parentId?: string;
  parentType?: string;
  projectId?: string;
};

/**
 * Public API: Assemble a complete prompt for an AI chat interaction.
 *
 * 1. Loads prompt blocks for this location (from prompt_locations)
 * 2. Loads project context for this location (when parentId/parentType/projectId provided)
 * 3. Applies model-specific formatting (XML for Claude, MD for GPT)
 * 4. Resolves {{template.variables}} in blocks with project data
 * 5. Falls back to core_queries if no blocks are configured
 * 6. Windows conversation history to fit token budget
 * 7. Returns AIMessage[] ready to send to the provider
 */
export async function assemblePrompt(
  options: AssemblePromptOptions,
): Promise<AIMessage[]> {
  const { locationKey, conversationHistory, providerName, fallbackPrompt, parentId, parentType, projectId } = options;

  // Build context params when all three fields are present
  const contextParams: ContextParams | undefined =
    parentId && parentType && projectId
      ? { parentId, parentType, projectId }
      : undefined;

  const assembled = await assembleSystemPrompt(locationKey, providerName, fallbackPrompt, contextParams);

  // Window conversation history to fit token budget
  const windowedHistory = windowConversationHistory(conversationHistory, providerName);

  const messages: AIMessage[] = [];

  if (assembled.systemMessage) {
    messages.push({ role: "system", content: assembled.systemMessage });
  }

  messages.push(...windowedHistory);

  return messages;
}

export { assembleSystemPrompt } from "./assembler";
export { estimateTokens, windowConversationHistory } from "./token-budget";
export { formatForModel } from "./model-formatter";
export type { AssembledPrompt, TokenBudget, ModelConfig, PromptCategory } from "./types";
export { PROMPT_CATEGORIES, MODEL_CONFIGS } from "./types";
export type { ContextData, ContextParams } from "./context-loaders";
