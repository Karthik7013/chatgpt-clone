"use client";

import type { UIMessage } from "ai";

export type ChatSummary = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

const INDEX_KEY = "chatgpt-clone:chats";
const messagesKey = (id: string) => `chatgpt-clone:messages:${id}`;

function isBrowser() {
  return typeof window !== "undefined";
}

function readIndex(): ChatSummary[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as ChatSummary[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(chats: ChatSummary[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(chats));
  } catch (err) {
    console.error("Failed to write chat index:", err);
  }
}

export function listChats(): ChatSummary[] {
  return readIndex().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createChat(): ChatSummary {
  const now = Date.now();
  const chat: ChatSummary = {
    id: crypto.randomUUID(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
  };
  const chats = readIndex();
  chats.push(chat);
  writeIndex(chats);
  return chat;
}

export function touchChat(id: string, title?: string) {
  const chats = readIndex();
  const chat = chats.find((c) => c.id === id);
  if (!chat) return;
  chat.updatedAt = Date.now();
  if (title) chat.title = title;
  writeIndex(chats);
}

export function deleteChat(id: string) {
  writeIndex(readIndex().filter((c) => c.id !== id));
  if (isBrowser()) {
    window.localStorage.removeItem(messagesKey(id));
  }
}

export function renameChat(id: string, title: string) {
  const chats = readIndex();
  const chat = chats.find((c) => c.id === id);
  if (!chat) return;
  chat.title = title;
  writeIndex(chats);
}

export function loadMessages(id: string): UIMessage[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(messagesKey(id));
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveMessages(id: string, messages: UIMessage[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(messagesKey(id), JSON.stringify(messages));
  } catch (err) {
    console.error("Failed to save messages:", err);
  }
}

/** Derives a short chat title from the first user message's text parts. */
export function titleFromMessage(message: UIMessage): string {
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .trim();
  if (!text) return "New chat";
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}
