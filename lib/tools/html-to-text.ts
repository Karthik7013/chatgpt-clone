/** Longest page excerpt we hand to the model, in characters. */
const MAX_PAGE_CHARS = 30_000;

/** Page excerpts fetched for web-search results are capped lower. */
const MAX_SEARCH_RESULT_CHARS = 15_000;

/**
 * Strips a HTML document down to readable plain text.
 *
 * This is a regex-based reduction, not a parser: it drops non-content tags and
 * decodes the handful of entities we care about. It is lossy by design and
 * good enough for feeding text to a model.
 */
export function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li>/gi, "- ")
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Fetches a URL and returns its readable text, or `null` if the page could not
 * be read. Never throws — callers treat a `null` as "no content available".
 */
export async function fetchPageContent(
  url: string,
  { timeoutMs = 12_000, maxChars = MAX_SEARCH_RESULT_CHARS }: { timeoutMs?: number; maxChars?: number } = {},
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ChatGPT-Clone/1.0)",
        "Accept": "text/html,text/plain",
      },
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();
    if (contentType.includes("text/plain")) return body.slice(0, maxChars);
    return extractTextFromHtml(body).slice(0, maxChars);
  } catch {
    return null;
  }
}

export { MAX_PAGE_CHARS };
