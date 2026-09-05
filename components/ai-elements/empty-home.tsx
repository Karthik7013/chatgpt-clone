"use client";

import { SparklesIcon } from "lucide-react";

const SUGGESTIONS = [
  "What's new in web development this week?",
  "Explain how transformers work, step by step",
  "Draft a polite email declining a meeting",
  "Give me 5 ideas for a weekend side project",
];

export function EmptyHome({ onSuggest }: { onSuggest: (text: string) => void }) {
  return (
    <div className="empty-home flex min-h-[60svh] w-full flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
        <SparklesIcon className="size-6 text-primary" />
      </span>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        What&apos;s on your mind?
      </h2>
      <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggest(s)}
            className="rounded-full border border-border bg-surface px-4 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
