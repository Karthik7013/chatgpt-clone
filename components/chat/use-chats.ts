"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import type { UIMessage } from "ai";

import {
  createChat,
  deleteChat,
  listChats,
  loadMessages,
  renameChat,
  titleFromMessage,
  type ChatSummary,
} from "@/lib/chat-store";
import { dedupeById } from "@/lib/chat-list";
import { chatIdFromPath } from "@/lib/chat-url";
import { CHAT_ERROR } from "@/components/chat/chat-errors";

/**
 * Owns the chat list and every operation on it: which chat is open, creating,
 * renaming, deleting, and naming a chat after its first message.
 *
 * State and lifecycle (one-time bootstrap, route changes) live here. The return
 * shape is the component-facing API — `app.tsx` destructures it, so keep it
 * stable.
 */
export function useChats(initialChatId?: string) {
  const router = useRouter();
  const pathname = usePathname();

  const [chats, setChats] = React.useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [storageError, setStorageError] = React.useState<string | null>(null);

  const activeTitle =
    chats.find((chat) => chat.id === activeChatId)?.title ?? "New chat";

  // Loads the list once and decides which chat opens first: the deep-linked
  // chat when it exists, otherwise the newest chat, otherwise a fresh chat.
  // Runs exactly once — re-running when the deep link changes would throw
  // away the user's place, so the initial id is captured in a ref.
  const initialChatIdRef = React.useRef(initialChatId);
  React.useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const existing = await listChats();
        if (cancelled) return;

        const routeId = chatIdFromPath(pathname);
        const requestedId = routeId ?? initialChatIdRef.current;
        const requested = requestedId
          ? existing.find((chat) => chat.id === requestedId)
          : undefined;

        if (requested) {
          setChats(existing);
          setActiveChatId(requested.id);
          if (routeId !== requested.id) {
            router.replace(`/c/${encodeURIComponent(requested.id)}`);
          }
          return;
        }

        if (existing.length > 0) {
          setChats(existing);
          setActiveChatId(existing[0].id);
          // Reached via `/` or an unknown id, so point the URL at the chat we
          // actually opened. Replacing rather than pushing keeps a dead id out
          // of the history.
          router.replace(`/c/${encodeURIComponent(existing[0].id)}`);
          return;
        }

        const chat = await createChat();
        if (cancelled) return;
        setChats([chat]);
        setActiveChatId(chat.id);
        router.replace(`/c/${encodeURIComponent(chat.id)}`);
      } catch (err) {
        console.error("Failed to bootstrap chats:", err);
        if (cancelled) return;
        setStorageError(CHAT_ERROR.bootstrap);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when route changes (back/forward/navigation)
  React.useEffect(() => {
    if (!ready) return;
    const routeId = chatIdFromPath(pathname);
    if (!routeId) return;
    if (routeId === activeChatId) return;

    const known = chats.some((chat) => chat.id === routeId);
    if (known) {
      queueMicrotask(() => setActiveChatId(routeId));
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const existing = dedupeById(await listChats());
        if (cancelled) return;

        const requested = existing.find((chat) => chat.id === routeId);
        if (requested) {
          queueMicrotask(() => {
            setChats(existing);
            setActiveChatId(requested.id);
          });
          return;
        }

        if (existing.length === 0) return;
        queueMicrotask(() => {
          setChats(existing);
          setActiveChatId(existing[0].id);
        });
        router.replace(`/c/${encodeURIComponent(existing[0].id)}`);
      } catch (err) {
        console.error("Failed to open chat from route:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, ready, chats, activeChatId, router]);

  /** Opens a chat and records it in history so Back returns to the previous one. */
  function selectChat(id: string) {
    // Re-selecting the open chat must not stack up history entries.
    if (id === activeChatId) return;
    setActiveChatId(id);
    router.push(`/c/${encodeURIComponent(id)}`);
  }

  async function newChat() {
    // Already sitting on an empty chat: stay put rather than stacking up
    // empty chats the user cannot tell apart. Staying put also means leaving
    // the URL alone.
    if (activeChatId) {
      try {
        const messages = await loadMessages(activeChatId);
        if (messages.length === 0) return;
      } catch {
        // If we cannot tell whether it is empty, go ahead and create one.
      }
    }

    try {
      const chat = await createChat();
      setChats((prev) => dedupeById([chat, ...prev]));
      setActiveChatId(chat.id);
      router.push(`/c/${encodeURIComponent(chat.id)}`);
    } catch (err) {
      console.error("Failed to create chat:", err);
      setStorageError(CHAT_ERROR.create);
    }
  }

  async function renameChatById(id: string, title: string) {
    try {
      await renameChat(id, title);
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === id ? { ...chat, title, updatedAt: Date.now() } : chat,
        ),
      );
    } catch (err) {
      console.error("Failed to rename chat:", err);
      setStorageError(CHAT_ERROR.rename);
    }
  }

  async function deleteChatById(id: string) {
    try {
      await deleteChat(id);

      if (id !== activeChatId) {
        setChats((prev) => prev.filter((chat) => chat.id !== id));
        return;
      }

      // The open chat was deleted, so move to another one, creating a fresh
      // chat if that was the last one. Replacing the URL keeps the deleted
      // chat's id out of the history, where it could only 404.
      const remaining = chats.filter((chat) => chat.id !== id);
      if (remaining.length > 0) {
        setChats(remaining);
        setActiveChatId(remaining[0].id);
        router.replace(`/c/${encodeURIComponent(remaining[0].id)}`);
      } else {
        const chat = await createChat();
        setChats([chat]);
        setActiveChatId(chat.id);
        router.replace(`/c/${encodeURIComponent(chat.id)}`);
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
      setStorageError(CHAT_ERROR.remove);
    }
  }

  /** Names the chat after its first user message, so the sidebar is readable. */
  async function nameFromFirstMessage(id: string, message: UIMessage) {
    try {
      const title = titleFromMessage(message);
      await renameChat(id, title);
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === id ? { ...chat, title, updatedAt: Date.now() } : chat,
        ),
      );
    } catch (err) {
      console.error("Failed to update chat:", err);
      setStorageError(CHAT_ERROR.renameFromMessage);
    }
  }

  return {
    chats,
    activeChatId,
    activeTitle,
    ready,
    storageError,
    dismissStorageError: () => setStorageError(null),
    newChat,
    selectChat,
    renameChatById,
    deleteChatById,
    nameFromFirstMessage,
  };
}
