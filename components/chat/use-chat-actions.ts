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
import { dedupeById } from "@/lib/chat-list";
import { writeChatUrl } from "@/lib/chat-url";
import { CHAT_ERROR } from "@/components/chat/chat-errors";

/**
 * Every operation on the chat list: opening, creating, renaming, deleting,
 * and naming a chat after its first message.
 *
 * `storageError` is surfaced to the user rather than thrown, because most of
 * these failures (an unreachable database) should leave the app usable.
 */
export function useChatActions({
  activeChatId,
  setChats,
  setActiveChatId,
  setStorageError,
}: {
  activeChatId: string | null;
  setChats: React.Dispatch<React.SetStateAction<ChatSummary[]>>;
  setActiveChatId: React.Dispatch<React.SetStateAction<string | null>>;
  setStorageError: React.Dispatch<React.SetStateAction<string | null>>;
}) {
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
      setStorageError(CHAT_ERROR.create);
    }
  }

  async function renameChatById(id: string, title: string) {
    try {
      await renameChat(id, title);
      await refreshChats();
    } catch (err) {
      console.error("Failed to rename chat:", err);
      setStorageError(CHAT_ERROR.rename);
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
      setStorageError(CHAT_ERROR.remove);
    }
  }

  /** Names the chat after its first user message, so the sidebar is readable. */
  async function nameFromFirstMessage(id: string, message: UIMessage) {
    try {
      await touchChat(id, titleFromMessage(message));
      await refreshChats();
    } catch (err) {
      console.error("Failed to update chat:", err);
      setStorageError(CHAT_ERROR.renameFromMessage);
    }
  }

  return {
    newChat,
    selectChat,
    renameChatById,
    deleteChatById,
    nameFromFirstMessage,
  };
}
