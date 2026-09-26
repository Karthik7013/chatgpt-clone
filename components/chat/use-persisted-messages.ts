"use client";

import * as React from "react";
import type { UIMessage } from "ai";

import { loadMessages, saveMessages } from "@/lib/chat-store";

const AUTOSAVE_DEBOUNCE_MS = 800;

/**
 * Loads a chat's messages once and saves them back whenever they change.
 *
 * `null` messages means "still loading", which the caller renders as a
 * spinner. A load failure resolves to an empty list and sets `loadFailed`, so
 * a broken database shows a usable empty chat instead of a spinner forever.
 * Saving is skipped entirely in that case, which stops an empty chat from
 * overwriting history that failed to load.
 */
export function usePersistedMessages(chatId: string): {
  messages: UIMessage[] | null;
  loadFailed: boolean;
} {
  const [messages, setMessages] = React.useState<UIMessage[] | null>(null);
  const [loadFailed, setLoadFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    loadMessages(chatId)
      .then((loaded) => {
        if (!cancelled) setMessages(loaded);
      })
      .catch((err) => {
        console.error("Failed to load messages:", err);
        if (cancelled) return;
        setMessages([]);
        setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  return { messages, loadFailed };
}

/**
 * Debounced autosave. Waits until messages stop changing so a streamed reply
 * is written once at the end rather than on every token.
 */
export function useAutosaveMessages({
  chatId,
  messages,
  enabled,
  onError,
}: {
  chatId: string;
  messages: UIMessage[];
  enabled: boolean;
  onError: (message: string) => void;
}) {
  // Held in a ref so that passing an inline callback does not re-run the
  // effect and keep resetting the debounce while a reply streams in.
  const onErrorRef = React.useRef(onError);
  React.useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  React.useEffect(() => {
    if (!enabled || messages.length === 0) return;

    const timer = window.setTimeout(() => {
      void saveMessages(chatId, messages).catch((err) => {
        console.error("Failed to save messages:", err);
        onErrorRef.current("Changes could not be saved to the database.");
      });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [messages, chatId, enabled]);
}
