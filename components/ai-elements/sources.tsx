"use client";

import * as React from "react";
import { ChevronDownIcon, GlobeIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function Sources({
  sources,
  className,
}: {
  sources: { url: string; title?: string }[];
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  if (sources.length === 0) return null;

  return (
    <div className={cn("flex flex-col", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-fit items-center gap-1.5 rounded-md py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <GlobeIcon className="size-3.5" />
        <span>
          {sources.length} source{sources.length === 1 ? "" : "s"}
        </span>
        <ChevronDownIcon className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <ol className="mt-1.5 flex flex-col gap-1.5 border-l-2 border-border pl-3">
          {sources.map((source, i) => (
            <li key={`${source.url}-${i}`} className="truncate text-sm">
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                {source.title || source.url}
              </a>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
