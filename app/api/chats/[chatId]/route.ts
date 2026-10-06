import { z } from "zod";
import {
  deleteChat,
  getChat,
  updateChatTitle,
} from "@/lib/server/chat-repository";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid request body." }, { status: 400 });
    }
    const chat = await getChat(chatId);
    if (!chat) {
      return Response.json({ error: "Chat not found." }, { status: 404 });
    }
    const summary = await updateChatTitle(
      chatId,
      parsed.data.title ?? chat.title,
    );
    if (!summary) {
      return Response.json({ error: "Chat not found." }, { status: 404 });
    }
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
    await deleteChat(chatId);
    return Response.json({ ok: true });
  } catch (err) {
    console.error(`[api/chats] DELETE ${chatId} failed:`, err);
    return Response.json({ error: "Failed to delete chat." }, { status: 500 });
  }
}
