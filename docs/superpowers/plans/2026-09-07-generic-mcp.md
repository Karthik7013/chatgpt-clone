# Generic MCP Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add generic, env-based MCP tool support to the Gemini chat route, keeping Gemini-only models.

**Architecture:** New `lib/mcp.ts` parses `MCP_SERVERS` JSON env, creates one `createMCPClient` per server per request (HTTP transport), merges namespaced tools with existing `weatherTool`, closes clients in `onFinish`/`onError`/`onAbort`. No frontend changes (chat-window already renders generic `tool-*`).

**Tech Stack:** Next.js 16 App Router, `ai@^7.0.93`, `@ai-sdk/mcp@^2.0.45`, `@ai-sdk/google@^4.0.64`, Zod.

## Global Constraints

- Gemini-only. Do NOT add OpenAI provider or change `model-selector.tsx` model list.
- MCP config is env-based, server-side only. Never expose keys to client.
- Keep existing `weatherTool`, `stopWhen: stepCountIs(5)`, `maxDuration = 60`, `createUIMessageStreamResponse` + `toUIMessageStream` protocol.
- Close every MCP client on finish/error/abort to avoid leaked sockets in serverless.
- One MCP server failure must not break the chat (log + continue with remaining tools).

---

### Task 1: lib/mcp.ts — config parsing + per-request client manager

**Files:**
- Create: `/home/karthi/workspace/chatgpt-clone/lib/mcp.ts`
- Test: manual via `npm run build` + runtime check (no test framework in repo)

**Interfaces:**
- Consumes: `process.env.MCP_SERVERS`, `process.env.MCP_ENABLED`, `process.env.MCP_TOOL_TIMEOUT_MS`
- Produces: `export type McpServerConfig = { name: string; url: string; apiKey?: string; type?: 'http' | 'sse' }`, `export async function loadMcpTools(): Promise<{ tools: Record<string, unknown>; closeAll: () => Promise<void> }>`, `export function parseMcpConfig(raw?: string): McpServerConfig[]`, `export function isMcpEnabled(): boolean`

- [ ] **Step 1: Create lib/mcp.ts with full implementation**

```typescript
import { createMCPClient } from "@ai-sdk/mcp";

export type McpServerConfig = {
  name: string;
  url: string;
  apiKey?: string;
  type?: "http" | "sse";
};

type McpClient = { close: () => Promise<void>; tools: (opts?: unknown) => Promise<Record<string, unknown>> };

export function isMcpEnabled(): boolean {
  const flag = process.env.MCP_ENABLED;
  if (flag !== undefined) return flag.toLowerCase() !== "false" && flag !== "0";
  return Boolean(process.env.MCP_SERVERS?.trim() || process.env.MCP_MARKET_TOOL_URL?.trim());
}

function sanitizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").slice(0, 40) || "mcp";
}

export function parseMcpConfig(raw?: string): McpServerConfig[] {
  const out: McpServerConfig[] = [];
  const push = (name: string, url: string, apiKey?: string, type?: "http" | "sse") => {
    if (!url || !/^https?:\/\//.test(url)) return;
    out.push({ name: sanitizeName(name), url: url.trim(), apiKey: apiKey?.trim() || undefined, type });
  };
  // Back-compat single-server vars (matches pasted snippet shape)
  if (process.env.MCP_MARKET_TOOL_URL?.trim()) {
    push("market", process.env.MCP_MARKET_TOOL_URL, process.env.MCP_MARKET_API_KEY);
  }
  const src = raw ?? process.env.MCP_SERVERS;
  if (src?.trim()) {
    try {
      const parsed = JSON.parse(src) as McpServerConfig[];
      if (Array.isArray(parsed)) {
        for (const s of parsed) {
          if (s && typeof s.url === "string") push(String(s.name ?? "mcp"), s.url, s.apiKey, s.type === "sse" ? "sse" : "http");
        }
      }
    } catch (err) {
      console.error("[mcp] Invalid MCP_SERVERS JSON, ignoring:", err);
    }
  }
  // De-dupe by url
  return [...new Map(out.map((s) => [s.url, s])).values()];
}

export async function loadMcpTools(): Promise<{ tools: Record<string, Email>; closeAll: () => Promise<void> }> {
  const tools: Record<string, Email> = {};
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
            ...(server.apiKey ? { headers: { Authorization: `Bearer ${server.apiKey}` } } : {}),
          },
        })) as unknown as McpClient;
        clients.push(client);
        const serverTools = await client.tools();
        for (const [toolName, def] of Object.entries(serverTools)) {
          const namespaced = `${server.name}__${toolName}`.slice(0, 64);
          if (!tools[namespaced]) tools[namespaced] = def as Email;
        }
      } catch (err) {
        console.error(`[mcp] ${server.name} (${server.url}) unavailable, continuing without it:`, err);
      }
    }),
  );
  const closeAll = async () => {
    await Promise.all(clients.map(async (c) => { try { await c.close(); } catch {} }));
  };
  return { tools, closeAll };
}
```

- [ ] **Step 2: Typecheck the new file**

Run: `npx tsc --noEmit`
Expected: PASS with no errors in `lib/mcp.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/mcp.ts
git commit -m "feat: add generic env-based MCP client manager"
```

### Task 2: app/api/chat/route.ts — merge MCP tools into streamText

**Files:**
- Modify: `/home/karthi/workspace/chatgpt-clone/app/api/chat/route.ts`
- Test: `npm run build`, manual dev test with/without env

**Interfaces:**
- Consumes: `loadMcpTools` from `@/lib/mcp`
- Produces: same `POST(req: Request)` signature, unchanged response protocol

- [ ] **Step 1: Update route to load + merge MCP tools**

Replace `tools: { weather: weatherTool }` block and add lifecycle hooks:

```typescript
import { loadMcpTools } from "@/lib/mcp";

// inside POST, before streamText:
const { tools: mcpTools, closeAll } = await loadMcpTools();

const result = streamText({
  model: google(selectedModel as string),
  system: SYSTEM_PROMPT,
  messages: await convertToModelMessages(messages),
  tools: {
    weather: weatherTool,
    ...mcpTools,
  },
  stopWhen: stepCountIs(5),
  onError: ({ error }) => {
    console.error("streamText error:", error);
    void closeAll();
  },
  onFinish: async () => {
    await closeAll();
  },
  onAbort: async () => {
    await closeAll();
  },
});
```

Keep everything else identical (`maxDuration`, `createUIMessageStreamResponse`, `toUIMessageStream` with `sendReasoning`/`sendSources`).

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: merge MCP marketplace tools into chat route"
```

### Task 3: .env.example + docs

**Files:**
- Modify: `/home/karthi/workspace/chatgpt-clone/.env.example`

- [ ] **Step 1: Append MCP env docs**

```bash
# --- Generic MCP support (server-side only, Gemini-only) ---
# JSON list of MCP servers. Keys never leave the server.
# MCP_SERVERS=[{"name":"market","url":"https://api.example-mcp.com/mcp","apiKey":"sk-..."}]
# Single-server back-compat (matches MCP marketplace snippet shape):
# MCP_MARKET_TOOL_URL=https://api.example-mcp.com/mcp
# MCP_MARKET_API_KEY=sk-...
# MCP_ENABLED=true
# MCP_TOOL_TIMEOUT_MS=10000
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "docs: document generic MCP env vars"
```
