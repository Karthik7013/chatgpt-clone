"use client";

import * as React from "react";
import { MessageCirclePlus } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { renameTitle } from "@/lib/chat-store";

/**
 * The bar above the conversation: sidebar toggle, the chat's title, and the
 * options menu. The title becomes an input while renaming; that draft is local
 * state because nothing else needs to see it until it is committed.
 */
export function ChatHeader({
  title,
  onRename,
  onNewChat,
}: {
  title: string;
  onRename: (title: string) => void;
  onNewChat?: () => void;
}) {
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [draft, setDraft] = React.useState(title);

  function commitRename() {
    setIsRenaming(false);
    const next = renameTitle(draft, title);
    if (next) onRename(next);
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 bg-background px-4">
      <SidebarTrigger />
      {isRenaming ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitRename();
            if (event.key === "Escape") setIsRenaming(false);
          }}
          aria-label="Rename chat"
          className="min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-sm text-foreground focus:outline-none"
        />
      ) : (
        <span className="truncate text-sm font-medium text-muted-foreground">
          {title}
        </span>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {onNewChat ? (
          <button
            type="button"
            aria-label="New chat"
            onClick={onNewChat}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <MessageCirclePlus className="size-4" />
          </button>
        ) : null}
      </div>
    </header>
  );
}
