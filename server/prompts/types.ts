export type PromptCategory = "identity" | "role" | "constraints" | "task" | "context_template";

export const PROMPT_CATEGORIES: PromptCategory[] = [
  "identity",
  "role",
  "constraints",
  "task",
  "context_template",
];

export type ModelConfig = {
  name: string;
  maxContextTokens: number;
  systemTokenBudget: number;
  historyTokenBudget: number;
};

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  anthropic: {
    name: "anthropic",
    maxContextTokens: 200_000,
    systemTokenBudget: 8_000,
    historyTokenBudget: 16_000,
  },
  openai: {
    name: "openai",
    maxContextTokens: 128_000,
    systemTokenBudget: 8_000,
    historyTokenBudget: 16_000,
  },
};

export type TokenBudget = {
  systemTokens: number;
  historyTokens: number;
  maxSystemTokens: number;
  maxHistoryTokens: number;
};

export type AssembledPrompt = {
  systemMessage: string;
  tokenBudget: TokenBudget;
};
