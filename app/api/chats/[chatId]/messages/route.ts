import type { UIMessage } from "ai";
import { loadMessages, saveMessages } from "@/lib/server/chat-repository";
import { apiError, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

const MAX_MESSAGES = 2000;

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
  try {
    const body: unknown = await req.json();
    if (!Array.isArray(body)) {
      return apiError("api/chats", "Body must be a messages array.", 400);
    }
    if (body.length > MAX_MESSAGES) {
      return apiError("api/chats", "Too many messages.", 400);
    }
    const messages = body as UIMessage[];
    await saveMessages(chatId, messages);
    return apiOk({ ok: true });
  } catch (err) {
    return apiError("api/chats", "Failed to save messages.", 500, err);
  }
}
