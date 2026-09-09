const MAX_CONTENT_BYTES = 50 * 1024; // 50 KB
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

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

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`);
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Failed to fetch file after retries");
}

export async function fetchTextContent(url: string): Promise<string> {
  const res = await fetchWithRetry(url);

  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.byteLength > MAX_CONTENT_BYTES) {
    const truncated = bytes.slice(0, MAX_CONTENT_BYTES);
    return new TextDecoder().decode(truncated) + "\n\n[Truncated at 50 KB]";
  }

  return new TextDecoder().decode(bytes);
}
