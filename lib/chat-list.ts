import type { ChatSummary } from "@/lib/chat-store";

/**
 * Keeps the first chat for any id. Chats are sorted by recency, and two chats
 * created in the same millisecond can come back interleaved, so the list is
 * deduplicated before it reaches the sidebar.
 */
export function dedupeById(chats: ChatSummary[]): ChatSummary[] {
  const seen = new Set<string>();
  return chats.filter((chat) => !seen.has(chat.id) && seen.add(chat.id));
}
