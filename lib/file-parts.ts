import type { FileUIPart, UIMessage } from "ai";

/** File part as sent by the client; may include a temporary download URL. */
export type ClientFileUIPart = FileUIPart & { tmpUrl?: string };

export function isClientFilePart(part: unknown): part is ClientFileUIPart {
  if (!part || typeof part !== "object") return false;
  const p = part as { type?: unknown; mediaType?: unknown; url?: unknown };
  return p.type === "file" && typeof p.mediaType === "string" && typeof p.url === "string";
}

export function filePartsOf(message: UIMessage): ClientFileUIPart[] {
  return message.parts.filter(isClientFilePart);
}

export function getFileUrl(part: ClientFileUIPart): string {
  return part.tmpUrl || part.url;
}
