import { z } from "zod";
import type { UIMessage } from "ai";

import { apiError } from "@/lib/api-response";

const chatRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()).min(1),
  model: z.string().optional(),
  webSearchEnabled: z.boolean().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * Parses and validates the POST body. Returns the parsed value, or a `Response`
 * ready to return to the client.
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

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      response: apiError("api/chat", "messages array required", 400),
    };
  }

  return { data: parsed.data };
}
