import { asSchema, tool } from "ai";
import { z } from "zod";

import { fetchPageContent } from "@/lib/tools/html-to-text";

/** Search result count the model may request, clamped to this range. */
const MIN_RESULTS = 1;
const MAX_RESULTS = 5;
const DEFAULT_RESULTS = 3;

export type WebSearchResult = {
  /** 1-based position in the result list, so the model can cite as [1], [2]. */
  index: number;
  title: string;
  url: string;
  domain: string;
  summary: string;
  content: string;
};

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
