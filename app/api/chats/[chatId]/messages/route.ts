import { z } from "zod";
import type { UIMessage } from "ai";
import { getChat, loadMessages, saveMessages } from "@/lib/server/chat-repository";
import { apiError, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

const MAX_MESSAGES = 2000;

const messageSchema = z.object({
  id: z.string().min(1).max(200),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(z.unknown()),
});

const messagesSchema = z.array(messageSchema).max(MAX_MESSAGES);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  try {
    return apiOk(await loadMessages(chatId));
  } catch (err) {
    return apiError("api/chats", "Failed to load messages.", 500, err);
  }
}

export async function PUT(
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
    const parsed = messagesSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("api/chats", "Body must be a messages array (max 2000, each with id/role/parts).", 400);
    }
    const chat = await getChat(chatId);
    if (!chat) {
      return apiError("api/chats", "Chat not found.", 404);
    }
    await saveMessages(chatId, parsed.data as UIMessage[]);
    return apiOk({ ok: true });
  } catch (err) {
    return apiError("api/chats", "Failed to save messages.", 500, err);
  }
}
