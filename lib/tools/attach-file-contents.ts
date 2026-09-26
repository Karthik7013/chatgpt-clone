import type { FileUIPart, UIMessage } from "ai";

import { fetchAllFileContents } from "@/lib/file-reader";

/** Client adds `tmpUrl` to file parts; the AI SDK type does not declare it. */
type PendingFilePart = FileUIPart & { tmpUrl?: string };

function filePartsOf(message: UIMessage): PendingFilePart[] {
  return message.parts.filter(
    (part): part is PendingFilePart => part.type === "file",
  );
}

/**
 * Inlines the text content of every attached file into the user message that
 * carries it, so the model sees the file text rather than just a URL.
 *
 * Files that are not text-readable (images, audio) are left as file parts and
 * dropped before conversion to model messages. Runs per message in parallel
 * and never throws: an unreadable file becomes a placeholder line.
 */
export async function attachFileContents(
  messages: UIMessage[],
): Promise<UIMessage[]> {
  return Promise.all(
    messages.map(async (message) => {
      if (message.role !== "user") return message;

      const files = filePartsOf(message);
      if (files.length === 0) return message;

      const contents = await fetchAllFileContents(
        files.map((file) => ({
          filename: file.filename,
          // tmpUrl is the short-lived URL; url is the durable download link.
          url: file.tmpUrl || file.url,
          mediaType: file.mediaType,
        })),
      );
      if (contents.length === 0) return message;

      const textParts = message.parts.filter((part) => part.type === "text");
      return {
        ...message,
        parts: [...textParts, { type: "text" as const, text: contents.join("\n\n") }],
      };
    }),
  );
}

/**
 * Strips file parts, leaving text-only messages for the model. File content
 * has already been inlined as text by `attachFileContents`.
 */
export function withoutFileParts(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.filter((part) => part.type !== "file"),
  }));
}
