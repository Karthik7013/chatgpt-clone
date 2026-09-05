"use client";

import * as React from "react";
import type { UIMessage } from "ai";

import {
  createChat,
  deleteChat,
  listChats,
  renameChat,
  titleFromMessage,
  touchChat,
  type ChatSummary,
} from "@/lib/chat-store";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatWindow } from "@/components/chat-window";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function ChatApp() {
  const [chats, setChats] = React.useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

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
          <span className="text-sm font-medium text-muted-foreground">
            {chats.find((c) => c.id === activeChatId)?.title ?? "New chat"}
          </span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div
          aria-hidden
          className="pointer-events-none sticky top-14 z-10 h-8 shrink-0 bg-gradient-to-b from-background to-transparent"
        />

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
