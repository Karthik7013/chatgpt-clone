"use client";

import { ExternalLink, Globe, Loader2, AlertCircle } from "lucide-react";
import type { ToolState } from "@/components/ai-elements/tool";

interface UrlCardProps {
  state: ToolState;
  input?: { url: string };
  output?: { url: string; title: string; content: string; totalLength: number; truncated: boolean };
  errorText?: string;
}

export function UrlCard({ state, input, output, errorText }: UrlCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Globe className="size-4 text-blue-500" />
        <span className="text-sm font-medium">URL Fetched</span>
        {state === "output-available" && output && (
          <span className="ml-auto text-xs text-muted-foreground">
            {output.truncated ? `${(output.totalLength / 1000).toFixed(1)}k chars` : `${(output.totalLength / 1000).toFixed(1)}k chars`}
          </span>
        )}
      </div>

      <div className="px-4 py-3">
        {state === "input-streaming" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>Fetching {input?.url}…</span>
          </div>
        )}

        {state === "output-error" && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="size-4" />
            <span>{errorText || "Failed to fetch URL"}</span>
          </div>
        )}

        {state === "output-available" && output && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">{output.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{output.url}</p>
            </div>

            <p className="line-clamp-6 text-sm leading-relaxed text-muted-foreground">
              {output.content.slice(0, 500)}
              {output.truncated && "…"}
            </p>

            <a
              href={output.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 hover:underline"
            >
              <ExternalLink className="size-3.5" />
              Open Link
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
