import type { AIProvider } from "./types";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";

let cachedProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = (process.env.AI_PROVIDER || "anthropic").toLowerCase();

  switch (providerName) {
    case "anthropic":
      cachedProvider = new AnthropicProvider();
      break;
    case "openai":
      cachedProvider = new OpenAIProvider();
      break;
    default:
      throw new Error(`Unknown AI_PROVIDER: ${providerName}. Use "anthropic" or "openai".`);
  }

  return cachedProvider;
}

export type { AIMessage, AIProvider, ChatRequest } from "./types";
