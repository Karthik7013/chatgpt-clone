import { createChat, listChats } from "@/lib/server/chat-repository";
import { apiError, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET() {
  try {
    return apiOk(await listChats());
  } catch (err) {
    return apiError("api/chats", "Failed to load chats.", 500, err);
  }
}

export async function POST() {
  try {
    return apiOk(await createChat(), 201);
  } catch (err) {
    return apiError("api/chats", "Failed to create chat.", 500, err);
  }
}
