import { randomUUID } from "node:crypto";
import type { UIMessage } from "ai";

import { getDb, type ChatDoc, type MessageDoc } from "@/lib/mongodb";
import type { ChatSummary } from "@/lib/chat-store";

// Server-only chat persistence.
//
// NEVER import this module (or lib/mongodb / node builtins) from client
// components. Client code talks to the /api/chats routes, implemented in
// app/api/chats route handlers, which delegate here. This keeps all
// MongoDB collection logic in one maintainable place.

function toSummary(doc: ChatDoc): ChatSummary {
  return {
    id: doc._id,
    title: doc.title,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function listChats(): Promise<ChatSummary[]> {
  const db = await getDb();
  const docs = await db
    .collection<ChatDoc>("chats")
    .find()
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map(toSummary);
}

export async function createChat(): Promise<ChatSummary> {
  const db = await getDb();
  const now = Date.now();
  const doc: ChatDoc = {
    _id: randomUUID(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    userId: null,
  };
  await db.collection<ChatDoc>("chats").insertOne(doc);
  return toSummary(doc);
}

export async function getChat(id: string): Promise<ChatSummary | null> {
  const db = await getDb();
  const chat = await db.collection<ChatDoc>("chats").findOne({ _id: id });
  return chat ? toSummary(chat) : null;
}

export async function updateChatTitle(
  id: string,
  title: string,
): Promise<ChatSummary | null> {
  const db = await getDb();
  const chat = await db.collection<ChatDoc>("chats").findOne({ _id: id });
  if (!chat) return null;
  const now = Date.now();
  await db
    .collection<ChatDoc>("chats")
    .updateOne({ _id: id }, { $set: { title, updatedAt: now } });
  return { id, title, createdAt: chat.createdAt, updatedAt: now };
}

export async function deleteChat(id: string): Promise<void> {
  const db = await getDb();
  await db.collection<ChatDoc>("chats").deleteOne({ _id: id });
  await db.collection<MessageDoc>("messages").deleteOne({ _id: id });
}

export async function loadMessages(id: string): Promise<UIMessage[]> {
  const db = await getDb();
  const doc = await db
    .collection<MessageDoc>("messages")
    .findOne({ _id: id });
  return doc?.messages ?? [];
}

export async function saveMessages(
  id: string,
  messages: UIMessage[],
): Promise<void> {
  const db = await getDb();
  await db
    .collection<MessageDoc>("messages")
    .updateOne(
      { _id: id },
      { $set: { messages, updatedAt: Date.now() } },
      { upsert: true },
    );
}
