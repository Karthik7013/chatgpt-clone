import type { UIMessage } from "ai";

import { apiError } from "@/lib/api-response";

export type ChatRequest = {
  messages: UIMessage[];
  model?: string;
  webSearchEnabled?: boolean;
};

/**
 * Parses and validates the POST body. Returns the parsed value, or a `Response`
 * ready to return to the client.
 *
 * Deliberately shallow: message parts are the AI SDK's union and validating
 * them deeply buys nothing — the SDK coerces on conversion. We check the
 * envelope (non-empty array, optional scalar fields) and nothing more.
 */
export async function readChatRequest(
  req: Request,
): Promise<{ data: ChatRequest } | { response: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { response: apiError("api/chat", "Invalid request body", 400) };
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as { messages?: unknown }).messages) ||
    (body as { messages: unknown[] }).messages.length === 0
  ) {
    return {
      response: apiError("api/chat", "messages array required", 400),
    };
  }

  const { messages, model, webSearchEnabled } = body as {
    messages: UIMessage[];
    model?: unknown;
    webSearchEnabled?: unknown;
  };
  if (model !== undefined && typeof model !== "string") {
    return { response: apiError("api/chat", "model must be a string", 400) };
  }
  if (webSearchEnabled !== undefined && typeof webSearchEnabled !== "boolean") {
    return {
      response: apiError("api/chat", "webSearchEnabled must be a boolean", 400),
    };
  }

  return { data: { messages, model, webSearchEnabled } };
}
