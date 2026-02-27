import type { AIMessage } from "../ai/types";
import { assembleSystemPrompt } from "./assembler";
import { windowConversationHistory } from "./token-budget";

export type AssemblePromptOptions = {
  locationKey: string;
  conversationHistory: AIMessage[];
  providerName: string;
  fallbackPrompt?: string;
};

/**
 * Public API: Assemble a complete prompt for an AI chat interaction.
 *
 * 1. Loads prompt blocks for this location (from prompt_locations)
 * 2. Applies model-specific formatting (XML for Claude, MD for GPT)
 * 3. Falls back to core_queries if no blocks are configured
 * 4. Windows conversation history to fit token budget
 * 5. Returns AIMessage[] ready to send to the provider
 */
export async function assemblePrompt(
  options: AssemblePromptOptions,
): Promise<AIMessage[]> {
  const { locationKey, conversationHistory, providerName, fallbackPrompt } = options;

  const assembled = await assembleSystemPrompt(locationKey, providerName, fallbackPrompt);

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
