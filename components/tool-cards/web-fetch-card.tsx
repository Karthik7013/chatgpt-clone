"use client";

import { ExternalLink, Globe, Loader2, AlertCircle } from "lucide-react";
import type { ToolCardProps } from "@/components/tool-cards/types";

type WebFetchInput = { url?: string };
type WebFetchOutput = { url?: string; content?: string; type?: string };

/** Card for the `web-fetch` tool: shows the page URL and a content preview. */
export function WebFetchCard({ state, input, output, errorText }: ToolCardProps) {
  const inData = input as WebFetchInput | undefined;
  const outData = output as WebFetchOutput | undefined;
  const content = outData?.content ?? "";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Globe className="size-4 text-blue-500" />
        <span className="text-sm font-medium">Web Fetch</span>
        {state === "output-available" && content && (
          <span className="ml-auto text-xs text-muted-foreground">
            {outData?.type} · {(content.length / 1000).toFixed(1)}k chars
          </span>
        )}
      </div>

      <div className="px-4 py-3">
        {state === "input-streaming" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>Fetching {inData?.url}…</span>
          </div>
        )}

        {state === "output-error" && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="size-4" />
            <span>{errorText || "Failed to fetch URL"}</span>
          </div>
        )}

        {state === "output-available" && content && (
          <div className="space-y-3">
            <p className="truncate text-xs text-muted-foreground">{outData?.url}</p>

            <p className="line-clamp-6 text-sm leading-relaxed text-muted-foreground">
              {content.slice(0, 500)}
              {content.length > 500 && "…"}
            </p>

            {outData?.url && (
              <a
                href={outData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 hover:underline"
              >
                <ExternalLink className="size-3.5" />
                Open Link
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
