import type { UIMessage } from "ai";

import { baseToolName, partToolName } from "@/lib/tool-names";

/**
 * Everything the message renderer needs to know about a message, derived once
 * so the component only has to lay things out. These are pure functions on the
 * part list, which keeps the awkward part-shape handling out of the JSX and
 * makes it straightforward to test on its own.
 */

type Part = UIMessage["parts"][number];

export type SourceLink = { url: string; title?: string };
export type SourceFile = { title: string; filename?: string; mediaType: string };
export type SearchCitation = {
  index: number;
  url: string;
  title: string;
  domain: string;
};

function partsOfType<T extends Part["type"]>(
  parts: Part[],
  ...types: T[]
): Extract<Part, { type: T }>[] {
  return parts.filter((p): p is Extract<Part, { type: T }> =>
    (types as string[]).includes(p.type),
  );
}

/** Links the model cited, rendered by the `Sources` block. */
export function extractSources(parts: Part[]): SourceLink[] {
  return partsOfType(parts, "source-url").map((p) => ({
    url: p.url,
    title: p.title,
  }));
}

/** Documents the model referenced, rendered as chips. */
export function extractSourceDocuments(parts: Part[]): SourceFile[] {
  return partsOfType(parts, "source-document").map((p) => ({
    title: p.title,
    filename: p.filename,
    mediaType: p.mediaType,
  }));
}

/**
 * Search results from a finished `web-search` call, so the answer text can
 * cite them.
 *
 * The tool name is resolved through `baseToolName` rather than read off the
 * part: a local tool produces a `tool-web-search` part that carries no
 * `toolName`, and an MCP one produces `dynamic-tool` with a
 * `<server>__web-search` name. Comparing a raw `toolName` field matches
 * neither, which is why this must go through the name helpers.
 */
export function extractSearchCitations(parts: Part[]): SearchCitation[] {
  return parts
    .filter((p) => p.type.startsWith("tool-") || p.type === "dynamic-tool")
    .filter((p) => {
      const part = p as { state?: string };
      return part.state === "output-available";
    })
    .filter((p) => baseToolName(partToolName(p)) === "web-search")
    .flatMap((p) => {
      const output = (p as { output?: { results?: SearchCitation[] } }).output;
      return output?.results ?? [];
    });
}

/** All text in a message, which is what the copy button puts on the clipboard. */
export function extractMessageText(parts: Part[]): string {
  return partsOfType(parts, "text")
    .map((p) => p.text)
    .join("\n");
}
