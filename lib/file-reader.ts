const MAX_CONTENT_BYTES = 50 * 1024; // 50 KB

const TEXT_MIME_TYPES = new Set([
  "text/",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-javascript",
  "application/typescript",
  "application/x-yaml",
  "application/yaml",
  "application/x-tex",
  "application/x-latex",
  "application/x-sh",
  "application/x-shellscript",
  "application/sql",
  "application/toml",
  "application/csv",
]);

export function isTextReadable(mediaType?: string): boolean {
  if (!mediaType) return false;
  const lower = mediaType.toLowerCase();
  if (lower.startsWith("text/")) return true;
  return TEXT_MIME_TYPES.has(lower);
}

export async function fetchTextContent(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`);

  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.byteLength > MAX_CONTENT_BYTES) {
    const truncated = bytes.slice(0, MAX_CONTENT_BYTES);
    return new TextDecoder().decode(truncated) + "\n\n[Truncated at 50 KB]";
  }

  return new TextDecoder().decode(bytes);
}

export interface FileAttachment {
  filename?: string;
  url?: string;
  mediaType?: string;
}

export async function fetchAllFileContents(
  files: FileAttachment[],
): Promise<string[]> {
  return Promise.all(
    files
      .filter((f) => f.url && isTextReadable(f.mediaType))
      .map(async (f) => {
        try {
          const content = await fetchTextContent(f.url!);
          return `--- File: ${f.filename} ---\n${content}\n--- End of file ---`;
        } catch {
          return `--- File: ${f.filename} ---\n[Failed to read file content]\n--- End of file ---`;
        }
      }),
  );
}
