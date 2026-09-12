"use client";

import { Clock, Globe } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolState,
} from "@/components/ai-elements/tool";

/** Pulls the first text out of an MCP-shaped tool output. */
function extractText(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const text = extractText(item);
      if (text) return text;
    }
    return null;
  }
  if (typeof output === "object" && output !== null) {
    const o = output as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
    if ("content" in o) return extractText(o.content);
  }
  return null;
}

function inputTimezone(input: unknown): string {
  if (typeof input === "object" && input !== null) {
    const tz = (input as Record<string, unknown>).timezone;
    if (typeof tz === "string" && tz.trim()) return tz.trim();
  }
  return "UTC";
}

/**
 * Rich card for namespaced `get-time` MCP tools (e.g. `local__get-time`).
 * Loading skeleton while the tool runs, time display on success, error
 * block on failure. Falls back to the generic Tool renderer when the
 * output has no readable text.
 */
export function TimeCard({
  state,
  input,
  output,
  errorText,
  type,
}: {
  state: ToolState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  type: string;
}) {
  const timezone = inputTimezone(input);

  if (state === "input-streaming" || state === "input-available") {
    return (
      <div
        className={cn(
          "w-full max-w-full rounded-xl border border-border bg-surface p-4",
        )}
        aria-live="polite"
      >
        <div className="flex items-center gap-4">
          <div className="size-10 shrink-0 animate-pulse rounded-full bg-surface-2" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-7 w-40 animate-pulse rounded-md bg-surface-2" />
            <div className="h-4 w-28 animate-pulse rounded-md bg-surface-2" />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Checking the time{timezone ? ` in ${timezone}` : ""}…
        </p>
      </div>
    );
  }

  if (state === "output-error") {
    return (
      <div className="w-full max-w-full rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        Couldn&apos;t get the time{errorText ? `: ${errorText}` : "."} Try
        again.
      </div>
    );
  }

  const text = extractText(output);
  if (!text) {
    return (
      <Tool defaultOpen={false}>
        <ToolHeader type={type} state={state} />
        <ToolContent>
          <ToolInput input={input} />
          <ToolOutput output={output} errorText={errorText} />
        </ToolContent>
      </Tool>
    );
  }

  return (
    <div className="w-full max-w-full rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-4">
        <Clock className="size-10 shrink-0 text-primary" />
        <div className="flex flex-col">
          <span className="text-lg font-semibold">{text}</span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Globe className="size-3.5" />
            {timezone}
          </span>
        </div>
      </div>
    </div>
  );
}
