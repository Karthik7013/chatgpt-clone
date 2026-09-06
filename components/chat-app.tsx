"use client";

import * as React from "react";
import type { UIMessage } from "ai";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";

import {
  createChat,
  deleteChat,
  listChats,
  loadMessages,
  renameChat,
  titleFromMessage,
  touchChat,
  type ChatSummary,
} from "@/lib/chat-store";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatWindow } from "@/components/chat-window";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function ChatApp() {
  const [chats, setChats] = React.useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [renamingHeader, setRenamingHeader] = React.useState(false);
  const [headerDraft, setHeaderDraft] = React.useState("");

  const activeTitle = chats.find((c) => c.id === activeChatId)?.title ?? "New chat";

  React.useEffect(() => {
    const existing = listChats();
    if (existing.length > 0) {
      setChats(existing);
      setActiveChatId(existing[0].id);
    } else {
      const chat = createChat();
      setChats([chat]);
      setActiveChatId(chat.id);
    }
    setReady(true);
  }, []);

  function refreshChats() {
    const seen = new Set<string>();
    setChats(listChats().filter((c) => !seen.has(c.id) && seen.add(c.id)));
  }

  function handleNewChat() {
    // Already on a fresh empty chat — reuse it instead of piling up blanks.
    if (activeChatId && loadMessages(activeChatId).length === 0) return;
    const chat = createChat();
    const chats = listChats();
    const seen = new Set<string>();
    setChats(chats.filter((c) => !seen.has(c.id) && seen.add(c.id)));
    setActiveChatId(chat.id);
  }

  function handleSelect(id: string) {
    setActiveChatId(id);
  }

  function handleRename(id: string, title: string) {
    renameChat(id, title);
    refreshChats();
  }

  function handleDelete(id: string) {
    deleteChat(id);
    const remaining = listChats().filter((c) => c.id !== id);
    const seen = new Set<string>();
    const deduped = remaining.filter((c) => !seen.has(c.id) && seen.add(c.id));
    setChats(deduped);
    if (activeChatId === id) {
      if (remaining.length > 0) {
        setActiveChatId(remaining[0].id);
      } else {
        const chat = createChat();
        setChats([chat]);
        setActiveChatId(chat.id);
      }
    }
  }

  function handleFirstMessage(id: string, message: UIMessage) {
    touchChat(id, titleFromMessage(message));
    refreshChats();
  }

  function commitHeaderRename() {
    setRenamingHeader(false);
    const trimmed = headerDraft.trim();
    if (activeChatId && trimmed) handleRename(activeChatId, trimmed);
  }

  function handleDeleteActive() {
    if (!activeChatId) return;
    if (window.confirm(`Delete "${activeTitle}"?`)) handleDelete(activeChatId);
  }

  if (!ready || !activeChatId) {
    return <div className="h-dvh w-full bg-background" />;
  }

  return (
    <SidebarProvider className="sidebar-inset-wrapper">
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={handleSelect}
        onNewChat={handleNewChat}
        onRename={handleRename}
        onDelete={handleDelete}
      />

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 bg-background px-4">
          <SidebarTrigger />
          {renamingHeader ? (
            <input
              autoFocus
              value={headerDraft}
              onChange={(e) => setHeaderDraft(e.target.value)}
              onBlur={commitHeaderRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitHeaderRename();
                if (e.key === "Escape") setRenamingHeader(false);
              }}
              aria-label="Rename chat"
              className="min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-sm text-foreground focus:outline-none"
            />
          ) : (
            <span className="truncate text-sm font-medium text-muted-foreground">
              {activeTitle}
            </span>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <ThemeToggle />
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
                <DropdownMenuItem
                  onSelect={() => {
                    setHeaderDraft(activeTitle);
                    setRenamingHeader(true);
                  }}
                >
                  <PencilIcon className="size-3.5" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem destructive onSelect={handleDeleteActive}>
                  <Trash2Icon className="size-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <ChatWindow
            key={activeChatId}
            chatId={activeChatId}
            onFirstMessage={(message) => handleFirstMessage(activeChatId, message)}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
