"use client";

import * as React from "react";
import { BrainIcon, ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ReasoningContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  isStreaming: boolean;
  duration: number | null;
};

const ReasoningContext = React.createContext<ReasoningContextValue | null>(null);

export function Reasoning({
  isStreaming,
  defaultOpen,
  className,
  children,
}: {
  isStreaming: boolean;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpenState] = React.useState(defaultOpen ?? isStreaming);
  const userToggledRef = React.useRef(false);
  const startedAtRef = React.useRef<number | null>(null);
  const wasStreamingRef = React.useRef(isStreaming);
  const [duration, setDuration] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (isStreaming && startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }

    if (isStreaming && !userToggledRef.current) {
      setOpenState(true);
    }

    if (!isStreaming && wasStreamingRef.current) {
      if (startedAtRef.current !== null) {
        setDuration(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
      }
      if (!userToggledRef.current) {
        const timeout = setTimeout(() => setOpenState(false), 500);
        wasStreamingRef.current = isStreaming;
        return () => clearTimeout(timeout);
      }
    }

    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const setOpen = React.useCallback((next: boolean) => {
    userToggledRef.current = true;
    setOpenState(next);
  }, []);

  return (
    <ReasoningContext.Provider value={{ open, setOpen, isStreaming, duration }}>
      <div className={cn("flex flex-col", className)}>{children}</div>
    </ReasoningContext.Provider>
  );
}

export function ReasoningTrigger({ className }: { className?: string }) {
  const ctx = React.useContext(ReasoningContext);
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className={cn(
        "flex w-fit items-center gap-1.5 rounded-md py-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <BrainIcon className="size-3.5 shrink-0" />
      <span>
        {ctx.isStreaming
          ? "Thinking…"
          : ctx.duration
            ? `Thought for ${ctx.duration}s`
            : "Thoughts"}
      </span>
      <ChevronDownIcon
        className={cn("size-3.5 shrink-0 transition-transform", ctx.open && "rotate-180")}
      />
    </button>
  );
}

export function ReasoningContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(ReasoningContext);
  if (!ctx?.open) return null;

  return (
    <div
      className={cn(
        "mt-1.5 whitespace-pre-wrap border-l-2 border-border pl-3 text-sm leading-6 text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
