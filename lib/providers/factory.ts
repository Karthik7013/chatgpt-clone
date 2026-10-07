import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { PROVIDERS } from "./provider-config";

export function parseModelIdentifier(id: string): { providerId: string; modelId: string } {
  const colonIndex = id.indexOf(":");
  if (colonIndex === -1) {
    return { providerId: "kilo", modelId: id };
  }
  return {
    providerId: id.slice(0, colonIndex),
    modelId: id.slice(colonIndex + 1),
  };
}

export function createModel(identifier: string): LanguageModel {
  const { providerId, modelId } = parseModelIdentifier(identifier);

  if (!modelId) {
    throw new Error(`Invalid model identifier: "${identifier}". Expected format: "provider:modelId"`);
  }

  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) {
    throw new Error(`Unknown provider: "${providerId}" in "${identifier}"`);
  }

  const apiKey = process.env[provider.envKey]?.trim();
  if (!apiKey) {
    throw new Error(`API key not configured for ${provider.name}. Set ${provider.envKey} in .env.local`);
  }

  let actualModelId: string;
  if (modelId === "free" || modelId === "auto") {
    const freeModels = provider.models.filter((m) => m.id.endsWith(":free"));
    if (freeModels.length === 0) {
      throw new Error(`No free models configured for provider "${providerId}"`);
    }
    actualModelId = freeModels[0].id;
  } else {
    actualModelId = modelId;
  }

  const openai = createOpenAI({
    baseURL: provider.baseURL,
    apiKey,
    ...(provider.headers ? { headers: provider.headers } : {}),
  });

  return openai.chat(actualModelId);
}