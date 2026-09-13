const MAX_CONTENT_BYTES = 50 * 1024; // 50 KB

const TEXT_EXTENSIONS = new Set([
  ".txt", ".csv", ".json", ".md", ".ts", ".tsx", ".js", ".jsx",
  ".xml", ".html", ".css", ".py", ".java", ".c", ".cpp",
  ".rb", ".go", ".rs", ".sql", ".yaml", ".yml", ".toml",
  ".ini", ".cfg", ".log", ".sh", ".bash", ".env", ".gitignore",
]);

export function isTextReadable(filename: string): boolean {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) return false;
  const ext = filename.slice(idx).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
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
      .filter((f) => f.filename && f.url && isTextReadable(f.filename))
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
