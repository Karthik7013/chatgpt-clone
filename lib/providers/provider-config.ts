export type ProviderConfig = {
  id: string;
  name: string;
  baseURL: string;
  envKey: string;
  headers?: Record<string, string>;
  models: {
    id: string;
    name: string;
    description: string;
  }[];
};

/**
 * The provider configurations available in the application.
 * Kept in a single file for maintainability - adding/removing providers
 * only requires editing this file.
 * All models listed below are free-tier only (marked with :free suffix).
 */
export const PROVIDERS: ProviderConfig[] = [
  {
    id: "kilo",
    name: "Kilo Gateway",
    baseURL: "https://api.kilo.ai/api/gateway",
    envKey: "KILO_API_KEY",
    models: [
      { id: "kilo-auto/free", name: "Kilo Auto Free", description: "Auto-router picks best free model" },
      { id: "nvidia/nemotron-3.5-lightning:free", name: "Nemotron 3.5 Lightning", description: "NVIDIA, 1M, fast" },
      { id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "Nemotron 3 Ultra", description: "NVIDIA, 1M" },
      { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super", description: "NVIDIA MoE, 262K" },
      { id: "poolside/laguna-s-2.1:free", name: "Laguna S 2.1", description: "Poolside coding, 262K" },
      { id: "poolside/laguna-xs-2.1:free", name: "Laguna XS 2.1", description: "Poolside coding, fast" },
      { id: "cohere/north-mini-code:free", name: "North Mini Code", description: "Cohere coding, 256K" },
      { id: "dots-studio/dots-3-note-preview:free", name: "Dots3 Note", description: "Dots Studio, 512K" },
      { id: "inclusionai/ling-3.0-flash-sante:free", name: "Ling 3.0 Flash Sante", description: "Fast general, 262K" },
      { id: "liquid/lfm-2.5-2.6b:free", name: "LFM2.5 2.6B", description: "LiquidAI, 66K, fast" },
      { id: "stepfun/step-3.7-flash:free", name: "Step 3.7 Flash", description: "StepFun, efficient" },
      { id: "apodex/apodex-1.1-mini:free", name: "Apodex 1.1 Mini", description: "Apodex, fast" },
      { id: "thinkingmachines/inkling-small:free", name: "Inkling Small", description: "Thinking Machines, fast" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    envKey: "OPENROUTER_API_KEY",
    headers: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "ChatGPT Clone",
    },
    models: [
      { id: "apodex/apodex-1.1-mini:free", name: "Apodex 1.1 Mini (Free)", description: "Apodex, fast, free tier" },
      { id: "google/gemma-4-26b-a4b-it:free", name: "Gemma 4 26B (Free)", description: "Google, free tier" },
      { id: "google/gemma-4-31b-it:free", name: "Gemma 4 31B (Free)", description: "Google, free tier" },
      { id: "cohere/north-mini-code:free", name: "North Mini Code (Free)", description: "Cohere coding, 256K, free tier" },
      { id: "liquid/lfm-2.5-2.6b:free", name: "LFM2.5 2.6B (Free)", description: "LiquidAI, 66K, free tier" },
      { id: "nvidia/nemotron-3.5-lightning:free", name: "Nemotron 3.5 Lightning (Free)", description: "NVIDIA, 1M, free tier" },
    ],
  },
];

/**
 * Default model used when the client does not send one.
 * Must be `providerId:modelId` and the provider must have its API key set in `.env.local`.
 */
export const DEFAULT_MODEL_ID = "kilo:kilo-auto/free";

/**
 * Check whether a provider's API key is configured (non-empty).
 */
export function isProviderConfigured(providerId: string): boolean {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return false;
  return !!process.env[provider.envKey]?.trim();
}

/**
 * Get all configured providers (those with API keys set).
 */
export function getConfiguredProviders(): ProviderConfig[] {
  return PROVIDERS.filter((p) => isProviderConfigured(p.id));
}

/**
 * First model of the first configured provider. Falls back to
 * DEFAULT_MODEL_ID when nothing is configured (server will 400 clearly).
 */
export function getDefaultModelId(): string {
  const first = getConfiguredProviders()[0];
  if (!first || first.models.length === 0) return DEFAULT_MODEL_ID;
  return `${first.id}:${first.models[0].id}`;
}
