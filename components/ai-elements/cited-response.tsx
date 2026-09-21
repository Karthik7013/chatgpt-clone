"use client";

import { Response } from "./response";

export interface Citation {
  index: number;
  url: string;
  title?: string;
  domain?: string;
}

export function CitedResponse({
  children,
  citations,
}: {
  children: string;
  citations: Citation[];
}) {
  if (citations.length === 0) {
    return <Response>{children}</Response>;
  }

  // Split text on [N] citation markers
  const parts = children.split(/(\[\d+\])/g);

  return (
    <div className="max-w-none [&_pre]:border [&_pre]:border-border">
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          const citation = citations.find((c) => c.index === idx);
          if (citation) {
            const domain = citation.domain || new URL(citation.url).hostname.replace("www.", "");
            return (
              <a
                key={i}
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                title={citation.title || citation.url}
                className="inline-flex items-center gap-0.5 align-middle mx-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/20"
              >
                <img
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                  alt=""
                  className="size-3 rounded-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                {idx}
              </a>
            );
          }
          // No matching citation — render as plain text
          return <span key={i}>{part}</span>;
        }
        // Regular text — render through Streamdown
        if (part) {
          return <Response key={i}>{part}</Response>;
        }
        return null;
      })}
    </div>
  );
}
