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

export function isMcpEnabled(): boolean {
  const flag = process.env.MCP_ENABLED;
  if (flag !== undefined)
    return flag.toLowerCase() !== "false" && flag !== "0" && flag !== "";
  return Boolean(process.env.MCP_SERVERS?.trim());
}

function sanitizeName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .slice(0, 40) || "mcp"
  );
}

export function parseMcpConfig(raw?: string): McpServerConfig[] {
  const out: McpServerConfig[] = [];
  const push = (
    name: string,
    url: string,
    apiKey?: string,
    type?: "http" | "sse",
  ) => {
    if (!url || !/^https?:\/\//.test(url.trim())) return;
    out.push({
      name: sanitizeName(name),
      url: url.trim(),
      apiKey: apiKey?.trim() || undefined,
      type,
    });
  };

  const src = raw ?? process.env.MCP_SERVERS;
  if (src?.trim()) {
    try {
      const parsed = JSON.parse(src) as McpServerConfig[];
      if (Array.isArray(parsed)) {
        for (const s of parsed) {
          if (s && typeof s.url === "string") {
            push(
              String(s.name ?? "mcp"),
              s.url,
              s.apiKey,
              s.type === "sse" ? "sse" : "http",
            );
          }
        }
      }
    } catch (err) {
      console.error("[mcp] Invalid MCP_SERVERS JSON, ignoring:", err);
    }
  }

  // De-dupe by url
  return [...new Map(out.map((s) => [s.url, s])).values()];
}

export async function loadMcpTools(): Promise<{
  tools: Record<string, unknown>;
  closeAll: () => Promise<void>;
}> {
  const tools: Record<string, unknown> = {};
  const clients: McpClient[] = [];

  if (!isMcpEnabled()) return { tools, closeAll: async () => {} };

  const servers = parseMcpConfig();

  await Promise.all(
    servers.map(async (server) => {
      try {
        const client = (await createMCPClient({
          transport: {
            type: server.type ?? "http",
            url: server.url,
            ...(server.apiKey
              ? { headers: { Authorization: `Bearer ${server.apiKey}` } }
              : {}),
          },
        })) as unknown as McpClient;
        clients.push(client);
        const serverTools = await client.tools();
        for (const [toolName, def] of Object.entries(serverTools)) {
          const namespaced = `${server.name}__${toolName}`.slice(0, 64);
          if (!tools[namespaced]) tools[namespaced] = def;
        }
      } catch (err) {
        console.error(
          `[mcp] ${server.name} (${server.url}) unavailable, continuing without it:`,
          err,
        );
      }
    }),
  );

  const closeAll = async () => {
    await Promise.all(
      clients.map(async (c) => {
        try {
          await c.close();
        } catch {
          // ignore close errors in serverless cleanup
        }
      }),
    );
  };

  return { tools, closeAll };
}
