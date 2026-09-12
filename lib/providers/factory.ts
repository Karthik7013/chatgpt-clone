import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { PROVIDERS } from "./config";

export function parseModelIdentifier(id: string): { providerId: string; modelId: string } {
  const colonIndex = id.indexOf(":");
  if (colonIndex === -1) {
    return { providerId: "openrouter", modelId: id };
  }
  return {
    providerId: id.slice(0, colonIndex),
    modelId: id.slice(colonIndex + 1),
  };
}

export function createModel(identifier: string): LanguageModel {
  const { providerId, modelId } = parseModelIdentifier(identifier);

  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) {
    throw new Error(`Unknown provider: "${providerId}" in "${identifier}"`);
  }

  const apiKey = process.env[provider.envKey];
  if (!apiKey) {
    throw new Error(`API key not configured for ${provider.name}. Set ${provider.envKey} in .env.local`);
  }

  const openai = createOpenAI({
    baseURL: provider.baseURL,
    apiKey,
    ...(provider.headers ? { headers: provider.headers } : {}),
  });

  return openai.chat(modelId);
}
