"use client";

import * as React from "react";
import type { UIMessage } from "ai";
import { CircleAlert, Loader2, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";

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
import { ChatSidebar } from "@/components/chat/sidebar";
import { ChatWindow } from "@/components/chat/window";
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

export function ChatApp({ initialChatId }: { initialChatId?: string } = {}) {
  const [chats, setChats] = React.useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [renamingHeader, setRenamingHeader] = React.useState(false);
  const [headerDraft, setHeaderDraft] = React.useState("");
  const [activeChatNonEmpty, setActiveChatNonEmpty] = React.useState(false);
  const [storageError, setStorageError] = React.useState<string | null>(null);

  const activeTitle = chats.find((c) => c.id === activeChatId)?.title ?? "New chat";

  React.useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const existing = await listChats();
        if (cancelled) return;

        if (initialChatId) {
          const target = existing.find((c) => c.id === initialChatId);
          if (target) {
            setChats(existing);
            setActiveChatId(target.id);
            setReady(true);
            return;
          }
        }

        if (existing.length > 0) {
          setChats(existing);
          setActiveChatId(existing[0].id);
        } else {
          const chat = await createChat();
          if (cancelled) return;
          setChats([chat]);
          setActiveChatId(chat.id);
        }
        if (!cancelled) setReady(true);
      } catch (err) {
        console.error("Failed to bootstrap chats:", err);
        if (!cancelled) {
          setStorageError(
            "Could not reach the database. Check that MONGODB_URI is set and reachable.",
          );
          setReady(true);
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!activeChatId) return;
    let cancelled = false;
    loadMessages(activeChatId)
      .then((messages) => {
        if (!cancelled) setActiveChatNonEmpty(messages.length > 0);
      })
      .catch(() => {
        /* non-fatal: only hides the header actions menu */
      });
    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  async function refreshChats() {
    const seen = new Set<string>();
    const fresh = await listChats();
    setChats(fresh.filter((c) => !seen.has(c.id) && seen.add(c.id)));
  }

  async function handleNewChat() {
    if (activeChatId) {
      try {
        const messages = await loadMessages(activeChatId);
        if (messages.length === 0) return;
      } catch {
        /* continue even if load failed */
      }
    }
    try {
      const chat = await createChat();
      await refreshChats();
      setActiveChatId(chat.id);
    } catch (err) {
      console.error("Failed to create chat:", err);
      setStorageError("Could not create a new chat.");
    }
  }

  function handleSelect(id: string) {
    setActiveChatId(id);
  }

  async function handleRename(id: string, title: string) {
    try {
      await renameChat(id, title);
      await refreshChats();
    } catch (err) {
      console.error("Failed to rename chat:", err);
      setStorageError("Could not rename the chat.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteChat(id);
      const remaining = (await listChats()).filter((c) => c.id !== id);
      const seen = new Set<string>();
      const deduped = remaining.filter((c) => !seen.has(c.id) && seen.add(c.id));
      setChats(deduped);
      if (activeChatId === id) {
        if (deduped.length > 0) {
          setActiveChatId(deduped[0].id);
        } else {
          const chat = await createChat();
          setChats([chat]);
          setActiveChatId(chat.id);
        }
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
      setStorageError("Could not delete the chat.");
    }
  }

  async function handleFirstMessage(id: string, message: UIMessage) {
    try {
      await touchChat(id, titleFromMessage(message));
      await refreshChats();
    } catch (err) {
      console.error("Failed to update chat:", err);
      setStorageError("Could not update the chat.");
    }
  }

  function commitHeaderRename() {
    setRenamingHeader(false);
    const trimmed = headerDraft.trim();
    if (activeChatId && trimmed) void handleRename(activeChatId, trimmed);
  }

  function handleDeleteActive() {
    if (!activeChatId) return;
    if (window.confirm(`Delete "${activeTitle}"?`)) void handleDelete(activeChatId);
  }

  if (!ready) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeChatId) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-3 bg-background">
        <CircleAlert className="size-8 text-danger" />
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          {storageError ?? "No chat available."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <SidebarProvider className="sidebar-inset-wrapper">
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={handleSelect}
        onNewChat={() => void handleNewChat()}
        onRename={(id, title) => void handleRename(id, title)}
        onDelete={(id) => void handleDelete(id)}
      />

      <SidebarInset className="md:p-3 bg-sidebar">
        <div className="flex h-full flex-1 flex-row overflow-hidden bg-background md:rounded-md">
          <div className="flex flex-1 flex-col overflow-hidden">
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
                {activeChatNonEmpty && (
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
                )}
              </div>
            </header>

            {storageError ? (
              <div className="flex items-center gap-2 border border-danger/30 bg-danger/10 px-4 py-2 text-xs text-danger">
                <CircleAlert className="size-3.5 shrink-0" />
                <span className="flex-1">{storageError}</span>
                <button
                  type="button"
                  onClick={() => setStorageError(null)}
                  className="rounded hover:underline"
                >
                  Dismiss
                </button>
              </div>
            ) : null}

            <div className="flex flex-1 flex-col overflow-hidden">
              <ChatWindow
                key={activeChatId}
                chatId={activeChatId}
                onFirstMessage={(message) => void handleFirstMessage(activeChatId, message)}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
