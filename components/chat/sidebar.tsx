"use client";

import * as React from "react";
import {
  MessageSquareIcon,
  MoreHorizontalIcon,
  PanelLeftCloseIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";

import type { ChatSummary } from "@/lib/chat-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

function ChatListPopover({
  chats,
  activeChatId,
  onSelect,
  onDelete,
}: {
  chats: ChatSummary[];
  activeChatId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout>>(null);

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  function handleTriggerEnter() {
    clearCloseTimer();
    setOpen(true);
  }

  function handleContentLeave() {
    scheduleClose();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={handleTriggerEnter}
          onMouseLeave={scheduleClose}
          title="Chats"
          aria-label="Open chat list"
          className="flex size-7 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <MessageSquareIcon className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        onMouseEnter={clearCloseTimer}
        onMouseLeave={handleContentLeave}
        className="w-64 p-0"
      >
        <div className="flex flex-col">
          <div className=" px-2 py-1">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Recent
            </p>
            {chats.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No conversations yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {chats.map((chat) => (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(chat.id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-sidebar-accent ${chat.id === activeChatId
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground"
                        }`}
                    >
                      <MessageSquareIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">
                        {chat.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ChatSidebar({
  chats,
  activeChatId,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
}: {
  chats: ChatSummary[];
  activeChatId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const { isMobile, open, setOpenMobile, toggleSidebar } = useSidebar();

  function closeOnMobile() {
    if (isMobile) setOpenMobile(false);
  }

  function handleNewChat() {
    onNewChat();
    closeOnMobile();
  }

  function handleSelect(id: string) {
    onSelect(id);
    closeOnMobile();
  }

  return (
    <Sidebar>
      <SidebarHeader>
        {open ? (
          <div className="flex items-center gap-2 px-1 py-1">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <SparklesIcon className="size-4 text-primary" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Gemini Chat
            </span>
            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="ml-auto rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <PanelLeftCloseIcon className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-1">
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="flex size-7 items-center justify-center rounded-lg bg-primary/10 transition-colors hover:bg-primary/20"
            >
              <SparklesIcon className="size-4 text-primary" />
            </button>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <Button
          className="mb-1 w-full shrink-0 justify-start gap-2.5 rounded-xl bg-primary px-3 py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
          onClick={handleNewChat}
        >
          <PlusIcon className="size-4 shrink-0" />
          <span className="truncate">New chat</span>
        </Button>
        <SidebarMenu>
          {chats.length === 0 ? (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              No conversations yet.
            </p>
          ) : (
            chats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                active={chat.id === activeChatId}
                onSelect={() => handleSelect(chat.id)}
                onRename={(title) => onRename(chat.id, title)}
                onDelete={() => onDelete(chat.id)}
              />
            ))
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <p
          title="Next.js · shadcn/ui · AI Elements · Vercel AI SDK"
          className="truncate text-xs text-muted-foreground"
        >
          Next.js · shadcn/ui · AI Elements · Vercel AI SDK
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}

function ChatListItem({
  chat,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  chat: ChatSummary;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(chat.title);

  function commitRename() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== chat.title) onRename(trimmed);
    else setDraft(chat.title);
  }

  if (editing) {
    return (
      <SidebarMenuItem>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraft(chat.title);
              setEditing(false);
            }
          }}
          className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-sm text-foreground focus:outline-none"
        />
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={active} onClick={onSelect} title={chat.title}>
        <MessageSquareIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{chat.title}</span>
      </SidebarMenuButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            showOnHover
            aria-label="Chat options"
            className="chat-row-action"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontalIcon className="size-4" />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <PencilIcon className="size-3.5" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem destructive onSelect={onDelete}>
            <Trash2Icon className="size-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
