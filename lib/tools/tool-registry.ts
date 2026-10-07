import { asSchema, tool, type ToolSet } from "ai";
import { z } from "zod";

import {
  MAX_PAGE_CHARS,
  extractTextFromHtml,
  fetchPageContent,
} from "@/lib/tools/html-to-text";

/**
 * Server-only unified tool registry: metadata, AI SDK implementations, and
 * loading helpers in one place. Imported only from API routes (via
 * `@/lib/tools/tool-registry`), never from client components.
 *
 * Client tool cards key off `name` independently
 * (see `components/tool-cards/registry.tsx`).
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

export type WebSearchResult = {
  /** 1-based position in the result list, so the model can cite as [1], [2]. */
  index: number;
  title: string;
  url: string;
  domain: string;
  summary: string;
  content: string;
};

/** Search result count the model may request, clamped to this range. */
const MIN_RESULTS = 1;
const MAX_RESULTS = 5;
const DEFAULT_RESULTS = 3;

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
      Math.max(numResults ?? DEFAULT_RESULTS, MIN_RESULTS),
      MAX_RESULTS,
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
      const results: WebSearchResult[] = await Promise.all(
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

const WEB_FETCH_TIMEOUT_MS = 20_000;

export const webFetchTool = tool({  description:
    "Fetch and read the content of a specific web page URL. Use when the user wants to read a specific article or page.",
  inputSchema: asSchema(
    z.object({
      url: z.string().describe("The URL to fetch"),
    }),
  ),
  async execute({ url }) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
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
          content: JSON.stringify(JSON.parse(body), null, 2).slice(0, MAX_PAGE_CHARS),
          type: "json",
        };
      }
      if (contentType.includes("text/plain")) {
        return { url, content: body.slice(0, MAX_PAGE_CHARS), type: "text" };
      }

      const text = extractTextFromHtml(body);
      if (!text) {
        return { url, content: "[Page returned empty content]", type: "empty" };
      }
      return { url, content: text.slice(0, MAX_PAGE_CHARS), type: "html" };
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        throw new Error("Page fetch timed out.");
      }
      throw new Error(err instanceof Error ? err.message : "Failed to fetch URL");
    }
  },
});

/**
 * Every tool the model may call: metadata for the UI plus the AI SDK
 * implementation, in one list. To add a tool, append one entry here and,
 * optionally, a card in `components/tool-cards/registry.tsx` (a tool with
 * no card falls back to the generic renderer).
 */
const TOOLS: { name: string; label: string; tool: ToolSet[string] }[] = [
  { name: "get-time", label: "Time", tool: getTimeTool },
  { name: "web-search", label: "Search", tool: webSearchTool },
  { name: "web-fetch", label: "Fetch", tool: webFetchTool },
];

/** Tools offered to the model, keyed by the name the model sees. */
export type ToolMeta = { name: string; label: string };

export function enabledTools(): ToolMeta[] {
  return TOOLS.map(({ name, label }) => ({ name, label }));
}

/**
 * Builds the tool set for one request. `webSearchEnabled` comes from the
 * client's composer toggle and gates both web tools.
 */
export function loadTools(webSearchEnabled = true): { tools: ToolSet } {
  const tools: ToolSet = {};

  for (const { name, tool } of TOOLS) {
    if (!webSearchEnabled && (name === "web-search" || name === "web-fetch")) {
      continue;
    }
    tools[name] = tool;
  }

  return { tools };
}