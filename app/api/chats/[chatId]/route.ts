import { z } from "zod";
import {
  deleteChat,
  getChat,
  updateChatTitle,
} from "@/lib/server/chat-repository";
import { apiError, apiOk } from "@/lib/api-response";

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
    return apiError("api/chats", "Invalid request body.", 400);
  }
  try {
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("api/chats", "Invalid request body.", 400);
    }
    const chat = await getChat(chatId);
    if (!chat) {
      return apiError("api/chats", "Chat not found.", 404);
    }
    const summary = await updateChatTitle(
      chatId,
      parsed.data.title ?? chat.title,
    );
    if (!summary) {
      return apiError("api/chats", "Chat not found.", 404);
    }
    return apiOk(summary);
  } catch (err) {
    return apiError("api/chats", "Failed to update chat.", 500, err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  try {
    await deleteChat(chatId);
    return apiOk({ ok: true });
  } catch (err) {
    return apiError("api/chats", "Failed to delete chat.", 500, err);
  }
}
