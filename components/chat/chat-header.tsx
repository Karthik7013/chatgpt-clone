"use client";

import * as React from "react";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * The bar above the conversation: sidebar toggle, the chat's title, and the
 * options menu. The title becomes an input while renaming; that draft is local
 * state because nothing else needs to see it until it is committed.
 *
 * The options menu is hidden for an empty chat, where rename and delete have
 * nothing to act on.
 */
export function ChatHeader({
  title,
  showOptions,
  onRename,
  onDelete,
}: {
  title: string;
  showOptions: boolean;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [draft, setDraft] = React.useState(title);

  function startRenaming() {
    setDraft(title);
    setIsRenaming(true);
  }

  function commitRename() {
    setIsRenaming(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== title) onRename(trimmed);
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
        {showOptions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Chat options"
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <MoreHorizontalIcon className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={startRenaming}>
                <PencilIcon className="size-3.5" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem destructive onSelect={onDelete}>
                <Trash2Icon className="size-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
