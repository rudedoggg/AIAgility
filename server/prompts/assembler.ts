import { storage } from "../storage";
import type { PromptBlockForLocation } from "@shared/schema";
import { formatForModel } from "./model-formatter";
import type { AssembledPrompt, PromptCategory } from "./types";
import { PROMPT_CATEGORIES } from "./types";
import { computeTokenBudget } from "./token-budget";

/**
 * Group blocks by category, maintaining the canonical category order:
 * identity → role → constraints → task → context_template
 */
function groupByCategory(blocks: PromptBlockForLocation[]): { category: PromptCategory; content: string }[] {
  const grouped: { category: PromptCategory; content: string }[] = [];

  for (const category of PROMPT_CATEGORIES) {
    const categoryBlocks = blocks.filter((b) => b.category === category);
    if (categoryBlocks.length > 0) {
      const combined = categoryBlocks.map((b) => b.content).join("\n\n");
      grouped.push({ category, content: combined });
    }
  }

  return grouped;
}

/**
 * Assemble a complete system prompt for a chat location.
 * Falls back to core_queries if no prompt blocks are configured.
 */
export async function assembleSystemPrompt(
  locationKey: string,
  providerName: string,
  fallbackPrompt?: string,
): Promise<AssembledPrompt> {
  const blocks = await storage.getBlocksForLocation(locationKey);

  // Fallback: if no blocks configured, use the legacy core_queries prompt
  if (blocks.length === 0) {
    const systemMessage = fallbackPrompt || "";
    return {
      systemMessage,
      tokenBudget: computeTokenBudget(systemMessage, providerName),
    };
  }

  const categoryBlocks = groupByCategory(blocks);
  const systemMessage = formatForModel(categoryBlocks, providerName);

  return {
    systemMessage,
    tokenBudget: computeTokenBudget(systemMessage, providerName),
  };
}
