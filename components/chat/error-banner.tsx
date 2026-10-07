"use client";

import * as React from "react";
import { CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/** One shared danger banner; callers add actions (Dismiss, Reload) as children. */
export function ErrorBanner({
  message,
  children,
  className,
}: {
  message: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger",
        className,
      )}
    >
      <CircleAlert className="size-3.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {children}
    </div>
  );
}
