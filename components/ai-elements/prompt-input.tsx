"use client";

import * as React from "react";
import { ArrowUpIcon, SquareIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ai-elements/loader";

export function PromptInput({
  onSubmit,
  className,
  children,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2.5 shadow-lg",
        className,
      )}
    >
      {children}
    </form>
  );
}

export const PromptInputTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, onKeyDown, ...props }, ref) => {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

  const resize = React.useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  React.useEffect(() => {
    resize();
  }, [props.value, resize]);

  return (
    <textarea
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }}
      rows={1}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.form?.requestSubmit();
        }
        onKeyDown?.(e);
      }}
      className={cn(
        "max-h-[200px] min-h-[24px] w-full resize-none bg-transparent px-2 py-1.5 text-[15px] font-medium leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none",
        className,
      )}
      {...props}
    />
  );
});
PromptInputTextarea.displayName = "PromptInputTextarea";

export function PromptInputToolbar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2 px-1", className)}>
      {children}
    </div>
  );
}

export function PromptInputSubmit({
  status,
  disabled,
  onStop,
  className,
}: {
  status: "submitted" | "streaming" | "ready" | "error";
  disabled?: boolean;
  onStop?: () => void;
  className?: string;
}) {
  if (status === "submitted" || status === "streaming") {
    return (
      <Button
        type="button"
        size="icon"
        onClick={onStop}
        className={cn("rounded-full", className)}
        aria-label="Stop generating"
      >
        {status === "submitted" ? <Loader size={14} className="text-primary-foreground" /> : (
          <SquareIcon className="size-3.5 fill-current" />
        )}
      </Button>
    );
  }

  return (
    <Button
      type="submit"
      size="icon"
      disabled={disabled}
      className={cn("rounded-full", className)}
      aria-label="Send message"
    >
      <ArrowUpIcon className="size-4" />
    </Button>
  );
}
