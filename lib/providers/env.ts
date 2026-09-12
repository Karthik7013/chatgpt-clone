import { PROVIDERS } from "./config";

export function getProviderKey(providerId: string): string | undefined {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return undefined;
  return process.env[provider.envKey];
}

export function isProviderConfigured(providerId: string): boolean {
  const key = getProviderKey(providerId);
  return !!key && key.length > 0;
}
