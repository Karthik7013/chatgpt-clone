"use client";

import * as React from "react";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  CircleAlertIcon,
  LoaderCircleIcon,
  WrenchIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

const ToolContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export function Tool({
  defaultOpen = false,
  className,
  children,
}: {
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <ToolContext.Provider value={{ open, setOpen }}>
      <div
        className={cn(
          "w-full max-w-full overflow-hidden rounded-xl border border-border bg-surface",
          className,
        )}
      >
        {children}
      </div>
    </ToolContext.Provider>
  );
}

const STATE_META: Record<
  ToolState,
  { label: string; icon: React.ReactNode; tone: string }
> = {
  "input-streaming": {
    label: "Preparing…",
    icon: <LoaderCircleIcon className="size-3.5 animate-spin" />,
    tone: "text-muted-foreground",
  },
  "input-available": {
    label: "Running…",
    icon: <LoaderCircleIcon className="size-3.5 animate-spin" />,
    tone: "text-primary",
  },
  "output-available": {
    label: "Completed",
    icon: <CheckCircle2Icon className="size-3.5" />,
    tone: "text-primary",
  },
  "output-error": {
    label: "Error",
    icon: <CircleAlertIcon className="size-3.5" />,
    tone: "text-danger",
  },
};

export function ToolHeader({
  type,
  state,
  className,
}: {
  type: string;
  state: ToolState;
  className?: string;
}) {
  const ctx = React.useContext(ToolContext);
  const meta = STATE_META[state];
  const name = type.replace(/^tool-/, "").replace(/_/g, " ");

  return (
    <button
      type="button"
      onClick={() => ctx?.setOpen(!ctx.open)}
      className={cn(
        "flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2",
        className,
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium capitalize">
        <WrenchIcon className="size-3.5 text-muted-foreground" />
        {name}
      </span>
      <span className="flex items-center gap-3">
        <span className={cn("flex items-center gap-1.5 text-xs", meta.tone)}>
          {meta.icon}
          {meta.label}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            ctx?.open && "rotate-180",
          )}
        />
      </span>
    </button>
  );
}

export function ToolContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(ToolContext);
  if (!ctx?.open) return null;
  return <div className="border-t border-border px-3.5 py-3">{children}</div>;
}

function CodeBlock({ value }: { value: unknown }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <pre className="max-h-64 overflow-auto rounded-lg bg-surface-2 p-3 text-xs leading-5 text-foreground/90">
      <code>{text}</code>
    </pre>
  );
}

export function ToolInput({ input }: { input: unknown }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Input
      </span>
      <CodeBlock value={input} />
    </div>
  );
}

export function ToolOutput({
  output,
  errorText,
}: {
  output?: unknown;
  errorText?: string;
}) {
  if (errorText) {
    return (
      <div className="mt-3 flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-danger">Error</span>
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          {errorText}
        </div>
      </div>
    );
  }
  if (output === undefined) return null;
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Output
      </span>
      <CodeBlock value={output} />
    </div>
  );
}
