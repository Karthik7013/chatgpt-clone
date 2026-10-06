import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
} from "ai";

import { createModel } from "@/lib/providers/factory";
import { DEFAULT_MODEL_ID } from "@/lib/providers/provider-config";
import { loadTools } from "@/lib/tools/server";
import { MAX_STEPS, SYSTEM_PROMPT } from "@/lib/tools/system-prompt";
import { readChatRequest } from "@/lib/tools/read-chat-request";
import {
  attachFileContents,
  withoutFileParts,
} from "@/lib/tools/attach-file-contents";

// Tool calls and reasoning can take a while, so allow a long stream.
export const maxDuration = 60;

export async function POST(req: Request) {
  const request = await readChatRequest(req);
  if ("response" in request) return request.response;

  const { messages, model, webSearchEnabled } = request.data;
  const selectedModel = model ?? DEFAULT_MODEL_ID;

  // A bad model id or missing API key is the client's fault, not ours.
  let result: ReturnType<typeof streamText>;
  let closeAll: () => Promise<void>;
  try {
    const messagesWithFiles = await attachFileContents(messages);
    const modelMessages = await convertToModelMessages(
      withoutFileParts(messagesWithFiles),
    );
    const loaded = await loadTools({ webSearchEnabled });
    closeAll = loaded.closeAll;

    result = streamText({
      model: createModel(selectedModel),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools: loaded.tools,
      stopWhen: stepCountIs(MAX_STEPS),
      onError: ({ error }) => {
        console.error("[api/chat] stream error:", error);
        // A failed stream may never reach onFinish, so release here too.
        void closeAll();
      },
      // Release MCP connections on every exit path, including client aborts.
      onFinish: () => closeAll(),
      onAbort: () => closeAll(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/chat] failed to start stream:", message);
    if (message.includes("Unknown provider") || message.includes("API key not configured")) {
      return Response.json({ error: message }, { status: 400 });
    }
    return Response.json({ error: "Failed to generate response" }, { status: 500 });
  }

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      sendReasoning: true,
      sendSources: true,
    }),
  });
}
