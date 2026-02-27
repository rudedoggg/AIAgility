import type { AIMessage } from "../ai/types";
import type { ModelConfig, TokenBudget } from "./types";
import { MODEL_CONFIGS } from "./types";

/** Estimate token count using chars/4 heuristic (~10% accuracy, sufficient with headroom). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function getModelConfig(providerName: string): ModelConfig {
  return MODEL_CONFIGS[providerName] || MODEL_CONFIGS.anthropic;
}

/** Compute token budget for assembled system prompt and history. */
export function computeTokenBudget(
  systemMessage: string,
  providerName: string,
): TokenBudget {
  const config = getModelConfig(providerName);
  return {
    systemTokens: estimateTokens(systemMessage),
    historyTokens: 0,
    maxSystemTokens: config.systemTokenBudget,
    maxHistoryTokens: config.historyTokenBudget,
  };
}

/**
 * Window conversation history to fit within token budget.
 * Keeps the most recent messages that fit, always preserving the latest message.
 */
export function windowConversationHistory(
  messages: AIMessage[],
  providerName: string,
): AIMessage[] {
  const config = getModelConfig(providerName);
  const budget = config.historyTokenBudget;

  let totalTokens = 0;
  const result: AIMessage[] = [];

  // Walk backwards from most recent, accumulating until budget exceeded
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (totalTokens + msgTokens > budget && result.length > 0) {
      break;
    }
    totalTokens += msgTokens;
    result.unshift(messages[i]);
  }

  return result;
}
