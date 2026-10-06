"use client";

import * as React from "react";

import { loadMessages } from "@/lib/chat-store";

/**
 * Tracks whether the open chat has any messages. The header only offers
 * rename and delete once a chat is non-empty, since both actions are
 * pointless on an empty one. A failure here just leaves the menu hidden,
 * which is not worth reporting.
 */
export function useActiveChatEmptiness({
  activeChatId,
  setActiveChatNonEmpty,
}: {
  activeChatId: string | null;
  setActiveChatNonEmpty: React.Dispatch<React.SetStateAction<boolean>>;
}) {
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
  }, [activeChatId, setActiveChatNonEmpty]);
}
