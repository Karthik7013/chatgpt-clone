"use client";

import * as React from "react";

import {
  createChat,
  listChats,
  type ChatSummary,
} from "@/lib/chat-store";
import { dedupeById } from "@/lib/chat-list";
import { chatIdFromPath, writeChatUrl } from "@/lib/chat-url";
import { CHAT_ERROR } from "@/components/chat/chat-errors";
import { useChatActions } from "@/components/chat/use-chat-actions";

/**
 * Owns the chat list and every operation on it: which chat is open, creating,
 * renaming, deleting, and naming a chat after its first message.
 *
 * State and lifecycle (one-time bootstrap, Back/Forward navigation) live
 * here; row operations live in `useChatActions`. The return shape is the
 * component-facing API — `app.tsx` destructures it, so keep it stable.
 */
export function useChats(initialChatId?: string) {
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

        const requested = initialChatIdRef.current
          ? existing.find((chat) => chat.id === initialChatIdRef.current)
          : undefined;

        if (requested) {
          setChats(existing);
          setActiveChatId(requested.id);
          // The deep link already matches; nothing to correct.
          return;
        }

        if (existing.length > 0) {
          setChats(existing);
          setActiveChatId(existing[0].id);
          // Reached via `/` or an unknown id, so point the URL at the chat we
          // actually opened. Replacing rather than pushing keeps a dead id out
          // of the history.
          writeChatUrl(existing[0].id, "replace");
          return;
        }

        const chat = await createChat();
        if (cancelled) return;
        setChats([chat]);
        setActiveChatId(chat.id);
        writeChatUrl(chat.id, "replace");
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
  }, []);

  // Back and Forward move between chats. The browser has already written the
  // URL by the time `popstate` fires, so this only has to open that chat —
  // writing history again here would trap the user.
  React.useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function onPopState() {
      const id = chatIdFromPath(window.location.pathname);
      // Not a chat URL: the user left the app, which Next.js owns.
      if (!id || id === activeChatId) return;

      const known = chats.some((chat) => chat.id === id);
      if (known) {
        setActiveChatId(id);
        return;
      }

      // A chat that was deleted, or one this tab has not seen yet. Reload the
      // list before giving up on it, then fall back to the newest chat and
      // replace the now-unreachable entry.
      try {
        const existing = dedupeById(await listChats());
        if (cancelled) return;

        const requested = existing.find((chat) => chat.id === id);
        if (requested) {
          setChats(existing);
          setActiveChatId(requested.id);
          return;
        }

        if (existing.length === 0) return;
        setChats(existing);
        setActiveChatId(existing[0].id);
        writeChatUrl(existing[0].id, "replace");
      } catch (err) {
        console.error("Failed to open chat from history:", err);
      }
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", onPopState);
    };
  }, [chats, activeChatId, ready]);

  const {
    newChat,
    selectChat,
    renameChatById,
    deleteChatById,
    nameFromFirstMessage,
  } = useChatActions({
    chats,
    activeChatId,
    setChats,
    setActiveChatId,
    setStorageError,
  });

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
