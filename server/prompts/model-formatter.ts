import type { PromptCategory } from "./types";

/** Category-to-XML tag mapping for Anthropic/Claude formatting. */
const CATEGORY_XML_TAGS: Record<PromptCategory, string> = {
  identity: "identity",
  role: "role",
  constraints: "constraints",
  task: "task",
  context_template: "context",
};

/** Category-to-markdown header mapping for OpenAI/GPT formatting (CTCO pattern). */
const CATEGORY_MD_HEADERS: Record<PromptCategory, string> = {
  identity: "Context",
  role: "Role",
  constraints: "Constraints",
  task: "Task",
  context_template: "Context Data",
};

/** Behavioral preambles — model-specific quirk corrections (NOT admin-managed). */
const BEHAVIORAL_PREAMBLES: Record<string, string> = {
  anthropic:
    "Keep responses focused and proportional to the question asked. Do not over-engineer or add unsolicited suggestions beyond the scope of what was asked.",
  openai:
    "If a query is ambiguous, present 2-3 labeled interpretations and let the user choose rather than guessing. Stay focused on the specific scope requested.",
};

type CategoryBlock = {
  category: PromptCategory;
  content: string;
};

/**
 * Format assembled prompt blocks into model-optimized structure.
 * Anthropic: XML tags. OpenAI: Markdown CTCO pattern.
 */
export function formatForModel(
  blocks: CategoryBlock[],
  providerName: string,
): string {
  const formatter = providerName === "openai" ? formatMarkdown : formatXml;
  const formatted = formatter(blocks);
  const preamble = BEHAVIORAL_PREAMBLES[providerName] || "";
  return preamble ? `${preamble}\n\n${formatted}` : formatted;
}

function formatXml(blocks: CategoryBlock[]): string {
  return blocks
    .map((block) => {
      const tag = CATEGORY_XML_TAGS[block.category] || block.category;
      return `<${tag}>\n${block.content.trim()}\n</${tag}>`;
    })
    .join("\n\n");
}

function formatMarkdown(blocks: CategoryBlock[]): string {
  return blocks
    .map((block) => {
      const header = CATEGORY_MD_HEADERS[block.category] || block.category;
      return `## ${header}\n${block.content.trim()}`;
    })
    .join("\n\n");
}
