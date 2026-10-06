"use client";

import * as React from "react";

import type { ChatSummary } from "@/lib/chat-store";
import { useChatBootstrap } from "@/components/chat/use-chat-bootstrap";
import { useActiveChatEmptiness } from "@/components/chat/use-active-chat-emptiness";
import { useChatHistory } from "@/components/chat/use-chat-history";
import { useChatActions } from "@/components/chat/use-chat-actions";

/**
 * Owns the chat list and every operation on it: which chat is open, creating,
 * renaming, deleting, and naming a chat after its first message.
 *
 * State lives here; lifecycle (bootstrap, emptiness check, history
 * navigation) and operations live in focused hooks. The return shape is the
 * component-facing API — `app.tsx` destructures it, so keep it stable.
 */
export function useChats(initialChatId?: string) {
  const [chats, setChats] = React.useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [activeChatNonEmpty, setActiveChatNonEmpty] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [storageError, setStorageError] = React.useState<string | null>(null);

  const activeTitle =
    chats.find((chat) => chat.id === activeChatId)?.title ?? "New chat";

  useChatBootstrap({
    initialChatId,
    setChats,
    setActiveChatId,
    setReady,
    setStorageError,
  });

  useActiveChatEmptiness({ activeChatId, setActiveChatNonEmpty });

  useChatHistory({ chats, activeChatId, ready, setChats, setActiveChatId });

  const {
    newChat,
    selectChat,
    renameChatById,
    deleteChatById,
    nameFromFirstMessage,
  } = useChatActions({
    activeChatId,
    setChats,
    setActiveChatId,
    setStorageError,
  });

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
