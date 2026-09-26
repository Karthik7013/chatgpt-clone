import { asSchema, tool } from "ai";
import { z } from "zod";

import { MAX_PAGE_CHARS, extractTextFromHtml } from "@/lib/tools/html-to-text";

const TIMEOUT_MS = 20_000;

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
        signal: AbortSignal.timeout(TIMEOUT_MS),
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
