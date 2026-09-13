import { createMCPClient } from "@ai-sdk/mcp";

export type McpServerConfig = {
  name: string;
  url: string;
  apiKey?: string;
  type?: "http" | "sse";
};

type McpClient = {
  close: () => Promise<void>;
  tools: (opts?: unknown) => Promise<Record<string, unknown>>;
};

let cachedTools: Record<string, unknown> | null = null;
let cachedClose: (() => Promise<void>) | null = null;

export async function loadMcpTools(): Promise<{
  tools: Record<string, unknown>;
  closeAll: () => Promise<void>;
}> {
  if (cachedTools) {
    return { tools: cachedTools, closeAll: cachedClose ?? (async () => {}) };
  }

  cachedTools = {};
  cachedClose = async () => {};

  return { tools: cachedTools, closeAll: cachedClose };
}
