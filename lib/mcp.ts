import { createMCPClient } from "@ai-sdk/mcp";

export type McpServerConfig = {
  name: string;
  url: string;
  apiKey?: string;
  type?: "http" | "sse";
};

const MCP_SERVERS: McpServerConfig[] = [
  { name: "local", url: "http://localhost:3000/api/mcp" },
  { name: "context7", url: "https://mcp.context7.com/mcp" },
];

type McpClient = {
  close: () => Promise<void>;
  tools: (opts?: unknown) => Promise<Record<string, unknown>>;
};

function sanitizeName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .slice(0, 40) || "mcp"
  );
}

export function parseMcpConfig(): McpServerConfig[] {
  return MCP_SERVERS.map((s) => ({
    ...s,
    name: sanitizeName(s.name),
    url: s.url.trim(),
    apiKey: s.apiKey?.trim() || undefined,
    type: s.type ?? "http",
  }));
}

export async function loadMcpTools(): Promise<{
  tools: Record<string, unknown>;
  closeAll: () => Promise<void>;
}> {
  const tools: Record<string, unknown> = {};
  const clients: McpClient[] = [];

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
          initializationOptions: { timeout: 10000 },
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
