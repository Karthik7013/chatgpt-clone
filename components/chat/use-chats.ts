"use client";

import * as React from "react";
import type { UIMessage } from "ai";

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

/** User-facing failure messages, kept together so they read consistently. */
const ERROR = {
  bootstrap:
    "Could not reach the database. Check that MONGODB_URI is set and reachable.",
  create: "Could not create a new chat.",
  rename: "Could not rename the chat.",
  remove: "Could not delete the chat.",
  renameFromMessage: "Could not update the chat.",
} as const;

/**
 * Keeps the first chat for any id. Chats are sorted by recency, and two chats
 * created in the same millisecond can come back interleaved, so the list is
 * deduplicated before it reaches the sidebar.
 */
function dedupeById(chats: ChatSummary[]): ChatSummary[] {
  const seen = new Set<string>();
  return chats.filter((chat) => !seen.has(chat.id) && seen.add(chat.id));
}

const CHAT_PATH = /^\/c\/([^/]+)$/;

function chatPath(id: string): string {
  return `/c/${encodeURIComponent(id)}`;
}

/** The chat id in the current URL, or null when the URL is not a chat. */
function chatIdFromPath(pathname: string): string | null {
  const match = CHAT_PATH.exec(pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/** Moves the URL to a chat without remounting the tree, so no stream aborts. */
function writeChatUrl(id: string, mode: "push" | "replace") {
  const url = chatPath(id);
  if (window.location.pathname === url) return;
  if (mode === "push") {
    window.history.pushState(null, "", url);
  } else {
    window.history.replaceState(null, "", url);
  }
}

/**
 * Owns the chat list and every operation on it: which chat is open, creating,
 * renaming, deleting, and naming a chat after its first message.
 *
 * `storageError` is surfaced to the user rather than thrown, because most of
 * these failures (an unreachable database) should leave the app usable.
 */
export function useChats(initialChatId?: string) {
  const [chats, setChats] = React.useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [activeChatNonEmpty, setActiveChatNonEmpty] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [storageError, setStorageError] = React.useState<string | null>(null);

  // Read once. The deep-linked chat decides what opens first, and re-running
  // the bootstrap when it changes would throw away the user's place.
  const initialChatIdRef = React.useRef(initialChatId);

  const activeTitle =
    chats.find((chat) => chat.id === activeChatId)?.title ?? "New chat";

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
        setStorageError(ERROR.bootstrap);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  // The header only offers rename and delete once a chat has messages, since
  // both actions are pointless on an empty one. A failure here just leaves the
  // menu hidden, which is not worth reporting.
  React.useEffect(() => {
    if (!activeChatId) return;
    let cancelled = false;
    loadMessages(activeChatId)
      .then((messages) => {
        if (!cancelled) setActiveChatNonEmpty(messages.length > 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  // Back and Forward move between chats. The browser has already written the
  // URL by the time this fires, so this only has to open that chat — writing
  // history again here would trap the user.
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

  async function refreshChats() {
    setChats(dedupeById(await listChats()));
  }

  /** Opens a chat and records it in history so Back returns to the previous one. */
  function selectChat(id: string) {
    // Re-selecting the open chat must not stack up history entries.
    if (id === activeChatId) return;
    setActiveChatId(id);
    writeChatUrl(id, "push");
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
      await refreshChats();
      setActiveChatId(chat.id);
      writeChatUrl(chat.id, "push");
    } catch (err) {
      console.error("Failed to create chat:", err);
      setStorageError(ERROR.create);
    }
  }

  async function renameChatById(id: string, title: string) {
    try {
      await renameChat(id, title);
      await refreshChats();
    } catch (err) {
      console.error("Failed to rename chat:", err);
      setStorageError(ERROR.rename);
    }
  }

  async function deleteChatById(id: string) {
    try {
      await deleteChat(id);
      const remaining = dedupeById(
        (await listChats()).filter((chat) => chat.id !== id),
      );

      if (id !== activeChatId) {
        setChats(remaining);
        return;
      }

      // The open chat was deleted, so move to another one, creating a fresh
      // chat if that was the last one. Replacing the URL keeps the deleted
      // chat's id out of the history, where it could only 404.
      if (remaining.length > 0) {
        setChats(remaining);
        setActiveChatId(remaining[0].id);
        writeChatUrl(remaining[0].id, "replace");
      } else {
        const chat = await createChat();
        setChats([chat]);
        setActiveChatId(chat.id);
        writeChatUrl(chat.id, "replace");
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
      setStorageError(ERROR.remove);
    }
  }

  /** Names the chat after its first user message, so the sidebar is readable. */
  async function nameFromFirstMessage(id: string, message: UIMessage) {
    try {
      await touchChat(id, titleFromMessage(message));
      await refreshChats();
    } catch (err) {
      console.error("Failed to update chat:", err);
      setStorageError(ERROR.renameFromMessage);
    }
  }

  return {
    chats,
    activeChatId,
    activeTitle,
    activeChatNonEmpty,
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
