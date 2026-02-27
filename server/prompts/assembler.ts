import { storage } from "../storage";
import type { PromptBlockForLocation } from "@shared/schema";
import { formatForModel } from "./model-formatter";
import type { AssembledPrompt, PromptCategory } from "./types";
import { PROMPT_CATEGORIES } from "./types";
import { computeTokenBudget, estimateTokens, getModelConfig } from "./token-budget";
import { loadContextForLocation } from "./context-loaders";
import type { ContextParams } from "./context-loaders";

/**
 * Group blocks by category, maintaining the canonical category order:
 * identity → role → constraints → task → context_template
 *
 * Core categories are merged into one entry each. context_template blocks
 * are kept as individual entries so token-budget truncation can shed them
 * one at a time.
 */
function groupByCategory(blocks: PromptBlockForLocation[]): { category: PromptCategory; content: string }[] {
  const grouped: { category: PromptCategory; content: string }[] = [];

  for (const category of PROMPT_CATEGORIES) {
    const categoryBlocks = blocks.filter((b) => b.category === category);
    if (categoryBlocks.length === 0) continue;

    if (category === "context_template") {
      for (const block of categoryBlocks) {
        grouped.push({ category, content: block.content });
      }
    } else {
      const combined = categoryBlocks.map((b) => b.content).join("\n\n");
      grouped.push({ category, content: combined });
    }
  }

  return grouped;
}

/**
 * Replace {{variable.name}} patterns in block content with values from context data.
 * Unresolved variables become empty strings so no template syntax leaks to the AI.
 */
const TEMPLATE_VAR_REGEX = /\{\{(\w+(?:\.\w+)*)\}\}/g;

function resolveTemplateVariables(
  blocks: { category: PromptCategory; content: string }[],
  contextData: Record<string, string>,
): { category: PromptCategory; content: string }[] {
  return blocks.map((block) => ({
    category: block.category,
    content: block.content.replace(TEMPLATE_VAR_REGEX, (_match, varName: string) => {
      return contextData[varName] ?? "";
    }),
  }));
}

/**
 * Format blocks and enforce token budget. Context_template blocks are shed from
 * the end when the formatted prompt exceeds maxTokens. Returns the final
 * formatted string so callers don't need to format again.
 */
function formatWithBudget(
  blocks: { category: PromptCategory; content: string }[],
  providerName: string,
  maxTokens: number,
): string {
  const formatted = formatForModel(blocks, providerName);

  // No context blocks to shed — return as-is
  const hasContext = blocks.some((b) => b.category === "context_template");
  if (!hasContext || estimateTokens(formatted) <= maxTokens) {
    return formatted;
  }

  // Over budget — shed context_template blocks from the end
  const coreBlocks = blocks.filter((b) => b.category !== "context_template");
  const contextBlocks = blocks.filter((b) => b.category === "context_template");

  const kept = [...contextBlocks];
  while (kept.length > 0) {
    kept.pop();
    const candidatePrompt = formatForModel([...coreBlocks, ...kept], providerName);
    if (estimateTokens(candidatePrompt) <= maxTokens) {
      return candidatePrompt;
    }
  }

  // Still over budget — return core blocks only
  return formatForModel(coreBlocks, providerName);
}

/**
 * Assemble a complete system prompt for a chat location.
 * Falls back to core_queries if no prompt blocks are configured.
 * When contextParams is provided, loads project data and resolves {{template.variables}}.
 */
export async function assembleSystemPrompt(
  locationKey: string,
  providerName: string,
  fallbackPrompt?: string,
  contextParams?: ContextParams,
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

  let categoryBlocks = groupByCategory(blocks);

  // Inject project context into template variables
  if (contextParams) {
    const contextData = await loadContextForLocation(contextParams);
    categoryBlocks = resolveTemplateVariables(categoryBlocks, contextData);
  }

  // Format and enforce token budget (sheds context_template blocks if over limit)
  const config = getModelConfig(providerName);
  const systemMessage = formatWithBudget(categoryBlocks, providerName, config.systemTokenBudget);

  return {
    systemMessage,
    tokenBudget: computeTokenBudget(systemMessage, providerName),
  };
}
