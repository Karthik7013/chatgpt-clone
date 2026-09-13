"use client";

import { SparklesIcon } from "lucide-react";

export function EmptyHome() {
  return (
    <div className="empty-home flex min-h-[60svh] w-full flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
        <SparklesIcon className="size-6 text-primary" />
      </span>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        What&apos;s on your mind?
      </h2>
    </div>
  );
}
