import { z } from "zod";
import { getDb, type ChatDoc, type MessageDoc } from "@/lib/mongodb";
import type { ChatSummary } from "@/lib/chat-store";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  try {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid request body." }, { status: 400 });
    }
    const db = await getDb();
    const chat = await db.collection<ChatDoc>("chats").findOne({ _id: chatId });
    if (!chat) {
      return Response.json({ error: "Chat not found." }, { status: 404 });
    }
    const now = Date.now();
    const title = parsed.data.title ?? chat.title;
    await db
      .collection<ChatDoc>("chats")
      .updateOne({ _id: chatId }, { $set: { title, updatedAt: now } });
    const summary: ChatSummary = {
      id: chatId,
      title,
      createdAt: chat.createdAt,
      updatedAt: now,
    };
    return Response.json(summary);
  } catch (err) {
    console.error(`[api/chats] PATCH ${chatId} failed:`, err);
    return Response.json({ error: "Failed to update chat." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  try {
    const db = await getDb();
    await db.collection<ChatDoc>("chats").deleteOne({ _id: chatId });
    await db.collection<MessageDoc>("messages").deleteOne({ _id: chatId });
    return Response.json({ ok: true });
  } catch (err) {
    console.error(`[api/chats] DELETE ${chatId} failed:`, err);
    return Response.json({ error: "Failed to delete chat." }, { status: 500 });
  }
}
