"use client";

import * as React from "react";
import type { UIMessage } from "ai";

import { loadMessages, saveMessages } from "@/lib/chat-store";

const AUTOSAVE_DEBOUNCE_MS = 800;

export type ChatMessagesPersistenceStatus = "loading" | "ready" | "failed";

export type ChatMessagesPersistence = {
  messages: UIMessage[] | null;
  loadStatus: ChatMessagesPersistenceStatus;
  loadFailed: boolean;
  saveError: string | null;
  dismissSaveError: () => void;
};

/**
 * Loads a chat's messages once and saves them back whenever they change.
 *
 * `messages` is `null` while loading. On load failure, resolves to an empty
 * list with `loadFailed` true so the UI can show a banner and saving is
 * skipped to avoid overwriting history.
 */
export function useChatMessagesPersistence(chatId: string): ChatMessagesPersistence {
  const [messages, setMessages] = React.useState<UIMessage[] | null>(null);
  const [loadStatus, setLoadStatus] = React.useState<ChatMessagesPersistenceStatus>("loading");
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setMessages(null);
      setLoadStatus("loading");
      setSaveError(null);
    });

    loadMessages(chatId)
      .then((loaded) => {
        if (!cancelled) {
          queueMicrotask(() => {
            if (cancelled) return;
            setMessages(loaded);
            setLoadStatus("ready");
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load messages:", err);
        if (cancelled) return;
        queueMicrotask(() => {
          if (cancelled) return;
          setMessages([]);
          setLoadStatus("failed");
        });
      });

    return () => {
      cancelled = true;
    };
  }, [chatId]);

  const loadFailed = loadStatus === "failed";
  const enabled = loadStatus === "ready";

  React.useEffect(() => {
    if (!enabled || messages === null || messages.length === 0) return;

    const timer = window.setTimeout(() => {
      void saveMessages(chatId, messages).catch((err) => {
        console.error("Failed to save messages:", err);
        setSaveError("Changes could not be saved to the database.");
      });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [messages, chatId, enabled]);

  return {
    messages,
    loadStatus,
    loadFailed,
    saveError,
    dismissSaveError: () => setSaveError(null),
  };
}

/**
 * Loads a chat's messages once and saves them back whenever they change.
 *
 * @deprecated Use useChatMessagesPersistence instead.
 */
export function usePersistedMessages(chatId: string): {
  messages: UIMessage[] | null;
  loadFailed: boolean;
} {
  const { messages, loadFailed } = useChatMessagesPersistence(chatId);
  return { messages, loadFailed };
}

/**
 * Debounced autosave.
 *
 * @deprecated Use useChatMessagesPersistence instead.
 */
export function useAutosaveMessages({
  chatId,
  messages,
  enabled,
}: {
  chatId: string;
  messages: UIMessage[];
  enabled: boolean;
}): {
  saveError: string | null;
  dismissSaveError: () => void;
} {
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled || messages.length === 0) return;

    const timer = window.setTimeout(() => {
      void saveMessages(chatId, messages).catch((err) => {
        console.error("Failed to save messages:", err);
        setSaveError("Changes could not be saved to the database.");
      });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [messages, chatId, enabled]);

  return { saveError, dismissSaveError: () => setSaveError(null) };
}
