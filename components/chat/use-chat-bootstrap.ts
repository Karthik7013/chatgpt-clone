"use client";

import * as React from "react";

import { createChat, listChats, type ChatSummary } from "@/lib/chat-store";
import { writeChatUrl } from "@/lib/chat-url";
import { CHAT_ERROR } from "@/components/chat/chat-errors";

/**
 * Loads the chat list once and decides which chat opens first: the deep-linked
 * chat when it exists, otherwise the newest chat, otherwise a fresh chat.
 *
 * Runs exactly once. Re-running the bootstrap when the deep link changes would
 * throw away the user's place, so the initial id is captured in a ref.
 */
export function useChatBootstrap({
  initialChatId,
  setChats,
  setActiveChatId,
  setReady,
  setStorageError,
}: {
  initialChatId?: string;
  setChats: React.Dispatch<React.SetStateAction<ChatSummary[]>>;
  setActiveChatId: React.Dispatch<React.SetStateAction<string | null>>;
  setReady: React.Dispatch<React.SetStateAction<boolean>>;
  setStorageError: React.Dispatch<React.SetStateAction<string | null>>;
}) {
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
  }, [setActiveChatId, setChats, setReady, setStorageError]);
}
