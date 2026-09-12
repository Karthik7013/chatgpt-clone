export interface ModelEntry {
  id: string;
  name: string;
  description: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseURL: string;
  envKey: string;
  models: ModelEntry[];
  headers?: Record<string, string>;
}
