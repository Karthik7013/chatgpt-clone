import { createChat, listChats } from "@/lib/server/chat-repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await listChats());
  } catch (err) {
    console.error("[api/chats] GET failed:", err);
    return Response.json({ error: "Failed to load chats." }, { status: 500 });
  }
}

export async function POST() {
  try {
    return Response.json(await createChat(), { status: 201 });
  } catch (err) {
    console.error("[api/chats] POST failed:", err);
    return Response.json({ error: "Failed to create chat." }, { status: 500 });
  }
}
