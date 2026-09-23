import { randomUUID } from "node:crypto";
import { getDb, type ChatDoc } from "@/lib/mongodb";
import type { ChatSummary } from "@/lib/chat-store";

export const runtime = "nodejs";

function toSummary(doc: ChatDoc): ChatSummary {
  return {
    id: doc._id,
    title: doc.title,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db
      .collection<ChatDoc>("chats")
      .find()
      .sort({ updatedAt: -1 })
      .toArray();
    return Response.json(docs.map(toSummary));
  } catch (err) {
    console.error("[api/chats] GET failed:", err);
    return Response.json({ error: "Failed to load chats." }, { status: 500 });
  }
}

export async function POST() {
  try {
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
    return Response.json(toSummary(doc), { status: 201 });
  } catch (err) {
    console.error("[api/chats] POST failed:", err);
    return Response.json({ error: "Failed to create chat." }, { status: 500 });
  }
}
