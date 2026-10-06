import type { UIMessage } from "ai";
import { loadMessages, saveMessages } from "@/lib/server/chat-repository";

export const runtime = "nodejs";

const MAX_MESSAGES = 2000;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  try {
    return Response.json(await loadMessages(chatId));
  } catch (err) {
    console.error(`[api/chats] GET ${chatId}/messages failed:`, err);
    return Response.json({ error: "Failed to load messages." }, { status: 500 });
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
      return Response.json(
        { error: "Body must be a messages array." },
        { status: 400 },
      );
    }
    if (body.length > MAX_MESSAGES) {
      return Response.json({ error: "Too many messages." }, { status: 400 });
    }
    const messages = body as UIMessage[];
    await saveMessages(chatId, messages);
    return Response.json({ ok: true });
  } catch (err) {
    console.error(`[api/chats] PUT ${chatId}/messages failed:`, err);
    return Response.json({ error: "Failed to save messages." }, { status: 500 });
  }
}
