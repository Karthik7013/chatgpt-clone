"use client";

import * as React from "react";

import { listChats, type ChatSummary } from "@/lib/chat-store";
import { dedupeById } from "@/lib/chat-list";
import { chatIdFromPath, writeChatUrl } from "@/lib/chat-url";

/**
 * Back and Forward move between chats. The browser has already written the
 * URL by the time `popstate` fires, so this only has to open that chat —
 * writing history again here would trap the user.
 */
export function useChatHistory({
  chats,
  activeChatId,
  ready,
  setChats,
  setActiveChatId,
}: {
  chats: ChatSummary[];
  activeChatId: string | null;
  ready: boolean;
  setChats: React.Dispatch<React.SetStateAction<ChatSummary[]>>;
  setActiveChatId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
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
  }, [chats, activeChatId, ready, setActiveChatId, setChats]);
}
