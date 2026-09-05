# Implementation Guide — Replace hand-rolled sidebar with shadcn Sidebar + SidebarInset

## Context

This is a Next.js 16 (App Router) + Tailwind v4 + Vercel AI SDK chat app styled like
ChatGPT. The current layout uses a hand-rolled `<ChatSidebar>` with manual
`mobileOpen` state, `translate-x` toggling, and a black overlay backdrop.

The goal is to replace that with the official shadcn `Sidebar` + `SidebarInset`
primitives. **Do not redesign or restyle anything else.** Only the layout shell changes.
All AI Elements components, the chat window, the API route, and the chat store stay
exactly as they are.

---

## What changes

| File | Action |
|---|---|
| `package.json` | Add `@radix-ui/react-dialog` (Sheet uses it) |
| `app/globals.css` | Add shadcn sidebar CSS variables |
| `components/ui/sheet.tsx` | Create (new file — needed by Sidebar's mobile drawer) |
| `components/ui/sidebar.tsx` | Create (new file — full shadcn sidebar primitive) |
| `components/chat-sidebar.tsx` | Full rewrite using shadcn sidebar primitives |
| `components/chat-app.tsx` | Update: add `SidebarProvider`, `SidebarInset`; remove all `mobileSidebarOpen` state |

---

## Step 1 — Add the missing package

In `package.json` dependencies, add:

```json
"@radix-ui/react-dialog": "^1.1.23"
```

Then run `npm install`.

---

## Step 2 — Add shadcn sidebar CSS variables to `app/globals.css`

Inside the existing `:root { }` block, append these tokens. shadcn's sidebar component
reads exactly these names — they must be present:

```css
/* shadcn Sidebar tokens — must match the sidebar component's internal var() calls */
--sidebar: oklch(0.20 0.01 260);           /* sidebar background */
--sidebar-foreground: oklch(0.94 0.005 260);
--sidebar-primary: oklch(0.72 0.14 165);   /* accent colour used for active item */
--sidebar-primary-foreground: oklch(0.14 0.02 165);
--sidebar-accent: oklch(0.24 0.012 260);   /* hover background */
--sidebar-accent-foreground: oklch(0.94 0.005 260);
--sidebar-border: oklch(0.30 0.012 260);
--sidebar-ring: oklch(0.72 0.14 165);
--sidebar-width: 17rem;                    /* expanded width */
--sidebar-width-mobile: 17rem;
--sidebar-width-icon: 3.5rem;             /* collapsed (icon-only) width */
```

Also add these inside the existing `@theme inline { }` block so Tailwind knows about
the sidebar colour tokens:

```css
--color-sidebar: var(--sidebar);
--color-sidebar-foreground: var(--sidebar-foreground);
--color-sidebar-primary: var(--sidebar-primary);
--color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
--color-sidebar-accent: var(--sidebar-accent);
--color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
--color-sidebar-border: var(--sidebar-border);
--color-sidebar-ring: var(--sidebar-ring);
```

---

## Step 3 — Create `components/ui/sheet.tsx`

shadcn's Sidebar uses a `Sheet` for the mobile drawer. Create this file verbatim:

```tsx
"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: "left" | "right" | "top" | "bottom";
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, side = "left", children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 flex flex-col bg-sidebar shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300",
        side === "left" &&
          "inset-y-0 left-0 h-full w-[var(--sidebar-width-mobile)] data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        side === "right" &&
          "inset-y-0 right-0 h-full w-[var(--sidebar-width-mobile)] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-3 rounded-sm opacity-70 hover:opacity-100">
        <XIcon className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 p-4", className)} {...props} />
);

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base font-semibold text-sidebar-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle };
```

---

## Step 4 — Create `components/ui/sidebar.tsx`

This is the full shadcn Sidebar primitive. Create this file verbatim. Key exported
symbols used by this app: `SidebarProvider`, `Sidebar`, `SidebarHeader`,
`SidebarContent`, `SidebarFooter`, `SidebarMenu`, `SidebarMenuItem`,
`SidebarMenuButton`, `SidebarMenuAction`, `SidebarTrigger`, `SidebarInset`,
`useSidebar`.

```tsx
"use client";

import * as React from "react";
import { PanelLeftIcon } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  isMobile: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

export function SidebarProvider({
  defaultOpen = true,
  children,
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { defaultOpen?: boolean }) {
  const [open, setOpenState] = React.useState(defaultOpen);
  const [openMobile, setOpenMobile] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Persist open state in a cookie
  function setOpen(value: boolean) {
    setOpenState(value);
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }

  function toggleSidebar() {
    if (isMobile) setOpenMobile((v) => !v);
    else setOpen(!open);
  }

  // Keyboard shortcut: Ctrl/Cmd + B
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === SIDEBAR_KEYBOARD_SHORTCUT && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, open]);

  return (
    <SidebarContext.Provider
      value={{ open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }}
    >
      <div
        data-sidebar="provider"
        style={
          {
            "--sidebar-width": "17rem",
            "--sidebar-width-icon": "3.5rem",
            ...style,
          } as React.CSSProperties
        }
        className={cn("group/sidebar-wrapper flex min-h-svh w-full", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  side = "left",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { side?: "left" | "right" }) {
  const { open, isMobile, openMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side={side}
          className="flex flex-col p-0 [&>button]:hidden"
        >
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      data-state={open ? "expanded" : "collapsed"}
      className={cn(
        "relative flex h-svh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out",
        open
          ? "w-[var(--sidebar-width)]"
          : "w-[var(--sidebar-width-icon)] overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SidebarTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className={cn("size-8 shrink-0", className)}
      aria-label="Toggle sidebar"
      {...props}
    >
      <PanelLeftIcon className="size-4" />
    </Button>
  );
}

export function SidebarInset({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={cn(
        "relative flex min-h-svh flex-1 flex-col overflow-hidden bg-background",
        className
      )}
      {...props}
    />
  );
}

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2 p-3", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-2 py-1", className)}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-auto border-t border-sidebar-border p-3", className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("flex flex-col gap-0.5", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) {
  return <li className={cn("group/item relative", className)} {...props} />;
}

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isActive?: boolean;
    asChild?: boolean;
  }
>(({ className, isActive, children, ...props }, ref) => (
  <button
    ref={ref}
    data-active={isActive}
    className={cn(
      "flex w-full items-center gap-2 overflow-hidden rounded-lg px-2.5 py-2 text-left text-sm text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
      isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
      className
    )}
    {...props}
  >
    {children}
  </button>
));
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { showOnHover?: boolean }
>(({ className, showOnHover, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-sidebar-foreground/50 outline-none transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
      showOnHover &&
        "opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100",
      className
    )}
    {...props}
  />
));
SidebarMenuAction.displayName = "SidebarMenuAction";
```

---

## Step 5 — Rewrite `components/chat-sidebar.tsx`

Replace the entire file with this:

```tsx
"use client";

import * as React from "react";
import {
  MessageSquareIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

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
  return (
    <Sidebar>
      <SidebarHeader>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onNewChat}
        >
          <PlusIcon className="size-4 shrink-0" />
          <span className="truncate">New chat</span>
        </Button>
      </SidebarHeader>

      <SidebarContent>
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
                onSelect={() => onSelect(chat.id)}
                onRename={(title) => onRename(chat.id, title)}
                onDelete={() => onDelete(chat.id)}
              />
            ))
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <p className="text-xs text-muted-foreground">
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
        <span className="truncate">{chat.title}</span>
      </SidebarMenuButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            showOnHover
            aria-label="Chat options"
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
```

---

## Step 6 — Update `components/chat-app.tsx`

Replace the entire file with this. Key changes:
- **Remove** `mobileSidebarOpen` state and all related props
- **Remove** the mobile `<header>` with the hamburger button
- **Add** `SidebarProvider` wrapping the whole app
- **Add** `SidebarInset` wrapping the `ChatWindow`
- **Add** `SidebarTrigger` inside `SidebarInset`'s header bar (always visible, replaces hamburger)
- **Remove** `mobileOpen` / `onCloseMobile` from `<ChatSidebar>` props (no longer exists)

```tsx
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
    setChats(listChats());
  }

  function handleNewChat() {
    const chat = createChat();
    setChats(listChats());
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
    const remaining = listChats();
    setChats(remaining);
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
    <SidebarProvider>
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={handleSelect}
        onNewChat={handleNewChat}
        onRename={handleRename}
        onDelete={handleDelete}
      />

      <SidebarInset>
        {/* Top bar — visible on all screen sizes, holds the sidebar toggle */}
        <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
          <SidebarTrigger />
          <span className="text-sm font-medium text-muted-foreground">
            {chats.find((c) => c.id === activeChatId)?.title ?? "New chat"}
          </span>
        </header>

        {/* Chat area — takes remaining height */}
        <div className="flex min-h-0 flex-1 flex-col">
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
```

---

## What you must NOT change

- `app/api/chat/route.ts` — untouched
- `components/chat-window.tsx` — untouched
- `components/ai-elements/*` — untouched
- `lib/chat-store.ts` — untouched
- `app/globals.css` `:root` tokens (other than adding the sidebar ones in Step 2)
- `app/layout.tsx`, `app/page.tsx` — untouched

---

## What you get after this

- Sidebar is a proper `<aside>` on desktop with smooth expand/collapse via `Ctrl+B`
- On mobile it's a `Sheet` drawer — no custom `translate-x` hacks
- `SidebarInset` handles the main area offset automatically
- `mobileOpen` state is fully gone — `SidebarProvider` owns it
- `ChatSidebar` props simplified: `mobileOpen` and `onCloseMobile` removed
- Visual result is identical — same chat list, same actions, same theme colours

