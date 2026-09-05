"use client";

import * as React from "react";
import { ArrowDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ConversationProps = React.HTMLAttributes<HTMLDivElement>;

const ConversationContext = React.createContext<{
  viewportRef: React.RefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
} | null>(null);

export function Conversation({
  className,
  children,
  scrollKey,
  ...props
}: ConversationProps & {
  /** When this changes (e.g. a new user message id), jump to the bottom. */
  scrollKey?: string | number;
}) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const stickRef = React.useRef(true);
  const prevKeyRef = React.useRef(scrollKey);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = React.useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 80;
    stickRef.current = atBottom;
    setIsAtBottom(atBottom);
  }, []);

  // Jump to the latest message when a new user message arrives
  // (instant — no smooth-scroll lag on submit).
  React.useLayoutEffect(() => {
    if (prevKeyRef.current !== scrollKey) {
      prevKeyRef.current = scrollKey;
      stickRef.current = true;
      setIsAtBottom(true);
      scrollToBottom("auto");
    }
  }, [scrollKey, scrollToBottom]);

  // Stay pinned to the bottom while content grows (streaming),
  // but never yank the user if they've scrolled up to read history.
  React.useLayoutEffect(() => {
    const el = viewportRef.current;
    const target = el?.firstElementChild;
    if (!el || !target) return;
    const ro = new ResizeObserver(() => {
      if (stickRef.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(target);
    return () => ro.disconnect();
  }, []);

  return (
    <ConversationContext.Provider value={{ viewportRef, isAtBottom, scrollToBottom }}>
      <div className={cn("relative flex-1 overflow-hidden", className)} {...props}>
        <div
          ref={viewportRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto"
        >
          {children}
        </div>
      </div>
    </ConversationContext.Provider>
  );
}

export function ConversationContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6", className)}
      {...props}
    />
  );
}

export function ConversationEmptyState({
  title,
  description,
  icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center gap-3 px-6 text-center",
        className,
      )}
    >
      {icon}
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </div>
  );
}

export function ConversationScrollButton({ className }: { className?: string }) {
  const ctx = React.useContext(ConversationContext);
  if (!ctx || ctx.isAtBottom) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => ctx.scrollToBottom()}
      className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-surface-2 shadow-lg",
        className,
      )}
      aria-label="Scroll to latest message"
    >
      <ArrowDownIcon className="size-4" />
    </Button>
  );
}

export function useConversation() {
  const ctx = React.useContext(ConversationContext);
  if (!ctx) throw new Error("useConversation must be used within <Conversation>");
  return ctx;
}
