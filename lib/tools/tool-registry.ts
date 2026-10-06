import { asSchema, tool } from "ai";
import { z } from "zod";

import { fetchPageContent } from "@/lib/tools/html-to-text";

/** How many tool-call round trips the model may take before it must answer. */
export const MAX_STEPS = 10;

/**
 * Tool metadata - shared by server (which tools the model may call) and client
 * (which card renders a tool's result).
 *
 * Keep this file dependency-free. It is imported from both server and client
 * code, so pulling in `zod`, `ai`, or React here would break the RSC boundary
 * or ship server code to the browser.
 */
export type ToolMeta = {
  /** Key passed to `streamText`, and looked up in the tool-card registry. */
  name: string;
  /** Human-readable name shown in the UI. */
  label: string;
  /**
   * Disabled tools are fully written and type-checked, but are not offered to
   * the model. Flip this to `true` to switch one on — no other change needed.
   */
  enabled: boolean;
};

/**
 * Tool implementations - mapped by name for the AI SDK.
 * Imported from individual tool files in `lib/tools/server/`.
 */
export const getTimeTool = tool({
  description:
    "Get the current date and time. Use it whenever the user asks what time or day it is.",
  inputSchema: asSchema(
    z.object({
      timezone: z
        .string()
        .optional()
        .describe(
          "IANA timezone name, e.g. Europe/Berlin or America/New_York. Defaults to UTC.",
        ),
    }),
  ),
  async execute({ timezone }) {
    const tz = timezone?.trim() || "UTC";
    try {
      const text = `Current time: ${new Intl.DateTimeFormat("en-GB", {
        dateStyle: "full",
        timeStyle: "long",
        timeZone: tz,
      }).format(new Date())} (${tz})`;
      return { content: [{ type: "text", text }] };
    } catch {
      return {
        content: [
          {
            type: "text",
            text: `Unknown timezone "${tz}". Use an IANA name like Europe/Berlin.`,
          },
        ],
        isError: true,
      };
    }
  },
});

export const webSearchTool = tool({
  description:
    "Search the web and read full page content. Returns search results with fetched content from each page. Use when the user asks about current events, recent news, or anything you need real-time information about. Always cite sources using [1], [2], etc.",
  inputSchema: asSchema(
    z.object({
      query: z.string().describe("The search query"),
      numResults: z
        .number()
        .optional()
        .describe("Number of results to fetch (default 3, max 5)"),
    }),
  ),
  async execute({ query, numResults }) {
    const size = Math.min(
      Math.max(numResults ?? 3, 1),
      5,
    );

    try {
      const res = await fetch(
        `https://freeserp.ai/api.php?q=${encodeURIComponent(query)}&size=${size}`,
        { signal: AbortSignal.timeout(15_000) },
      );
      if (!res.ok) throw new Error(`Search API returned ${res.status}`);

      const data = (await res.json()) as {
        ok: boolean;
        results: Array<{
          title: string;
          url: string;
          ai_summary: string;
          domain: string;
        }>;
      };
      if (!data.ok) throw new Error("Search returned no results");
      if (!data.results?.length) {
        return { results: [], message: "No results found for this query." };
      }

      // Fetch every page in parallel; a page we cannot read still yields a
      // result so the model keeps the citation slot.
      const results = await Promise.all(
        data.results.map(async (r, i) => ({
          index: i + 1,
          title: r.title,
          url: r.url,
          domain: r.domain,
          summary: r.ai_summary,
          content: (await fetchPageContent(r.url)) ?? "[Could not fetch page content]",
        })),
      );

      return { results };
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        throw new Error("Web search timed out. Try a simpler query.");
      }
      throw new Error(err instanceof Error ? err.message : "Web search failed");
    }
  },
});

export const webFetchTool = tool({
  description:
    "Fetch and read the content of a specific web page URL. Use when the user wants to read a specific article or page.",
  inputSchema: asSchema(
    z.object({
      url: z.string().describe("The URL to fetch"),
    }),
  ),
  async execute({ url }) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(20_000),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ChatGPT-Clone/1.0)",
          "Accept": "text/html,application/xhtml+xml,text/plain",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      const contentType = res.headers.get("content-type") ?? "";
      const body = await res.text();

      if (contentType.includes("application/json")) {
        return {
          url,
          content: JSON.stringify(JSON.parse(body), null, 2).slice(2000),
          type: "json",
        };
      }
      if (contentType.includes("text/plain")) {
        return { url, content: body.slice(2000), type: "text" };
      }

      const text = await fetchPageContent(body);
      if (!text) {
        return { url, content: "[Page returned empty content]", type: "empty" };
      }
      return { url, content: text.slice(2000), type: "html" };
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        throw new Error("Page fetch timed out.");
      }
      throw new Error(err instanceof Error ? err.message : "Failed to fetch URL");
    }
  },
});

/**
 * Unified tool registry - contains both metadata AND implementations.
 * Tools the model is currently allowed to call.
 */
export const TOOL_REGISTRY: ToolMeta[] = [
  { name: "get-time", label: "Time", enabled: true },
  { name: "web-search", label: "Search", enabled: true },
  { name: "web-fetch", label: "Fetch", enabled: true },

  // Implemented but switched off. Flip `enabled` to `true` to switch one on.
  { name: "weather", label: "Weather", enabled: false },
  { name: "generate-file", label: "File", enabled: false },
  { name: "generate-files", label: "Files", enabled: false },
  { name: "qr-code", label: "QR code", enabled: false },
];

/** Tools the model is currently allowed to call. */
export function enabledTools(): ToolMeta[] {
  return TOOL_REGISTRY.filter((tool) => tool.enabled);
}

/**
 * Get the implementation for a tool by name.
 * Returns undefined if the tool is disabled/unknown.
 */
export function getToolImplementation(name: string): any {
  const toolMeta = TOOL_REGISTRY.find((t) => t.name === name);
  if (!toolMeta || !toolMeta.enabled) return undefined;
  return IMPLEMENTATIONS[name];
}

/** Map of tool names to their AI SDK tool implementations. */
const IMPLEMENTATIONS: Record<string, any> = {
  "get-time": getTimeTool,
  "web-search": webSearchTool,
  "web-fetch": webFetchTool,
  "weather": {} as any,
  "generate-file": {} as any,
  "generate-files": {} as any,
  "qr-code": {} as any,
};

/**
 * Get the schema for a tool by name.
 * Returns undefined if the tool is disabled/unknown.
 */
export function getToolSchema(name: string): any {
  const toolImpl = getToolImplementation(name);
  return toolImpl?.schema;
}

/**
 * Execute a tool by name with the given parameters.
 * Returns the tool's result or undefined if the tool is disabled/unknown.
 */
export async function executeTool(
  name: string,
  parameters: Record<string, any>
): Promise<{ content: any; error?: string } | undefined> {
  const toolImpl = getToolImplementation(name);
  if (!toolImpl) {
    return { error: `Tool "${name}" is disabled or unknown.` as const, content: undefined };
  }
  try {
    const result = await toolImpl.execute(parameters);
    return { content: result.content };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Tool execution failed",
      content: undefined,
    };
  }
}

/**
 * Load all enabled tools for a model request.
 * Returns a tool set compatible with the AI SDK's `tools` parameter,
 * and a closeAll function for cleanup.
 */
export async function loadTools(
  webSearchEnabled = true
): Promise<{
  tools: Record<string, any>;
  closeAll: () => Promise<void>;
  enabledTools: ToolMeta[];
}> {
  const tools: Record<string, any> = {};
  const enabled = enabledTools();

  for (const toolMeta of enabled) {
    const implementation = IMPLEMENTATIONS[toolMeta.name];
    if (implementation) {
      tools[toolMeta.name] = implementation;
    }
  }

  return {
    tools,
    closeAll: async () => {},
    enabledTools: enabled,
  };
}

/**
 * Check if a tool is enabled in the registry.
 */
export function isToolEnabled(name: string): boolean {
  return TOOL_REGISTRY.some((t) => t.name === name && t.enabled);
}